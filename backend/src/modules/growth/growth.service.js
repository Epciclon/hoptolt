const { Op } = require('sequelize');
const { Rabbit, Assignment, Cage, FarmMember, Galpon, WorkerCage, Notification, AuditLog, Growth } = require('../../domain/models');
const AppError = require('../../errors/AppError');

const ongoingChecks = new Map();

class GrowthService {
    calculateEstimatedWeight(purpose, ageMonths) {
        if (purpose === 'Engorde') {
            const table = {
                0: 0.05, 1: 0.6, 2: 1.7, 3: 2.6, 4: 3.5, 5: 3.9, 6: 4.1, 7: 4.2
            };
            return ageMonths >= 8 ? 4.2 : (table[ageMonths] || 4.2);
        } else if (purpose === 'Reproducción') {
            const table = {
                0: 0.05, 1: 0.6, 2: 1.7, 3: 2.4, 4: 3.2, 5: 3.7, 6: 4.0, 7: 4.1
            };
            return ageMonths >= 8 ? 4.2 : (table[ageMonths] || 4.2);
        }
        return 0;
    }

    async processDailyGrowth(profileId) {
        if (ongoingChecks.has(`${profileId}_growth`)) {
            return ongoingChecks.get(`${profileId}_growth`);
        }

        const promise = (async () => {
            try {
                const [memberships, ownedGalpones] = await Promise.all([
                    FarmMember.findAll({ where: { profileId, status: 'active' } }),
                    Galpon.findAll({ where: { profileId } })
                ]);

                const galponIds = new Set();
                ownedGalpones.forEach(g => galponIds.add(g.id));
                memberships.forEach(m => galponIds.add(m.galponId));

                if (galponIds.size === 0) return;

                const rabbits = await Rabbit.findAll({
                    where: { galponId: Array.from(galponIds) }
                });

                if (rabbits.length === 0) return;

                const today = new Date();
                const updatesResult = { messages: [], rabbitsToUpdate: [], catchUpGrowths: [] };

                for (const rabbit of rabbits) {
                    this._processRabbitGrowthSync(rabbit, today, updatesResult);
                }

                await this._applyGrowthUpdates({
                    updatesResult,
                    rabbits,
                    profileId,
                    Growth,
                    Notification,
                    preloadedMemberships: memberships,
                    preloadedOwnedGalpones: ownedGalpones
                });

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
        const [rabbit, history] = await Promise.all([
            Rabbit.findByPk(rabbitId),
            Growth.findAll({
                where: { rabbitId },
                attributes: ['id', 'weight', 'recordDate', 'isManual'],
                order: [['recordDate', 'DESC']]
            })
        ]);
        if (!rabbit) throw new AppError('Conejo no encontrado', 404);

        return history;
    }

    _processRabbitGrowthSync(rabbit, today, updatesResult) {
        const birthDate = new Date(rabbit.birthDate);
        
        // Calcular meses basados en 30 días
        const diffTime = today.getTime() - birthDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        let currentMonths = Math.floor(diffDays / 30);
        if (currentMonths < 0) currentMonths = 0;

        const maxAge = 8;
        const rabbitAge = Number(rabbit.age || 0);

        if (rabbitAge >= currentMonths || rabbitAge >= maxAge) return;

        const startMonth = rabbitAge + 1;
        const endMonth = Math.min(currentMonths, maxAge);
        if (startMonth > endMonth) return;

        let finalWeight = Number.parseFloat(rabbit.weight || '0');
        
        for (let m = startMonth; m <= endMonth; m++) {
            // Fecha exacta cada 30 días
            const exactDate = new Date(birthDate.getTime() + m * 30 * 24 * 60 * 60 * 1000);
            
            const estimatedWeightForMonth = this.calculateEstimatedWeight(rabbit.purpose, m);
            
            updatesResult.catchUpGrowths.push({
                rabbitId: rabbit.id,
                weight: estimatedWeightForMonth,
                oldWeight: finalWeight,
                recordDate: `${exactDate.toLocaleDateString('sv', { timeZone: 'America/Guayaquil' })}T12:00:00Z`
            });
        }

        const newEstimatedWeight = this.calculateEstimatedWeight(rabbit.purpose, endMonth);
        const updates = { rabbitId: rabbit.id, age: endMonth, weight: newEstimatedWeight };
        
        const rabbitLabel = rabbit.name ? `${rabbit.name} - ${rabbit.code}` : rabbit.code;
        let msg = `${rabbitLabel} ha alcanzado los ${endMonth} meses de edad. `;
        if (endMonth === maxAge) {
            msg += `Ha alcanzado la madurez.`;
        }
        
        updatesResult.messages.push({
            rabbitId: rabbit.id,
            galponId: rabbit.galponId,
            text: msg
        });
        updatesResult.rabbitsToUpdate.push(updates);
    }

    async _saveRabbitGrowthUpdates(rabbitsToUpdate, rabbits) {
        if (!rabbitsToUpdate || rabbitsToUpdate.length === 0) return;
        const rabbitMap = new Map(rabbits.map(r => [r.id, r]));
        const { recordSystemChange } = require('../../common/helpers/audit.helper');

        await Promise.all(rabbitsToUpdate.map(async update => {
            const rabbit = rabbitMap.get(update.rabbitId);
            if (!rabbit) return;
            const oldAge = rabbit.age;
            const oldWeight = rabbit.weight;
            rabbit.age = update.age;
            if (update.weight !== undefined) rabbit.weight = update.weight;
            await rabbit.save();
            
            const rabbitLabel = rabbit.name ? `${rabbit.name} - ${rabbit.code}` : rabbit.code;
            const beforeData = { age: oldAge };
            const afterData = { age: update.age };
            if (update.weight !== undefined && update.weight !== null && update.weight !== oldWeight) {
                beforeData.weight = oldWeight;
                afterData.weight = update.weight;
            }

            await recordSystemChange({
                galponId: rabbit.galponId,
                action: 'Cálculo de crecimiento',
                entity: 'growth',
                entityId: rabbit.id,
                itemName: rabbitLabel,
                summary: `HopTolt actualizó la edad a ${update.age} meses` + (update.weight && update.weight !== oldWeight ? ` y peso estimado a ${update.weight} kg` : '') + ` para el conejo ${rabbitLabel}`,
                before: beforeData,
                after: afterData
            });
        }));
    }

    async _getAllowedRabbitIdsForWorker(wm) {
        const { WorkerPermission, WorkerCage, Assignment } = require('../../domain/models');
        const hasPermission = await WorkerPermission.findOne({
            where: {
                farmMemberId: wm.id,
                moduleName: { [Op.in]: ['conejos', 'rabbits'] },
                canRead: true
            }
        });

        if (!hasPermission) return [];

        const workerCages = await WorkerCage.findAll({ where: { farmMemberId: wm.id } });
        const cageIds = workerCages.map(wc => wc.cageId);
        if (cageIds.length === 0) return [];

        const activeAssignments = await Assignment.findAll({
            where: {
                cageId: { [Op.in]: cageIds },
                status: 'asignado'
            }
        });
        return activeAssignments.map(a => Number(a.rabbitId));
    }

    async _filterWorkerGrowthMessages(workerMemberships, messages) {
        const results = await Promise.all(
            workerMemberships.map(wm => this._getAllowedRabbitIdsForWorker(wm))
        );
        const allowedRabbitIds = new Set(results.flat());

        return messages.filter(m => allowedRabbitIds.has(Number(m.rabbitId))).map(m => m.text);
    }

    async _applyGrowthUpdates({
        updatesResult,
        rabbits,
        profileId,
        Growth,
        Notification,
        preloadedMemberships,
        preloadedOwnedGalpones
    }) {
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

        await this._saveRabbitGrowthUpdates(rabbitsToUpdate, rabbits);

        const memberships = preloadedMemberships || await FarmMember.findAll({ where: { profileId, status: 'active' } });
        const ownedGalpones = preloadedOwnedGalpones || await Galpon.findAll({ where: { profileId } });
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
            userMessages = await this._filterWorkerGrowthMessages(workerMemberships, messages);
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

    async rebuildGrowthHistory(rabbitOrId, options = {}) {
        const { Rabbit, Growth } = require('../../domain/models');
        const rabbit = (rabbitOrId && typeof rabbitOrId === 'object' && rabbitOrId.id)
            ? rabbitOrId
            : await Rabbit.findByPk(rabbitOrId);
        if (!rabbit) return;

        // Borramos historial anterior solo cuando no es un conejo recién creado
        if (!options.isNew) {
            await Growth.destroy({ where: { rabbitId: rabbit.id } });
        }

        const birthDate = new Date(rabbit.birthDate);
        const today = new Date();
        const diffTime = today.getTime() - birthDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        let currentMonths = Math.floor(diffDays / 30);
        if (currentMonths < 0) currentMonths = 0;

        const maxAge = 8;
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
        
        // 3. Actualizamos la edad solo si difiere de la actual
        if (rabbit.age !== endMonth && typeof rabbit.save === 'function') {
            rabbit.age = endMonth;
            await rabbit.save();
        }
    }
}

module.exports = new GrowthService();
