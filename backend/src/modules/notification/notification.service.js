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
                const todayStr = new Date().toLocaleDateString('sv', { timeZone: 'America/Guayaquil' });
                const d = new Date(todayStr + 'T00:00:00-05:00');
                d.setDate(d.getDate() + 3);
                const threeDaysFromNowStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                const { Assignment } = require('../../domain/models');
                const conditions = await this._getReproductionConditions(profileId);
                if (conditions.length === 0) return;

                const upcomingReproductions = await Reproduction.findAll({
                    where: {
                        [Op.or]: conditions,
                        estimatedBirthDate: { [Op.between]: [todayStr, threeDaysFromNowStr] }
                    },
                    include: [{
                        model: Rabbit, as: 'female', attributes: ['code', 'name'],
                        include: [{ model: Assignment, as: 'assignments', where: { status: 'asignado' }, required: true }]
                    }]
                });

                if (upcomingReproductions.length === 0) return;

                const notifiedReproductionIds = await this._getNotifiedIds(profileId, 'warning', 'birth');

                for (const r of upcomingReproductions) {
                    const repId = Number(r.id);
                    if (!notifiedReproductionIds.has(repId)) {
                        notifiedReproductionIds.add(repId);
                        const birthDateStr = typeof r.estimatedBirthDate === 'string' ? r.estimatedBirthDate : r.estimatedBirthDate.toISOString().split('T')[0];
                        const rabbitName = r.female?.name ? ` (${r.female.name})` : '';
                        await Notification.create({
                            profileId,
                            type: 'warning',
                            title: 'Alerta de Parto Próximo',
                            message: `La coneja con código ${r.female?.code || 'N/A'}${rabbitName} tiene un parto estimado para el ${birthDateStr}. ¡Por favor prepara la jaula con al menos 3 días de anticipación!`,
                            data: { type: 'birth_warning', reproductionId: repId, estimatedBirthDate: birthDateStr }
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
                const todayStr = new Date().toLocaleDateString('sv', { timeZone: 'America/Guayaquil' });
                const d = new Date(todayStr + 'T00:00:00-05:00');
                d.setDate(d.getDate() - 30);
                const thirtyDaysAgoStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                const { Assignment } = require('../../domain/models');
                const conditions = await this._getReproductionConditions(profileId);
                if (conditions.length === 0) return;

                const weaningReproductions = await Reproduction.findAll({
                    where: {
                        [Op.or]: conditions,
                        status: 'lactancia',
                        estimatedBirthDate: { [Op.lte]: thirtyDaysAgoStr }
                    },
                    include: [{
                        model: Rabbit, as: 'female', attributes: ['code', 'name'],
                        include: [{ model: Assignment, as: 'assignments', where: { status: 'asignado' }, required: true }]
                    }]
                });

                if (weaningReproductions.length === 0) return;

                const notifiedReproductionIds = await this._getNotifiedIds(profileId, 'info', 'weaning');

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
                            data: { type: 'weaning_alert', reproductionId: repId }
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
                const { Assignment } = require('../../domain/models');
                const activeAssignments = await Assignment.findAll({ where: { status: 'asignado' } });
                const assignedCageIds = new Set(activeAssignments.map(a => Number(a.cageId)));
                if (assignedCageIds.size === 0) return;

                const cagesToCheck = await this._getCagesToCheckForCleaning(profileId, assignedCageIds);
                if (cagesToCheck.length === 0) return;

                const notifiedCageIds = await this._getNotifiedIds(profileId, 'warning', 'cleaning');
                
                await this._processCleaningNotifications(profileId, cagesToCheck, notifiedCageIds);
            } catch (error) {
                console.error('Error checking/creating cleaning notifications:', error);
            } finally {
                ongoingChecks.delete(`${profileId}_cleaning`);
            }
        })();

        ongoingChecks.set(`${profileId}_cleaning`, promise);
        return promise;
    }

    async _processCleaningNotifications(profileId, cagesToCheck, notifiedCageIds) {
        const { Cleaning, Notification } = require('../../domain/models');
        const today = new Date();

        for (const cage of cagesToCheck) {
            if (notifiedCageIds.has(Number(cage.id))) continue;

            const lastCleaning = await Cleaning.findOne({
                where: { cageId: cage.id },
                order: [['cleaningDate', 'DESC']]
            });

            if (!lastCleaning?.cleaningDate) continue;

            const diffTime = today.getTime() - new Date(lastCleaning.cleaningDate).getTime();
            const daysWithoutCleaning = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (daysWithoutCleaning > 3) {
                notifiedCageIds.add(Number(cage.id));
                await Notification.create({
                    profileId,
                    type: 'warning',
                    title: 'Alerta de Limpieza Requerida',
                    message: `La jaula #${cage.number} lleva ${daysWithoutCleaning} días sin ser limpiada. ¡Por favor realiza la limpieza lo antes posible!`,
                    data: { type: 'cleaning_warning', cageId: cage.id, cageNumber: cage.number, daysWithoutCleaning }
                });
            }
        }
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

    async _getReproductionConditions(profileId) {
        const memberships = await FarmMember.findAll({ where: { profileId, status: 'active' } });
        const ownedGalpones = await Galpon.findAll({ where: { profileId } });
        const { WorkerCage } = require('../../domain/models');

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
        return conditions;
    }

    async _getNotifiedIds(profileId, type, filterType) {
        const warnings = await Notification.findAll({ where: { profileId, type } });
        const notifiedIds = new Set();
        for (const w of warnings) {
            if (w.data) {
                let dataObj = w.data;
                if (typeof dataObj === 'string') {
                    try { dataObj = JSON.parse(dataObj); } catch (e) { console.error("Error parsing notification data", e); continue; }
                }
                this._addNotifiedId(notifiedIds, dataObj, filterType);
            }
        }
        return notifiedIds;
    }

    _addNotifiedId(notifiedIds, dataObj, filterType) {
        if (filterType === 'birth' && dataObj?.reproductionId) {
            notifiedIds.add(Number(dataObj.reproductionId));
        } else if (filterType === 'weaning' && dataObj?.type === 'weaning_alert' && dataObj?.reproductionId) {
            notifiedIds.add(Number(dataObj.reproductionId));
        } else if (filterType === 'cleaning' && dataObj?.type === 'cleaning_warning' && dataObj?.cageId) {
            notifiedIds.add(Number(dataObj.cageId));
        }
    }

    async _getCagesToCheckForCleaning(profileId, assignedCageIds) {
        const memberships = await FarmMember.findAll({ where: { profileId, status: 'active' } });
        const ownedGalpones = await Galpon.findAll({ where: { profileId } });
        const { Cage, WorkerCage } = require('../../domain/models');

        const cagesToCheck = [];

        if (ownedGalpones.length > 0) {
            const ownerCages = await Cage.findAll({
                where: { galponId: { [Op.in]: ownedGalpones.map(g => g.id) }, id: { [Op.in]: Array.from(assignedCageIds) } }
            });
            cagesToCheck.push(...ownerCages);
        }

        for (const m of memberships) {
            if (m.role === 'owner') {
                const ownerCages = await Cage.findAll({
                    where: { galponId: m.galponId, id: { [Op.in]: Array.from(assignedCageIds) } }
                });
                for (const c of ownerCages) {
                    if (!cagesToCheck.some(x => x.id === c.id)) cagesToCheck.push(c);
                }
            } else if (m.role === 'worker') {
                const workerCages = await WorkerCage.findAll({ where: { farmMemberId: m.id } });
                const cageIds = workerCages.map(wc => wc.cageId).filter(id => assignedCageIds.has(Number(id)));
                const assignedCages = await Cage.findAll({
                    where: { id: { [Op.in]: cageIds }, galponId: m.galponId }
                });
                this._addUniqueCages(cagesToCheck, assignedCages);
            }
        }
        return cagesToCheck;
    }

    _addUniqueCages(cagesToCheck, newCages) {
        for (const c of newCages) {
            if (!cagesToCheck.some(x => x.id === c.id)) cagesToCheck.push(c);
        }
    }
}

module.exports = new NotificationService();
