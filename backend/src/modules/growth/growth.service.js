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
                
                const updates = [];

                for (const rabbit of rabbits) {
                    const birthDate = new Date(rabbit.birthDate);
                    
                    let months = (today.getFullYear() - birthDate.getFullYear()) * 12;
                    months -= birthDate.getMonth();
                    months += today.getMonth();
                    
                    if (today.getDate() < birthDate.getDate()) {
                        months--;
                    }
                    if (months < 0) months = 0;

                    const maxAge = rabbit.purpose === 'Engorde' ? 8 : 12;

                    // Only update if age just incremented
                    if (rabbit.age !== months) {
                        await rabbit.update({ age: months });
                        await AuditLog.create({
                            action: 'age_update_auto',
                            entity: 'Rabbit',
                            entityId: rabbit.id,
                            details: { oldAge: rabbit.age, newAge: months, updatedBy: 'system' }
                        });
                        
                        let msg = `${rabbit.code} - ${rabbit.name || 'Sin nombre'} cumplió ${months} meses`;

                        // Only update weight if we haven't passed stabilization
                        if (months <= maxAge) {
                            const estimatedWeight = this.calculateEstimatedWeight(rabbit.purpose, months);
                            
                            // Check if weight actually differs to avoid duplicate useless records
                            if (parseFloat(rabbit.weight) !== estimatedWeight) {
                                const oldWeight = parseFloat(rabbit.weight);
                                
                                await Growth.create({
                                    rabbitId: rabbit.id,
                                    weight: estimatedWeight,
                                    recordDate: new Date()
                                });

                                await rabbit.update({ weight: estimatedWeight });

                                await AuditLog.create({
                                    action: 'weight_update_auto',
                                    entity: 'Rabbit',
                                    entityId: rabbit.id,
                                    details: { oldWeight, newWeight: estimatedWeight, source: 'system_estimation' }
                                });
                            }
                            
                            msg += ` y su peso estimado es ${estimatedWeight.toFixed(2)} kg.`;
                            
                            if (months === maxAge) {
                                msg += ` (Este es el último peso estimado por el sistema. A partir de aquí se estabiliza el peso y quedará en manos del usuario si desea actualizarlo).`;
                            }
                        }

                        updates.push(msg);
                    }
                }

                if (updates.length > 0) {
                    // Check if already notified for today
                    const summaryNotifs = await Notification.findAll({
                        where: { profileId, title: `Resumen de Crecimiento - ${todayStr}` }
                    });
                    
                    if (summaryNotifs.length === 0) {
                        let message = `El sistema ha actualizado automáticamente la edad y peso de ${updates.length} conejos.`;

                        await Notification.create({
                            profileId,
                            type: 'info',
                            title: `Resumen de Crecimiento - ${todayStr}`,
                            message: message,
                            data: {
                                type: 'growth_summary',
                                updatesCount: updates.length,
                                details: updates
                            }
                        });
                    }
                }

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
            order: [['recordDate', 'DESC']]
        });

        return history;
    }
}

module.exports = new GrowthService();
