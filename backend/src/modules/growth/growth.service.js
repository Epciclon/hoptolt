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

                const activeAssignments = await Assignment.findAll({
                    where: { status: 'asignado' },
                    include: [{ model: Rabbit, as: 'rabbit' }, { model: Cage, as: 'cage' }]
                });

                if (activeAssignments.length === 0) return;

                const rabbitsToCheck = new Map();

                // 1. Owner's cages
                if (ownedGalpones.length > 0) {
                    const galponIds = new Set(ownedGalpones.map(g => g.id));
                    for (const a of activeAssignments) {
                        if (a.cage && galponIds.has(a.cage.galponId) && a.rabbit) {
                            rabbitsToCheck.set(a.rabbit.id, a);
                        }
                    }
                }

                // 2. Member's cages
                for (const m of memberships) {
                    if (m.role === 'owner') {
                        for (const a of activeAssignments) {
                            if (a.cage && a.cage.galponId === m.galponId && a.rabbit) {
                                rabbitsToCheck.set(a.rabbit.id, a);
                            }
                        }
                    } else if (m.role === 'worker') {
                        const workerCages = await WorkerCage.findAll({ where: { farmMemberId: m.id } });
                        const cageIds = new Set(workerCages.map(wc => wc.cageId));
                        for (const a of activeAssignments) {
                            if (a.cage && cageIds.has(a.cage.id) && a.rabbit) {
                                rabbitsToCheck.set(a.rabbit.id, a);
                            }
                        }
                    }
                }

                if (rabbitsToCheck.size === 0) return;

                const today = new Date();
                const todayStr = today.toLocaleDateString('sv', { timeZone: 'America/Guayaquil' });
                
                const ageUpdates = [];
                const weightEstimations = [];
                const existingNotifications = await Notification.findAll({
                    where: { profileId, type: 'info' }
                });

                for (const [rabbitId, assignment] of rabbitsToCheck) {
                    const rabbit = assignment.rabbit;
                    const birthDate = new Date(rabbit.birthDate);
                    
                    let months = (today.getFullYear() - birthDate.getFullYear()) * 12;
                    months -= birthDate.getMonth();
                    months += today.getMonth();
                    
                    // Si el día del mes actual es menor al día de nacimiento, aún no cumple el mes
                    if (today.getDate() < birthDate.getDate()) {
                        months--;
                    }
                    if (months < 0) months = 0;

                    // Si la edad cambió
                    if (rabbit.age !== months) {
                        await rabbit.update({ age: months });
                        await AuditLog.create({
                            action: 'age_update_auto',
                            entity: 'Rabbit',
                            entityId: rabbit.id,
                            details: { oldAge: rabbit.age, newAge: months, updatedBy: 'system' }
                        });
                        ageUpdates.push(`${rabbit.code} (${months} meses)`);
                    }

                    // Peso estimado
                    const estimatedWeight = this.calculateEstimatedWeight(rabbit.purpose, rabbit.age);
                    if (parseFloat(rabbit.weight) !== estimatedWeight) {
                        weightEstimations.push({
                            rabbitId: rabbit.id,
                            rabbitCode: rabbit.code,
                            rabbitName: rabbit.name || '',
                            cageNumber: assignment.cage.number,
                            age: rabbit.age,
                            currentWeight: parseFloat(rabbit.weight),
                            estimatedWeight: estimatedWeight,
                            status: 'pending'
                        });
                    }
                }

                // Generar notificación agrupada de edad para hoy si hubo actualizaciones
                if (ageUpdates.length > 0) {
                    // Check if already notified for today
                    const ageNotifs = await Notification.findAll({
                        where: { profileId, title: `Actualización de Edad - ${todayStr}` }
                    });
                    if (ageNotifs.length === 0) {
                        await Notification.create({
                            profileId,
                            type: 'info',
                            title: `Actualización de Edad - ${todayStr}`,
                            message: `El sistema ha actualizado automáticamente la edad de ${ageUpdates.length} conejos: ${ageUpdates.join(', ')}`,
                            data: {
                                type: 'age_update',
                                count: ageUpdates.length,
                                updates: ageUpdates
                            }
                        });
                    }
                }

                // Generar notificación agrupada de pesos si hubo diferencias
                if (weightEstimations.length > 0) {
                    // Check if already notified for today
                    const weightNotifs = await Notification.findAll({
                        where: { 
                            profileId, 
                            title: `Estimación de Peso - ${todayStr}` 
                        }
                    });
                    if (weightNotifs.length === 0) {
                        const message = `El sistema ha calculado un peso estimado diferente para los siguientes conejos: ${weightEstimations.map(w => `${w.rabbitCode} (${w.rabbitName})`).join(', ')}. ¿Deseas actualizarlos?`;
                        await Notification.create({
                            profileId,
                            type: 'info',
                            title: `Estimación de Peso - ${todayStr}`,
                            message: message,
                            data: {
                                type: 'weight_estimations',
                                rabbits: weightEstimations
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

    async respondToWeightEstimation(notificationId, profileId, action, rabbitId) {
        const notification = await Notification.findOne({ where: { id: notificationId, profileId } });
        if (!notification) throw new AppError('Notificación no encontrada', 404);

        let data = typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data;
        
        // Soporte de compatibilidad para notificaciones antiguas 'weight_estimation' (individuales)
        if (data.type === 'weight_estimation') {
            if (action === 'accept') {
                const rabbit = await Rabbit.findByPk(data.rabbitId);
                if (!rabbit) throw new AppError('Conejo no encontrado', 404);

                await Growth.create({
                    rabbitId: rabbit.id,
                    weight: data.estimatedWeight,
                    recordDate: new Date()
                });

                await rabbit.update({ weight: data.estimatedWeight });

                await AuditLog.create({
                    action: 'weight_update_manual',
                    entity: 'Rabbit',
                    entityId: rabbit.id,
                    profileId,
                    details: { oldWeight: data.currentWeight, newWeight: data.estimatedWeight, source: 'weight_estimation' }
                });

                const updatedData = { ...data, status: 'accepted' };
                notification.data = updatedData;
                notification.read = true;
                notification.message = `Se actualizó el peso de: ${data.rabbitCode} (${data.rabbitName || ''}).`;
                notification.changed('data', true);
                await notification.save();

                return { message: 'Peso actualizado correctamente', notification };
            } else if (action === 'reject') {
                const updatedData = { ...data, status: 'rejected' };
                notification.data = updatedData;
                notification.read = true;
                notification.message = `Se rechazó la actualización de peso para: ${data.rabbitCode} (${data.rabbitName || ''}).`;
                notification.changed('data', true);
                await notification.save();
                return { message: 'Estimación rechazada', notification };
            } else if (action === 'revert') {
                const updatedData = { ...data, status: 'pending' };
                const originalMsg = `El conejo ${data.rabbitCode} (${data.rabbitName || ''}) tiene una edad de ${data.age} meses. Su peso estimado es ${data.estimatedWeight.toFixed(2)} kg (Peso actual: ${data.currentWeight} kg). ¿Deseas actualizarlo?`;
                notification.data = updatedData;
                notification.read = false;
                notification.message = originalMsg;
                notification.changed('data', true);
                await notification.save();
                return { message: 'Estimación revertida a pendiente', notification };
            }
        }

        // Nueva lógica para notificaciones agrupadas 'weight_estimations'
        if (data.type !== 'weight_estimations') throw new AppError('Notificación inválida', 400);

        const rabbits = data.rabbits || [];

        if (rabbitId) {
            const rabbitData = rabbits.find(r => r.rabbitId === Number(rabbitId));
            if (!rabbitData) throw new AppError('Conejo no encontrado en la notificación', 404);

            if (action === 'accept') {
                const rabbit = await Rabbit.findByPk(rabbitData.rabbitId);
                if (!rabbit) throw new AppError('Conejo no encontrado en la base de datos', 404);

                await Growth.create({
                    rabbitId: rabbit.id,
                    weight: rabbitData.estimatedWeight,
                    recordDate: new Date()
                });

                await rabbit.update({ weight: rabbitData.estimatedWeight });

                await AuditLog.create({
                    action: 'weight_update_manual',
                    entity: 'Rabbit',
                    entityId: rabbit.id,
                    profileId,
                    details: { oldWeight: rabbitData.currentWeight, newWeight: rabbitData.estimatedWeight, source: 'weight_estimation' }
                });

                rabbitData.status = 'accepted';
            } else if (action === 'reject') {
                rabbitData.status = 'rejected';
            } else if (action === 'revert') {
                rabbitData.status = 'pending';
            }
        } else {
            // Acción para todo el grupo
            for (const r of rabbits) {
                if (action === 'revert') {
                    r.status = 'pending';
                } else if (action === 'accept' && r.status === 'pending') {
                    const rabbit = await Rabbit.findByPk(r.rabbitId);
                    if (rabbit) {
                        await Growth.create({ rabbitId: rabbit.id, weight: r.estimatedWeight, recordDate: new Date() });
                        await rabbit.update({ weight: r.estimatedWeight });
                        await AuditLog.create({
                            action: 'weight_update_manual',
                            entity: 'Rabbit',
                            entityId: rabbit.id,
                            profileId,
                            details: { oldWeight: r.currentWeight, newWeight: r.estimatedWeight, source: 'weight_estimation' }
                        });
                        r.status = 'accepted';
                    }
                } else if (action === 'reject' && r.status === 'pending') {
                    r.status = 'rejected';
                }
            }
        }

        const pendingRabbits = rabbits.filter(r => r.status === 'pending');
        const acceptedRabbits = rabbits.filter(r => r.status === 'accepted');
        const rejectedRabbits = rabbits.filter(r => r.status === 'rejected');

        let newMessage = '';
        if (pendingRabbits.length > 0) {
            newMessage = `El sistema ha calculado un peso estimado diferente para los siguientes conejos: ${pendingRabbits.map(w => `${w.rabbitCode} (${w.rabbitName})`).join(', ')}. ¿Deseas actualizarlos?`;
            
            const processedParts = [];
            if (acceptedRabbits.length > 0) {
                processedParts.push(`actualizado: ${acceptedRabbits.map(r => r.rabbitCode).join(', ')}`);
            }
            if (rejectedRabbits.length > 0) {
                processedParts.push(`rechazado: ${rejectedRabbits.map(r => r.rabbitCode).join(', ')}`);
            }
            if (processedParts.length > 0) {
                newMessage += ` (Ya procesados — ${processedParts.join('; ')}).`;
            }
        } else {
            // Todos procesados
            const acceptedParts = [];
            if (acceptedRabbits.length > 0) {
                acceptedParts.push(`Se actualizó el peso de: ${acceptedRabbits.map(r => `${r.rabbitCode} (${r.rabbitName})`).join(', ')}`);
            }
            const rejectedParts = [];
            if (rejectedRabbits.length > 0) {
                rejectedParts.push(`Se rechazó la actualización para: ${rejectedRabbits.map(r => `${r.rabbitCode} (${r.rabbitName})`).join(', ')}`);
            }
            
            newMessage = [...acceptedParts, ...rejectedParts].join('. ');
            if (!newMessage) newMessage = 'No se realizaron actualizaciones de peso.';
        }

        notification.message = newMessage;
        notification.read = pendingRabbits.length === 0;

        notification.data = { ...data, rabbits };
        notification.changed('data', true);
        await notification.save();

        return { 
            message: 'Estimación procesada correctamente', 
            notification 
        };
    }
}

module.exports = new GrowthService();
