const { Op } = require('sequelize');
const { Rabbit, Assignment, Cage, FarmMember, Galpon, WorkerCage, Notification, AuditLog, Growth } = require('../../domain/models');
const AppError = require('../../errors/AppError');

const ongoingChecks = new Map();

class GrowthService {
    calculateEstimatedWeight(purpose, ageMonths) {
        if (purpose === 'Engorde') {
            const table = {
                0: 0.05, 1: 0.5, 2: 1.0, 3: 1.5, 4: 2.0, 5: 2.2, 6: 2.4, 7: 2.6
            };
            return ageMonths >= 8 ? 2.8 : (table[ageMonths] || 2.8);
        } else if (purpose === 'Reproducción') {
            const table = {
                0: 0.05, 1: 0.4, 2: 0.8, 3: 1.2, 4: 1.6, 5: 2.0, 6: 2.15, 7: 2.3, 8: 2.45, 9: 2.6, 10: 2.75, 11: 2.9
            };
            return ageMonths >= 12 ? 3.0 : (table[ageMonths] || 3.0);
        }
        return 0;
    }

    async processDailyGrowth(profileId) {
        if (ongoingChecks.has(`${profileId}_growth`)) {
            return ongoingChecks.get(`${profileId}_growth`);
        }

        const promise = (async () => {
            try {
                const memberships = await FarmMember.findAll({ where: { profileId, status: 'active' } });
                const ownedGalpones = await Galpon.findAll({ where: { profileId } });

                const galponIds = new Set();
                ownedGalpones.forEach(g => galponIds.add(g.id));
                memberships.forEach(m => galponIds.add(m.galponId));

                if (galponIds.size === 0) return;

                const rabbits = await Rabbit.findAll({
                    where: { galponId: Array.from(galponIds) }
                });

                if (rabbits.length === 0) return;

                const today = new Date();
                const todayStr = today.toLocaleDateString('sv', { timeZone: 'America/Guayaquil' });
                
                const updatesResult = { messages: [], rabbitsToUpdate: [], catchUpGrowths: [] };

                for (const rabbit of rabbits) {
                    this._processRabbitGrowthSync(rabbit, today, updatesResult);
                }

                await this._applyGrowthUpdates(updatesResult, rabbits, profileId, today, todayStr, AuditLog, Growth, Notification);

            } catch (error) {
                console.error('Error processing daily growth:', error);
            } finally {
                ongoingChecks.delete(`${profileId}_growth`);
            }
        })();

        ongoingChecks.set(`${profileId}_growth`, promise);
        return promise;
    }

    async getHistory(rabbitId) {
        const rabbit = await Rabbit.findByPk(rabbitId);
        if (!rabbit) throw new AppError('Conejo no encontrado', 404);

        const history = await Growth.findAll({
            where: { rabbitId },
            attributes: ['id', 'weight', 'recordDate', 'isManual'],
            order: [['recordDate', 'DESC']]
        });

        return history;
    }

    _processRabbitGrowthSync(rabbit, today, updatesResult) {
        const birthDate = new Date(rabbit.birthDate);
        
        // Calcular meses basados en 30 días
        const diffTime = today.getTime() - birthDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        let currentMonths = Math.floor(diffDays / 30);
        if (currentMonths < 0) currentMonths = 0;

        const maxAge = rabbit.purpose === 'Engorde' ? 8 : 12;
        const rabbitAge = Number(rabbit.age || 0);

        if (rabbitAge >= currentMonths || rabbitAge >= maxAge) return;

        const startMonth = rabbitAge + 1;
        const endMonth = Math.min(currentMonths, maxAge);
        if (startMonth > endMonth) return;

        let finalWeight = Number.parseFloat(rabbit.weight || '0');
        
        for (let m = startMonth; m <= endMonth; m++) {
            // Fecha exacta cada 30 días
            const exactDate = new Date(birthDate.getTime() + m * 30 * 24 * 60 * 60 * 1000);
            
            // "una ves cumpla se queda con el peso que dejamos y pasa a historico"
            // Solo para el último mes cumplido, pasamos el peso actual que el usuario dejó al historial.
            // Para meses intermedios saltados, usamos el estimado.
            const weightToLog = (m === endMonth) ? finalWeight : this.calculateEstimatedWeight(rabbit.purpose, m);
            
            updatesResult.catchUpGrowths.push({
                rabbitId: rabbit.id,
                weight: weightToLog,
                oldWeight: finalWeight,
                recordDate: `${exactDate.toLocaleDateString('sv', { timeZone: 'America/Guayaquil' })}T12:00:00Z`
            });
        }

        // Actualizamos solo la edad del conejo, manteniendo su peso actual (el que dejó el usuario)
        const updates = { rabbitId: rabbit.id, age: endMonth };
        
        let msg = `${rabbit.code} - ${rabbit.name || 'Sin nombre'} ha alcanzado los ${endMonth} meses de edad. `;
        if (endMonth === maxAge) {
            msg += ` (Ha alcanzado la madurez).`;
        }
        
        updatesResult.messages.push({
            rabbitId: rabbit.id,
            galponId: rabbit.galponId,
            text: msg
        });
        updatesResult.rabbitsToUpdate.push(updates);
    }

    async _applyGrowthUpdates(updatesResult, rabbits, profileId, today, todayStr, AuditLog, Growth, Notification) {
        const { messages, rabbitsToUpdate, catchUpGrowths } = updatesResult;

        if (catchUpGrowths && catchUpGrowths.length > 0) {
            // Insertar todos los historiales atrasados con sus fechas correctas
            const growthRecords = catchUpGrowths.map(g => ({
                rabbitId: g.rabbitId,
                weight: g.weight,
                recordDate: g.recordDate,
                isManual: false
            }));
            await Growth.bulkCreate(growthRecords);
        }

        if (rabbitsToUpdate.length > 0) {
            const rabbitMap = new Map(rabbits.map(r => [r.id, r]));

            await Promise.all(rabbitsToUpdate.map(async update => {
                const rabbit = rabbitMap.get(update.rabbitId);
                rabbit.age = update.age;
                if (update.weight !== undefined) rabbit.weight = update.weight;
                await rabbit.save();
                
                await AuditLog.create({
                    profileId: profileId,
                    action: 'Cálculo Automático',
                    details: {
                        message: `Edad actualizada a ${update.age} meses` + (update.weight ? ` y peso a ${update.weight} kg` : '') + ` para el conejo ${rabbit.code}.`
                    },
                    entity: 'Rabbit',
                    entityId: rabbit.id
                });
            }));
        }

        const memberships = await FarmMember.findAll({ where: { profileId, status: 'active' } });
        const ownedGalpones = await Galpon.findAll({ where: { profileId } });
        const isOwner = ownedGalpones.length > 0 || memberships.some(m => m.role === 'owner');

        let userMessages = [];

        if (isOwner) {
            const ownedGalponIds = new Set([
                ...ownedGalpones.map(g => g.id),
                ...memberships.filter(m => m.role === 'owner').map(m => m.galponId)
            ]);
            userMessages = messages.filter(m => ownedGalponIds.has(m.galponId)).map(m => m.text);
        } else {
            // Usuario es trabajador: solo recibe notificaciones si tiene permisos en el módulo y jaulas asignadas
            const workerMemberships = memberships.filter(m => m.role === 'worker');
            let allowedRabbitIds = new Set();

            for (const wm of workerMemberships) {
                const { WorkerPermission, WorkerCage, Assignment } = require('../../domain/models');
                const hasPermission = await WorkerPermission.findOne({
                    where: {
                        farmMemberId: wm.id,
                        moduleName: { [Op.in]: ['conejos', 'rabbits'] },
                        canRead: true
                    }
                });

                if (hasPermission) {
                    const workerCages = await WorkerCage.findAll({ where: { farmMemberId: wm.id } });
                    const cageIds = workerCages.map(wc => wc.cageId);
                    if (cageIds.length > 0) {
                        const activeAssignments = await Assignment.findAll({
                            where: {
                                cageId: { [Op.in]: cageIds },
                                status: 'asignado'
                            }
                        });
                        activeAssignments.forEach(a => allowedRabbitIds.add(Number(a.rabbitId)));
                    }
                }
            }

            userMessages = messages.filter(m => allowedRabbitIds.has(Number(m.rabbitId))).map(m => m.text);
        }

        if (userMessages.length > 0) {
            await Notification.create({
                profileId,
                type: 'info',
                title: 'Resumen de Crecimiento',
                message: userMessages.join('\n'),
                data: { type: 'growth_summary' }
            });
        } else {
            // Limpiar notificaciones huérfanas si el usuario no tiene permisos o jaulas
            await Notification.destroy({
                where: {
                    profileId,
                    type: 'info',
                    title: 'Resumen de Crecimiento'
                }
            });
        }
    }

    async rebuildGrowthHistory(rabbitId) {
        const { Rabbit, Growth } = require('../../domain/models');
        const rabbit = await Rabbit.findByPk(rabbitId);
        if (!rabbit) return;

        // Borramos todo historial anterior (basura) para armar de 0
        await Growth.destroy({ where: { rabbitId: rabbit.id } });

        const birthDate = new Date(rabbit.birthDate);
        const today = new Date();
        const diffTime = today.getTime() - birthDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        let currentMonths = Math.floor(diffDays / 30);
        if (currentMonths < 0) currentMonths = 0;

        const maxAge = rabbit.purpose === 'Engorde' ? 8 : 12;
        const endMonth = Math.min(currentMonths, maxAge);

        const growthsToCreate = [];
        
        // 1. Armar todo el historial estimado antiguo (mes a mes)
        for (let m = 1; m <= endMonth; m++) {
            // Fecha exacta cada 30 días
            const exactDate = new Date(birthDate.getTime() + m * 30 * 24 * 60 * 60 * 1000);
            
            // Para el último mes que cumplió, usamos el peso que tiene actualmente
            const weightToLog = (m === endMonth) ? rabbit.weight : this.calculateEstimatedWeight(rabbit.purpose, m);

            growthsToCreate.push({
                rabbitId: rabbit.id,
                weight: weightToLog,
                recordDate: `${exactDate.toLocaleDateString('sv', { timeZone: 'America/Guayaquil' })}T12:00:00Z`,
                isManual: false
            });
        }

        if (growthsToCreate.length > 0) {
            await Growth.bulkCreate(growthsToCreate);
        }
        
        // 3. Actualizamos la edad (pero mantenemos el peso)
        rabbit.age = endMonth;
        await rabbit.save();
    }
}

module.exports = new GrowthService();
