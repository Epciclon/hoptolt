const notificationRepository = require('./notification.repository');
const { toNotificationDTO } = require('../../common/dtos/notification.dto');
const { Notification, FarmMember, Galpon, Reproduction, Rabbit } = require('../../domain/models');
const growthService = require('../growth/growth.service');
const { Op } = require('sequelize');

const ongoingChecks = new Map();

class NotificationService {
    async checkAndCreateBirthNotifications(profileId) {
        if (ongoingChecks.has(profileId)) {
            return ongoingChecks.get(profileId);
        }

        const promise = (async () => {
            try {
                const memberships = await FarmMember.findAll({ where: { profileId, status: 'active' } });
                const ownedGalpones = await Galpon.findAll({ where: { profileId } });

                const todayStr = new Date().toLocaleDateString('sv', { timeZone: 'America/Guayaquil' });
                const d = new Date(todayStr + 'T00:00:00-05:00');
                d.setDate(d.getDate() + 3);
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dayStr = String(d.getDate()).padStart(2, '0');
                const threeDaysFromNowStr = `${y}-${m}-${dayStr}`;

                const { WorkerCage, Assignment } = require('../../domain/models');

                const conditions = [];

                // 1. Galpones donde es propietario directo
                if (ownedGalpones.length > 0) {
                    conditions.push({
                        galponId: { [Op.in]: ownedGalpones.map(g => g.id) }
                    });
                }

                // 2. Galpones donde participa como miembro
                for (const m of memberships) {
                    if (m.role === 'owner') {
                        conditions.push({ galponId: m.galponId });
                    } else if (m.role === 'worker') {
                        // Si es trabajador, buscar sus jaulas asignadas
                        const workerCages = await WorkerCage.findAll({
                            where: { farmMemberId: m.id }
                        });
                        const cageIds = workerCages.map(wc => wc.cageId);

                        conditions.push({
                            galponId: m.galponId,
                            // Filtrar por la jaula de la hembra
                            '$female.assignments.cageId$': { [Op.in]: cageIds }
                        });
                    }
                }

                if (conditions.length === 0) return;

                const upcomingReproductions = await Reproduction.findAll({
                    where: {
                        [Op.or]: conditions,
                        estimatedBirthDate: { [Op.between]: [todayStr, threeDaysFromNowStr] }
                    },
                    include: [
                        {
                            model: Rabbit,
                            as: 'female',
                            attributes: ['code', 'name'],
                            include: [
                                {
                                    model: Assignment,
                                    as: 'assignments',
                                    where: { status: 'asignado' },
                                    required: true
                                }
                            ]
                        }
                    ]
                });

                if (upcomingReproductions.length === 0) return;

                const warnings = await Notification.findAll({
                    where: { profileId, type: 'warning' }
                });

                // Cargar los IDs de reproducción que ya fueron notificados en un Set para búsquedas O(1) rápidas y seguras
                const notifiedReproductionIds = new Set();
                for (const w of warnings) {
                    if (w.data) {
                        let dataObj = w.data;
                        if (typeof dataObj === 'string') {
                            try {
                                dataObj = JSON.parse(dataObj);
                            } catch (e) {
                                continue;
                            }
                        }
                        if (dataObj && dataObj.reproductionId) {
                            notifiedReproductionIds.add(Number(dataObj.reproductionId));
                        }
                    }
                }

                for (const r of upcomingReproductions) {
                    const repId = Number(r.id);
                    if (!notifiedReproductionIds.has(repId)) {
                        // Lo agregamos inmediatamente al Set para evitar duplicaciones en el mismo bucle
                        notifiedReproductionIds.add(repId);

                        const birthDateStr = typeof r.estimatedBirthDate === 'string'
                            ? r.estimatedBirthDate
                            : r.estimatedBirthDate.toISOString().split('T')[0];
                        const rabbitName = r.female?.name ? ` (${r.female.name})` : '';
                        await Notification.create({
                            profileId,
                            type: 'warning',
                            title: 'Alerta de Parto Próximo',
                            message: `La coneja con código ${r.female?.code || 'N/A'}${rabbitName} tiene un parto estimado para el ${birthDateStr}. ¡Por favor prepara la jaula con al menos 3 días de anticipación!`,
                            data: {
                                type: 'birth_warning',
                                reproductionId: repId,
                                estimatedBirthDate: birthDateStr
                            }
                        });
                    }
                }
            } catch (error) {
                console.error('Error checking/creating birth notifications:', error);
            } finally {
                ongoingChecks.delete(profileId);
            }
        })();

        ongoingChecks.set(profileId, promise);
        return promise;
    }

    async checkAndCreateWeaningNotifications(profileId) {
        if (ongoingChecks.has(`${profileId}_weaning`)) {
            return ongoingChecks.get(`${profileId}_weaning`);
        }

        const promise = (async () => {
            try {
                const memberships = await FarmMember.findAll({ where: { profileId, status: 'active' } });
                const ownedGalpones = await Galpon.findAll({ where: { profileId } });

                const todayStr = new Date().toLocaleDateString('sv', { timeZone: 'America/Guayaquil' });
                const d = new Date(todayStr + 'T00:00:00-05:00');
                d.setDate(d.getDate() - 30);
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dayStr = String(d.getDate()).padStart(2, '0');
                const thirtyDaysAgoStr = `${y}-${m}-${dayStr}`;

                const { WorkerCage, Assignment } = require('../../domain/models');
                const conditions = [];

                if (ownedGalpones.length > 0) {
                    conditions.push({ galponId: { [Op.in]: ownedGalpones.map(g => g.id) } });
                }

                for (const m of memberships) {
                    if (m.role === 'owner') {
                        conditions.push({ galponId: m.galponId });
                    } else if (m.role === 'worker') {
                        const workerCages = await WorkerCage.findAll({ where: { farmMemberId: m.id } });
                        const cageIds = workerCages.map(wc => wc.cageId);
                        conditions.push({
                            galponId: m.galponId,
                            '$female.assignments.cageId$': { [Op.in]: cageIds }
                        });
                    }
                }

                if (conditions.length === 0) return;

                const weaningReproductions = await Reproduction.findAll({
                    where: {
                        [Op.or]: conditions,
                        status: 'lactancia',
                        estimatedBirthDate: { [Op.lte]: thirtyDaysAgoStr }
                    },
                    include: [
                        {
                            model: Rabbit,
                            as: 'female',
                            attributes: ['code', 'name'],
                            include: [
                                {
                                    model: Assignment,
                                    as: 'assignments',
                                    where: { status: 'asignado' },
                                    required: true
                                }
                            ]
                        }
                    ]
                });

                if (weaningReproductions.length === 0) return;

                const infoNotifications = await Notification.findAll({
                    where: { profileId, type: 'info' }
                });

                const notifiedReproductionIds = new Set();
                for (const w of infoNotifications) {
                    if (w.data) {
                        let dataObj = w.data;
                        if (typeof dataObj === 'string') {
                            try { dataObj = JSON.parse(dataObj); } catch (e) { continue; }
                        }
                        if (dataObj && dataObj.type === 'weaning_alert' && dataObj.reproductionId) {
                            notifiedReproductionIds.add(Number(dataObj.reproductionId));
                        }
                    }
                }

                for (const r of weaningReproductions) {
                    const repId = Number(r.id);
                    if (!notifiedReproductionIds.has(repId)) {
                        notifiedReproductionIds.add(repId);

                        const rabbitName = r.female?.name ? ` (${r.female.name})` : '';
                        await Notification.create({
                            profileId,
                            type: 'info',
                            title: 'Destete Pendiente',
                            message: `La coneja con código ${r.female?.code || 'N/A'}${rabbitName} ya cumplió el mes de lactancia. Por favor, finalice el proceso y registre las crías retenidas.`,
                            data: {
                                type: 'weaning_alert',
                                reproductionId: repId
                            }
                        });
                    }
                }
            } catch (error) {
                console.error('Error checking/creating weaning notifications:', error);
            } finally {
                ongoingChecks.delete(`${profileId}_weaning`);
            }
        })();

        ongoingChecks.set(`${profileId}_weaning`, promise);
        return promise;
    }

    async checkAndCreateCleaningNotifications(profileId) {
        if (ongoingChecks.has(`${profileId}_cleaning`)) {
            return ongoingChecks.get(`${profileId}_cleaning`);
        }

        const promise = (async () => {
            try {
                const memberships = await FarmMember.findAll({ where: { profileId, status: 'active' } });
                const ownedGalpones = await Galpon.findAll({ where: { profileId } });

                const { Cage, Cleaning, WorkerCage, Assignment } = require('../../domain/models');

                // Obtener los IDs de jaulas con asignación activa
                const activeAssignments = await Assignment.findAll({
                    where: { status: 'asignado' }
                });
                const assignedCageIds = new Set(activeAssignments.map(a => Number(a.cageId)));

                if (assignedCageIds.size === 0) return;

                const cagesToCheck = [];

                // 1. Propietario de galpones
                if (ownedGalpones.length > 0) {
                    const ownerCages = await Cage.findAll({
                        where: {
                            galponId: { [Op.in]: ownedGalpones.map(g => g.id) },
                            id: { [Op.in]: Array.from(assignedCageIds) }
                        }
                    });
                    cagesToCheck.push(...ownerCages);
                }

                // 2. Miembro de galpones
                for (const m of memberships) {
                    if (m.role === 'owner') {
                        const ownerCages = await Cage.findAll({
                            where: {
                                galponId: m.galponId,
                                id: { [Op.in]: Array.from(assignedCageIds) }
                            }
                        });
                        for (const c of ownerCages) {
                            if (!cagesToCheck.some(x => x.id === c.id)) {
                                cagesToCheck.push(c);
                            }
                        }
                    } else if (m.role === 'worker') {
                        const workerCages = await WorkerCage.findAll({
                            where: { farmMemberId: m.id }
                        });
                        const cageIds = workerCages.map(wc => wc.cageId).filter(id => assignedCageIds.has(Number(id)));
                        const assignedCages = await Cage.findAll({
                            where: { id: { [Op.in]: cageIds }, galponId: m.galponId }
                        });
                        for (const c of assignedCages) {
                            if (!cagesToCheck.some(x => x.id === c.id)) {
                                cagesToCheck.push(c);
                            }
                        }
                    }
                }

                if (cagesToCheck.length === 0) return;

                const warnings = await Notification.findAll({
                    where: { profileId, type: 'warning' }
                });

                // Cargar los IDs de jaula que ya tienen advertencia de limpieza en un Set
                const notifiedCageIds = new Set();
                for (const w of warnings) {
                    if (w.data) {
                        let dataObj = w.data;
                        if (typeof dataObj === 'string') {
                            try { dataObj = JSON.parse(dataObj); } catch (e) { continue; }
                        }
                        if (dataObj && dataObj.type === 'cleaning_warning' && dataObj.cageId) {
                            notifiedCageIds.add(Number(dataObj.cageId));
                        }
                    }
                }

                const today = new Date();

                for (const cage of cagesToCheck) {
                    if (notifiedCageIds.has(Number(cage.id))) {
                        continue;
                    }

                    const lastCleaning = await Cleaning.findOne({
                        where: { cageId: cage.id },
                        order: [['cleaningDate', 'DESC']]
                    });

                    // Si no tiene registros previos de limpieza, no se envía advertencia
                    if (!lastCleaning) {
                        continue;
                    }

                    const lastDateToCheck = lastCleaning.cleaningDate;
                    if (!lastDateToCheck) continue;

                    const diffTime = today.getTime() - new Date(lastDateToCheck).getTime();
                    const daysWithoutCleaning = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                    if (daysWithoutCleaning > 3) {
                        notifiedCageIds.add(Number(cage.id));
                        await Notification.create({
                            profileId,
                            type: 'warning',
                            title: 'Alerta de Limpieza Requerida',
                            message: `La jaula #${cage.number} lleva ${daysWithoutCleaning} días sin ser limpiada. ¡Por favor realiza la limpieza lo antes posible!`,
                            data: {
                                type: 'cleaning_warning',
                                cageId: cage.id,
                                cageNumber: cage.number,
                                daysWithoutCleaning
                            }
                        });
                    }
                }
            } catch (error) {
                console.error('Error checking/creating cleaning notifications:', error);
            } finally {
                ongoingChecks.delete(`${profileId}_cleaning`);
            }
        })();

        ongoingChecks.set(`${profileId}_cleaning`, promise);
        return promise;
    }

    async createNotification(profileId, data) {
        const notification = await notificationRepository.create({
            profileId,
            type: data.type,
            title: data.title,
            message: data.message,
            data: data.data
        });
        return toNotificationDTO(notification);
    }

    async getNotificationsByProfile(profileId, options = {}) {
        await this.checkAndCreateBirthNotifications(profileId);
        await this.checkAndCreateCleaningNotifications(profileId);
        await this.checkAndCreateWeaningNotifications(profileId);
        await growthService.processDailyGrowth(profileId);
        const notifications = await notificationRepository.findByProfileId(profileId, options);
        return notifications.map(toNotificationDTO);
    }

    async getUnreadCount(profileId) {
        await this.checkAndCreateBirthNotifications(profileId);
        await this.checkAndCreateCleaningNotifications(profileId);
        await this.checkAndCreateWeaningNotifications(profileId);
        await growthService.processDailyGrowth(profileId);
        return await notificationRepository.countUnread(profileId);
    }

    async markAsRead(id) {
        const notification = await notificationRepository.markAsRead(id);
        if (!notification) return null;
        return toNotificationDTO(notification);
    }

    async markAllAsRead(profileId) {
        await notificationRepository.markAllAsRead(profileId);
        return { success: true };
    }

    async deleteNotification(id) {
        return await notificationRepository.delete(id);
    }
}

module.exports = new NotificationService();
