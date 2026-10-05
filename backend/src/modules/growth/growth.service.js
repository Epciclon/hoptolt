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
            attributes: ['id', 'weight', 'recordDate'],
            order: [['recordDate', 'DESC']]
        });

        return history;
    }

    _processRabbitGrowthSync(rabbit, today, updatesResult) {
        const birthDate = new Date(rabbit.birthDate);
        let currentMonths = (today.getFullYear() - birthDate.getFullYear()) * 12;
        currentMonths -= birthDate.getMonth();
        currentMonths += today.getMonth();
        if (today.getDate() < birthDate.getDate()) currentMonths--;
        if (currentMonths < 0) currentMonths = 0;

        const maxAge = rabbit.purpose === 'Engorde' ? 8 : 12;
        
        // Si la edad registrada ya es mayor o igual a los meses actuales (o maxAge), no hacemos nada
        if (rabbit.age >= currentMonths || rabbit.age >= maxAge) return;

        const startMonth = rabbit.age + 1;
        const endMonth = Math.min(currentMonths, maxAge);
        
        if (startMonth > endMonth) return;

        let finalWeight = Number.parseFloat(rabbit.weight);
        
        for (let m = startMonth; m <= endMonth; m++) {
            // Calculate the exact date this rabbit turned 'm' months old
            const exactDate = new Date(birthDate);
            exactDate.setMonth(exactDate.getMonth() + m);
            
            const estimatedWeight = this.calculateEstimatedWeight(rabbit.purpose, m);
            
            updatesResult.catchUpGrowths.push({
                rabbitId: rabbit.id,
                weight: estimatedWeight,
                oldWeight: finalWeight, // El peso anterior es el peso con el que empezó este ciclo
                recordDate: exactDate.toLocaleDateString('sv', { timeZone: 'America/Guayaquil' })
            });
            
            finalWeight = estimatedWeight;
        }

        const updates = { rabbitId: rabbit.id, age: endMonth };
        if (finalWeight !== Number.parseFloat(rabbit.weight)) {
            updates.weight = finalWeight;
            updates.oldWeight = Number.parseFloat(rabbit.weight);
        }

        let msg = `${rabbit.code} - ${rabbit.name || 'Sin nombre'} ha alcanzado los ${endMonth} meses de edad. `;
        if (updates.weight !== undefined) {
             msg += `Su peso estimado actual es ${finalWeight.toFixed(2)} kg.`;
        }
        
        if (endMonth === maxAge) {
            msg += ` (Último peso estimado por el sistema, ha alcanzado la madurez).`;
        }
        
        updatesResult.messages.push(msg);
        updatesResult.rabbitsToUpdate.push(updates);
    }

    async _applyGrowthUpdates(updatesResult, rabbits, profileId, today, todayStr, AuditLog, Growth, Notification) {
        const { messages, rabbitsToUpdate, catchUpGrowths } = updatesResult;

        if (catchUpGrowths && catchUpGrowths.length > 0) {
            // Insertar todos los historiales atrasados con sus fechas correctas
            const growthRecords = catchUpGrowths.map(g => ({
                rabbitId: g.rabbitId,
                weight: g.weight,
                oldWeight: g.oldWeight,
                recordDate: g.recordDate,
                recordedBy: profileId
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
                    details: `Edad actualizada a ${update.age} meses` + (update.weight ? ` y peso a ${update.weight} kg` : '') + ` para el conejo ${rabbit.code}.`,
                    module: 'Rabbits'
                });
            }));
        }

        if (messages.length > 0) {
            await Notification.create({
                profileId,
                type: 'info',
                title: 'Resumen de Crecimiento',
                message: messages.join('\n'),
                data: { type: 'growth_summary' }
            });
        }
    }
}

module.exports = new GrowthService();
