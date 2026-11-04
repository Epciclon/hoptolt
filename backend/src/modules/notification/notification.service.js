const notificationRepository = require('./notification.repository');
const { toNotificationDTO } = require('../../common/dtos/notification.dto');
const { Notification, FarmMember, Galpon, Reproduction, Rabbit } = require('../../domain/models');
const { getPaginationParams, createPaginatedResponse } = require('../../common/helpers/pagination.helper');
const growthService = require('../growth/growth.service');
const { Op } = require('sequelize');
const AppError = require('../../errors/AppError');

const ongoingChecks = new Map();
const lastChecksTimestamp = new Map();

class NotificationService {
    async checkAndCreateBirthNotifications(profileId) {
        if (ongoingChecks.has(profileId)) return ongoingChecks.get(profileId);
        const promise = this._runBirthCheck(profileId).finally(() => ongoingChecks.delete(profileId));
        ongoingChecks.set(profileId, promise);
        return promise;
    }

    async _runBirthCheck(profileId) {
        try {
            const todayStr = new Date().toLocaleDateString('sv', { timeZone: 'America/Guayaquil' });
            const d = new Date(todayStr + 'T00:00:00-05:00');
            d.setDate(d.getDate() + 3);
            const threeDaysFromNowStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            const { Assignment, Notification } = require('../../domain/models');
            const [{ notifiedIds, notificationMap }, conditions] = await Promise.all([
                this._getNotifiedIds(profileId, 'warning', 'birth'),
                this._getReproductionConditions(profileId)
            ]);

            if (conditions.length === 0) {
                if (notificationMap.size > 0) {
                    await Notification.destroy({ where: { id: { [Op.in]: Array.from(notificationMap.values()) } } });
                }
                return;
            }

            const upcomingReproductions = await Reproduction.findAll({
                where: {
                    [Op.or]: conditions,
                    estimatedBirthDate: { [Op.between]: [todayStr, threeDaysFromNowStr] },
                    status: 'gestacion'
                },
                include: [{
                    model: Rabbit, as: 'female', attributes: ['code', 'name'],
                    include: [{ model: Assignment, as: 'assignments', where: { status: 'asignado' }, required: true }]
                }]
            });

            await this._processUpcomingBirths(upcomingReproductions, profileId, notifiedIds);
            await this._cleanupStaleNotifications(notifiedIds, notificationMap, 'gestacion', upcomingReproductions);
        } catch (error) {
            console.error('Error checking/creating birth notifications:', error);
        }
    }

    async checkAndCreateWeaningNotifications(profileId) {
        if (ongoingChecks.has(`${profileId}_weaning`)) return ongoingChecks.get(`${profileId}_weaning`);
        const promise = this._runWeaningCheck(profileId).finally(() => ongoingChecks.delete(`${profileId}_weaning`));
        ongoingChecks.set(`${profileId}_weaning`, promise);
        return promise;
    }

    async _runWeaningCheck(profileId) {
        try {
            const todayStr = new Date().toLocaleDateString('sv', { timeZone: 'America/Guayaquil' });
            const d = new Date(todayStr + 'T00:00:00-05:00');
            d.setDate(d.getDate() - 30);
            const thirtyDaysAgoStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            const { Assignment, Notification } = require('../../domain/models');
            const [{ notificationMap }, conditions] = await Promise.all([
                this._getNotifiedIds(profileId, 'warning', 'weaning'),
                this._getReproductionConditions(profileId)
            ]);

            if (conditions.length === 0) {
                if (notificationMap.size > 0) {
                    await Notification.destroy({ where: { id: { [Op.in]: Array.from(notificationMap.values()) } } });
                }
                return;
            }

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

            await this._processWeaningAlerts(weaningReproductions, profileId);
        } catch (error) {
            console.error('Error checking/creating weaning notifications:', error);
        }
    }

    async checkAndCreateCleaningNotifications(profileId) {
        if (ongoingChecks.has(`${profileId}_cleaning`)) return ongoingChecks.get(`${profileId}_cleaning`);
        const promise = this._runCleaningCheck(profileId).finally(() => ongoingChecks.delete(`${profileId}_cleaning`));
        ongoingChecks.set(`${profileId}_cleaning`, promise);
        return promise;
    }

    async _runCleaningCheck(profileId) {
        try {
            const { Assignment } = require('../../domain/models');
            const activeAssignments = await Assignment.findAll({ where: { status: 'asignado' } });
            const assignedCageIds = new Set(activeAssignments.map(a => Number(a.cageId)));

            let cagesToCheck = [];
            if (assignedCageIds.size > 0) {
                cagesToCheck = await this._getCagesToCheckForCleaning(profileId, assignedCageIds);
            }

            await this._processCleaningNotifications(profileId, cagesToCheck);
        } catch (error) {
            console.error('Error checking/creating cleaning notifications:', error);
        }
    }

    async checkAndCreateMaturityNotifications(profileId) {
        if (ongoingChecks.has(`${profileId}_maturity`)) return ongoingChecks.get(`${profileId}_maturity`);
        const promise = this._runMaturityCheck(profileId).finally(() => ongoingChecks.delete(`${profileId}_maturity`));
        ongoingChecks.set(`${profileId}_maturity`, promise);
        return promise;
    }

    async _checkSingleMaturityAccess(a, memberships, ownedGalpones) {
        const { WorkerCage, WorkerPermission } = require('../../domain/models');
        const { Op } = require('sequelize');
        const cageGalponId = a.cage.galponId;
        const isOwner = ownedGalpones.some(g => g.id === cageGalponId) ||
            memberships.some(m => m.galponId === cageGalponId && m.role === 'owner');

        if (isOwner) return a;

        const workerMembership = memberships.find(m => m.galponId === cageGalponId && m.role === 'worker');
        if (!workerMembership) return null;

        const [hasPermission, isCageAssigned] = await Promise.all([
            WorkerPermission.findOne({
                where: {
                    farmMemberId: workerMembership.id,
                    moduleName: { [Op.in]: ['reproduccionyparto', 'reproduction', 'rabbits', 'conejos', 'assignments', 'asignaciones'] },
                    canRead: true
                }
            }),
            WorkerCage.findOne({
                where: { farmMemberId: workerMembership.id, cageId: a.cage.id }
            })
        ]);

        return (hasPermission && isCageAssigned) ? a : null;
    }

    async _filterMaturityAssignmentsByAccess(matureAssignments, memberships, ownedGalpones) {
        const results = await Promise.all(
            matureAssignments.map(a => this._checkSingleMaturityAccess(a, memberships, ownedGalpones))
        );
        return results.filter(Boolean);
    }

    async _deleteStaleMaturityNotifications(relevantAssignments, notifiedIds, notificationMap) {
        if (notifiedIds.size === 0) return;
        const { Notification } = require('../../domain/models');
        const { Op } = require('sequelize');

        const currentRelevantRabbitIds = new Set(relevantAssignments.map(a => Number(a.rabbit.id)));
        const notificationIdsToDelete = [];

        for (const notifiedId of notifiedIds) {
            if (!currentRelevantRabbitIds.has(notifiedId)) {
                const notifId = notificationMap.get(notifiedId);
                if (notifId) notificationIdsToDelete.push(notifId);
            }
        }

        if (notificationIdsToDelete.length > 0) {
            await Notification.destroy({ where: { id: { [Op.in]: notificationIdsToDelete } } });
        }
    }

    async _syncMaturityNotifications(profileId, relevantAssignments, notifiedIds, notificationMap) {
        const { Notification } = require('../../domain/models');
        const notificationsToCreate = [];

        for (const a of relevantAssignments) {
            const rabbitId = Number(a.rabbit.id);
            if (!notifiedIds.has(rabbitId)) {
                notifiedIds.add(rabbitId);
                const rabbitLabel = a.rabbit.name ? `**${a.rabbit.name}** con código **${a.rabbit.code}**` : `con código **${a.rabbit.code}**`;
                notificationsToCreate.push({
                    profileId,
                    type: 'info',
                    title: 'Pie de Cría Listo',
                    message: `El conejo de pie de cría ${rabbitLabel} en la jaula **${a.cage.number}** ha cumplido 4 meses. Se sugiere moverlo a una jaula individual de reproducción.`,
                    data: { type: 'maturity_info', rabbitId: rabbitId, cageId: a.cage.id }
                });
            }
        }

        if (notificationsToCreate.length > 0) {
            await Notification.bulkCreate(notificationsToCreate);
        }

        await this._deleteStaleMaturityNotifications(relevantAssignments, notifiedIds, notificationMap);
    }

    async _runMaturityCheck(profileId) {
        try {
            const { Assignment, Cage, Rabbit, Notification, FarmMember, Galpon } = require('../../domain/models');
            const { Op } = require('sequelize');

            const [assignments, { notifiedIds, notificationMap }] = await Promise.all([
                Assignment.findAll({
                    where: { status: 'asignado' },
                    include: [
                        {
                            model: Cage,
                            as: 'cage',
                            where: { type: 'engorde' },
                            required: true
                        },
                        {
                            model: Rabbit,
                            as: 'rabbit',
                            where: { purpose: 'Reproducción' },
                            required: true
                        }
                    ]
                }),
                this._getNotifiedIds(profileId, 'info', 'maturity')
            ]);

            // Filter rabbits that are >= 4 months old
            const today = new Date();
            const maturityMs = 4 * 30.44 * 24 * 60 * 60 * 1000;
            const matureAssignments = assignments.filter(a => {
                const birthDate = new Date(a.rabbit.birthDate);
                return (today - birthDate) >= maturityMs;
            });

            if (matureAssignments.length === 0) {
                if (notificationMap.size > 0) {
                    await Notification.destroy({ where: { id: { [Op.in]: Array.from(notificationMap.values()) } } });
                }
                return;
            }

            // Only notify for those in the user's galpones/access
            const [memberships, ownedGalpones] = await Promise.all([
                FarmMember.findAll({ where: { profileId, status: 'active' } }),
                Galpon.findAll({ where: { profileId } })
            ]);

            const relevantAssignments = await this._filterMaturityAssignmentsByAccess(matureAssignments, memberships, ownedGalpones);
            await this._syncMaturityNotifications(profileId, relevantAssignments, notifiedIds, notificationMap);
        } catch (error) {
            console.error('Error checking/creating maturity notifications:', error);
        }
    }

    async checkAndCreateFeedingNotifications(profileId, options = {}) {
        if (ongoingChecks.has(`${profileId}_feeding`)) return ongoingChecks.get(`${profileId}_feeding`);
        const promise = this._runFeedingCheck(profileId, options).finally(() => ongoingChecks.delete(`${profileId}_feeding`));
        ongoingChecks.set(`${profileId}_feeding`, promise);
        return promise;
    }

    _determineActiveFeedingShift(now) {
        const timeFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Guayaquil',
            hour: 'numeric',
            minute: 'numeric',
            hour12: false
        });
        const parts = timeFormatter.formatToParts(now);
        const currentHour = Number.parseInt(parts.find(p => p.type === 'hour').value, 10);

        let activeShift = null;
        let dateForShift = now;

        if (currentHour >= 9 && currentHour < 12) {
            activeShift = 'mañana';
            dateForShift = now;
        } else if (currentHour >= 17) {
            activeShift = 'tarde';
            dateForShift = now;
        } else if (currentHour < 4) {
            activeShift = 'tarde';
            dateForShift = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        }

        return { activeShift, dateForShift };
    }

    _parseNotificationData(rawData) {
        if (!rawData) return null;
        if (typeof rawData === 'string') {
            try { return JSON.parse(rawData); } catch { return null; }
        }
        return rawData;
    }

    async _recordPendingFeedingShiftAudit(d) {
        if (!d.galponId || !d.shift || !d.date || d.unfedCount <= 0) return;

        const { AuditLog } = require('../../domain/models');
        const { recordSystemChange } = require('../../common/helpers/audit.helper');

        try {
            const cleanGalponId = Number(d.galponId);
            const existingLog = await AuditLog.findOne({
                where: {
                    entity: 'feeding',
                    action: 'Turno cerrado con pendientes',
                    'details.galponId': cleanGalponId,
                    'details.shift': d.shift,
                    'details.date': d.date
                }
            });

            if (!existingLog) {
                const shiftLabel = d.shift === 'mañana' ? 'la mañana' : 'la tarde';
                const cagesLabel = d.unfedCount === 1 ? '1 jaula' : `${d.unfedCount} jaulas`;
                const cagesListStr = Array.isArray(d.cages) && d.cages.length > 0 ? ` [jaulas: ${d.cages.join(', ')}]` : '';

                await recordSystemChange({
                    galponId: cleanGalponId,
                    action: 'Turno cerrado con pendientes',
                    entity: 'feeding',
                    entityId: cleanGalponId,
                    itemName: `Turno de ${shiftLabel}`,
                    summary: `HopTolt registró el cierre del turno de ${shiftLabel} con ${cagesLabel}${cagesListStr} sin alimentar y sin reporte de novedad`,
                    cages: d.cages || [],
                    unfedCount: d.unfedCount,
                    shift: d.shift,
                    date: d.date
                });
            }
        } catch (logErr) {
            console.error('Error al registrar auditoría de omisión de alimentación:', logErr);
        }
    }

    async _cleanupInactiveShiftReminders(profileId) {
        const { Notification } = require('../../domain/models');
        const { Op } = require('sequelize');

        const existingReminders = await Notification.findAll({
            where: { profileId, type: 'warning' }
        });
        const toDelete = [];
        const auditPayloads = [];

        for (const n of existingReminders) {
            const d = this._parseNotificationData(n.data);
            if (d?.type !== 'feeding_reminder') continue;

            toDelete.push(n.id);
            auditPayloads.push(d);
        }

        await Promise.all(auditPayloads.map(d => this._recordPendingFeedingShiftAudit(d)));

        if (toDelete.length > 0) {
            await Notification.destroy({ where: { id: { [Op.in]: toDelete } } });
        }
    }

    async _resolveMembershipFeedingGalpon(m) {
        const { Galpon, WorkerPermission } = require('../../domain/models');
        const { Op } = require('sequelize');

        if (m.role === 'owner') {
            const g = await Galpon.findByPk(m.galponId);
            return g ? { galponId: m.galponId, entry: { galpon: g, isOwner: true } } : null;
        }

        if (m.role === 'worker') {
            const hasPermission = await WorkerPermission.findOne({
                where: {
                    farmMemberId: m.id,
                    moduleName: { [Op.in]: ['alimentacion', 'feeding'] },
                    [Op.or]: [{ canRead: true }, { canCreate: true }]
                }
            });
            if (!hasPermission) return null;
            const g = await Galpon.findByPk(m.galponId);
            return g ? { galponId: m.galponId, entry: { galpon: g, isOwner: false, memberId: m.id } } : null;
        }

        return null;
    }

    async _getAccessibleGalponesForFeeding(profileId) {
        const { Galpon, FarmMember } = require('../../domain/models');

        const [ownedGalpones, memberships] = await Promise.all([
            Galpon.findAll({ where: { profileId } }),
            FarmMember.findAll({ where: { profileId, status: 'active' } })
        ]);

        const accessibleGalponMap = new Map();
        for (const og of ownedGalpones) {
            accessibleGalponMap.set(og.id, { galpon: og, isOwner: true });
        }

        const unmappedMemberships = memberships.filter(m => !accessibleGalponMap.has(m.galponId));
        const resolvedEntries = await Promise.all(
            unmappedMemberships.map(m => this._resolveMembershipFeedingGalpon(m))
        );

        for (const item of resolvedEntries) {
            if (item && !accessibleGalponMap.has(item.galponId)) {
                accessibleGalponMap.set(item.galponId, item.entry);
            }
        }
        return accessibleGalponMap;
    }

    async _findPendingFeedingForGalpon(entry, activeShift, startOfDay, endOfDay) {
        const { Cage, Assignment, Feeding, WorkerCage } = require('../../domain/models');
        const { Op } = require('sequelize');
        const { galpon, isOwner, memberId } = entry;
        let cageIdsToCheck = [];

        if (isOwner) {
            const activeAssignments = await Assignment.findAll({
                where: { status: 'asignado' },
                include: [{
                    model: Cage,
                    as: 'cage',
                    where: { galponId: galpon.id },
                    required: true,
                    attributes: ['id']
                }],
                attributes: ['cageId']
            });
            cageIdsToCheck = Array.from(new Set(activeAssignments.map(a => Number(a.cageId))));
        } else {
            const workerCages = await WorkerCage.findAll({ where: { farmMemberId: memberId } });
            const assignedCageIds = workerCages.map(wc => Number(wc.cageId));
            if (assignedCageIds.length > 0) {
                const activeAssignments = await Assignment.findAll({
                    where: {
                        status: 'asignado',
                        cageId: { [Op.in]: assignedCageIds }
                    },
                    include: [{
                        model: Cage,
                        as: 'cage',
                        where: { galponId: galpon.id },
                        required: true,
                        attributes: ['id']
                    }],
                    attributes: ['cageId']
                });
                cageIdsToCheck = Array.from(new Set(activeAssignments.map(a => Number(a.cageId))));
            }
        }

        if (cageIdsToCheck.length === 0) return null;

        const fedRecords = await Feeding.findAll({
            where: {
                galponId: galpon.id,
                cageId: { [Op.in]: cageIdsToCheck },
                shift: activeShift,
                feedingDate: { [Op.between]: [startOfDay, endOfDay] }
            },
            attributes: ['cageId']
        });
        const fedCageIds = new Set(fedRecords.map(f => Number(f.cageId)));
        const unfedCageIds = cageIdsToCheck.filter(id => !fedCageIds.has(id));

        if (unfedCageIds.length === 0) return null;

        return {
            galpon,
            unfedCount: unfedCageIds.length,
            unfedCageIds
        };
    }

    _shouldDeleteFeedingReminder(n, d, activeShift, todayStr, galponIdsWithPendingFeeding) {
        const reminderGalponId = Number(d.galponId);
        if (d.shift !== activeShift || d.date !== todayStr || !galponIdsWithPendingFeeding.has(reminderGalponId)) {
            return true;
        }
        const nowMs = Date.now();
        const lastNotifiedMs = d.lastNotifiedAt ? new Date(d.lastNotifiedAt).getTime() : new Date(n.createdAt).getTime();
        const FEEDING_INTERVAL = 60 * 60 * 1000;
        const JITTER_BUFFER = 5000;
        const isIntervalDue = (nowMs - lastNotifiedMs) >= (FEEDING_INTERVAL - JITTER_BUFFER);
        const hasLegacyMessage = Boolean(
            n.message?.includes('Son más de las') ||
            n.message?.includes('(hora límite:') ||
            n.message?.includes('Son las')
        );
        return isIntervalDue || hasLegacyMessage;
    }

    async _filterAndCreateFeedingNotifications(profileId, galponIdsWithPendingFeeding, activeShift, todayStr) {
        const { Notification } = require('../../domain/models');
        const { Op } = require('sequelize');

        const existingReminders = await Notification.findAll({
            where: { profileId, type: 'warning' }
        });

        const toDelete = [];
        const alreadyNotifiedGalponIds = new Set();

        for (const n of existingReminders) {
            const d = this._parseNotificationData(n.data);
            if (d?.type !== 'feeding_reminder') continue;

            if (this._shouldDeleteFeedingReminder(n, d, activeShift, todayStr, galponIdsWithPendingFeeding)) {
                toDelete.push(n.id);
            } else {
                alreadyNotifiedGalponIds.add(Number(d.galponId));
            }
        }

        if (toDelete.length > 0) {
            await Notification.destroy({ where: { id: { [Op.in]: toDelete } } });
        }

        const notificationsToCreate = [];
        for (const [galponId, pendingInfo] of galponIdsWithPendingFeeding.entries()) {
            if (!alreadyNotifiedGalponIds.has(galponId)) {
                const shiftStr = activeShift === 'mañana' ? 'la mañana' : 'la tarde';

                notificationsToCreate.push({
                    profileId,
                    type: 'warning',
                    title: 'Recordatorio de Alimentación',
                    message: `Aún no se ha registrado la alimentación de ${shiftStr} en el galpón **"${pendingInfo.galpon.name}"** para tus conejos. ¡Por favor regístrala lo antes posible!`,
                    data: {
                        type: 'feeding_reminder',
                        shift: activeShift,
                        date: todayStr,
                        galponId,
                        unfedCount: pendingInfo.unfedCount,
                        cages: pendingInfo.unfedCageIds || [],
                        lastNotifiedAt: new Date().toISOString()
                    },
                    createdAt: new Date()
                });
            }
        }

        if (notificationsToCreate.length > 0) {
            await Notification.bulkCreate(notificationsToCreate);
        }
    }

    async _runFeedingCheck(profileId, options = {}) {
        try {
            const feedingRepository = require('../feeding/feeding.repository');
            const now = new Date();
            const { activeShift, dateForShift } = this._determineActiveFeedingShift(now);

            if (!activeShift) {
                await this._cleanupInactiveShiftReminders(profileId);
                return;
            }

            const accessibleGalponMap = await this._getAccessibleGalponesForFeeding(profileId);
            const { startOfDay, endOfDay } = feedingRepository._getEcuadorDayBounds(dateForShift);
            const galponIdsWithPendingFeeding = new Map();

            const entries = Array.from(accessibleGalponMap.values());
            const pendingResults = await Promise.all(
                entries.map(entry => this._findPendingFeedingForGalpon(entry, activeShift, startOfDay, endOfDay))
            );
            for (const pendingInfo of pendingResults) {
                if (pendingInfo) {
                    galponIdsWithPendingFeeding.set(pendingInfo.galpon.id, pendingInfo);
                }
            }

            const todayStr = dateForShift.toLocaleDateString('sv', { timeZone: 'America/Guayaquil' });
            await this._filterAndCreateFeedingNotifications(profileId, galponIdsWithPendingFeeding, activeShift, todayStr);
        } catch (error) {
            console.error('Error checking/creating feeding notifications:', error);
        }
    }

    async checkAllProfilesFeedingNotifications() {
        try {
            const { Galpon, FarmMember } = require('../../domain/models');
            const [owned, members] = await Promise.all([
                Galpon.findAll({ attributes: ['profileId'], raw: true }),
                FarmMember.findAll({ where: { status: 'active' }, attributes: ['profileId'], raw: true })
            ]);

            const profileIds = new Set();
            for (const o of owned) {
                if (o.profileId) profileIds.add(o.profileId);
            }
            for (const m of members) {
                if (m.profileId) profileIds.add(m.profileId);
            }

            await Promise.all(
                Array.from(profileIds).map(profileId => this.checkAndCreateFeedingNotifications(profileId))
            );
        } catch (error) {
            console.error('Error checking all profiles feeding notifications:', error.message);
        }
    }

    _getCageCleaningStartDate(lastCleaning, cageAssignments) {
        if (lastCleaning?.cleaningDate) {
            return new Date(lastCleaning.cleaningDate);
        }
        if (cageAssignments.length > 0 && cageAssignments[0]?.assignedAt) {
            return new Date(cageAssignments[0].assignedAt);
        }
        return null;
    }

    _findDirtyCages(cagesToCheck, cleanings, assignments, todayMs) {
        const cleaningMap = new Map();
        for (const c of cleanings) {
            if (!cleaningMap.has(c.cageId)) cleaningMap.set(c.cageId, c);
        }

        const assignmentMap = new Map();
        for (const a of assignments) {
            if (!assignmentMap.has(a.cageId)) assignmentMap.set(a.cageId, []);
            assignmentMap.get(a.cageId).push(a);
        }

        const dirtyCages = [];
        for (const cage of cagesToCheck) {
            const lastCleaning = cleaningMap.get(cage.id);
            const cageAssignments = assignmentMap.get(cage.id) || [];
            const startDate = this._getCageCleaningStartDate(lastCleaning, cageAssignments);

            if (!startDate) continue;

            const startMs = startDate.getTime();
            const merged = this._mergeIntervals(cageAssignments, startMs, todayMs);
            const daysWithoutCleaning = this._calculateDaysWithoutCleaning(merged);

            if (daysWithoutCleaning >= 3) {
                dirtyCages.push({
                    cageId: cage.id,
                    cageNumber: cage.number,
                    daysWithoutCleaning,
                    galponId: cage.galponId
                });
            }
        }
        return dirtyCages;
    }

    async _syncCleaningNotification(profileId, dirtyCages, cleaningNotifications) {
        const { Notification } = require('../../domain/models');
        dirtyCages.sort((a, b) => a.cageNumber - b.cageNumber);

        const count = dirtyCages.length;
        const message = count === 1
            ? `Tienes 1 jaula con 3 o más días de ocupación sin limpieza en tu galpón. ¡Por favor realiza la limpieza lo antes posible!`
            : `Tienes ${count} jaulas con 3 o más días de ocupación sin limpieza en tu galpón. ¡Por favor realiza la limpieza lo antes posible!`;

        const dataPayload = {
            type: 'cleaning_warning',
            pendingCages: dirtyCages.map(c => ({
                cageId: c.cageId,
                cageNumber: c.cageNumber,
                daysWithoutCleaning: c.daysWithoutCleaning
            })),
            cagesCount: count
        };

        const groupedNotif = cleaningNotifications.find(n => {
            const d = typeof n.data === 'string' ? JSON.parse(n.data || '{}') : (n.data || {});
            return Array.isArray(d.pendingCages);
        });

        if (groupedNotif) {
            const prevData = typeof groupedNotif.data === 'string' ? JSON.parse(groupedNotif.data || '{}') : (groupedNotif.data || {});
            const hasChanged = groupedNotif.title !== 'Alerta de Limpieza Requerida' ||
                groupedNotif.message !== message ||
                Number(prevData.cagesCount) !== Number(dataPayload.cagesCount);

            if (hasChanged) {
                await groupedNotif.update({
                    title: 'Alerta de Limpieza Requerida',
                    message,
                    data: dataPayload
                });
            }
            const toDelete = cleaningNotifications.filter(n => n.id !== groupedNotif.id).map(n => n.id);
            if (toDelete.length > 0) {
                await Notification.destroy({ where: { id: toDelete } });
            }
        } else {
            const toDelete = cleaningNotifications.map(n => n.id);
            if (toDelete.length > 0) {
                await Notification.destroy({ where: { id: toDelete } });
            }
            await Notification.create({
                profileId,
                type: 'warning',
                title: 'Alerta de Limpieza Requerida',
                message,
                data: dataPayload,
                read: false
            });
        }
    }

    async _processCleaningNotifications(profileId, cagesToCheck) {
        const { Cleaning, Notification, Assignment } = require('../../domain/models');
        const { Op } = require('sequelize');
        const todayMs = Date.now();

        const cageIds = (cagesToCheck || []).map(c => c.id);
        let dirtyCages = [];

        if (cageIds.length > 0) {
            const [cleanings, assignments] = await Promise.all([
                Cleaning.findAll({
                    where: { cageId: { [Op.in]: cageIds } },
                    order: [['cleaningDate', 'DESC']]
                }),
                Assignment.findAll({
                    where: { cageId: { [Op.in]: cageIds } },
                    order: [['assignedAt', 'ASC']]
                })
            ]);
            dirtyCages = this._findDirtyCages(cagesToCheck, cleanings, assignments, todayMs);
        }

        const existingNotifications = await Notification.findAll({
            where: {
                profileId,
                type: 'warning'
            }
        });
        const cleaningNotifications = existingNotifications.filter(n => {
            const d = typeof n.data === 'string' ? JSON.parse(n.data || '{}') : (n.data || {});
            return d.type === 'cleaning_warning' || n.title?.includes('Limpieza');
        });

        if (dirtyCages.length > 0) {
            await this._syncCleaningNotification(profileId, dirtyCages, cleaningNotifications);
        } else {
            const toDelete = cleaningNotifications.map(n => n.id);
            if (toDelete.length > 0) {
                await Notification.destroy({ where: { id: toDelete } });
            }
        }
    }

    _mergeIntervals(assignments, startMs, todayMs) {
        const intervals = [];
        for (const assignment of assignments) {
            const assignedMs = new Date(assignment.assignedAt).getTime();
            const liberatedMs = (assignment.status === 'liberado' && assignment.updatedAt)
                ? new Date(assignment.updatedAt).getTime()
                : todayMs;

            const overlapStart = Math.max(startMs, assignedMs);
            const overlapEnd = Math.min(todayMs, liberatedMs);

            if (overlapStart < overlapEnd) {
                intervals.push([overlapStart, overlapEnd]);
            }
        }

        intervals.sort((a, b) => a[0] - b[0]);
        const merged = [];
        for (const [start, end] of intervals) {
            if (merged.length === 0) {
                merged.push([start, end]);
            } else {
                const last = merged[merged.length - 1];
                if (start <= last[1]) {
                    last[1] = Math.max(last[1], end);
                } else {
                    merged.push([start, end]);
                }
            }
        }
        return merged;
    }

    _calculateDaysWithoutCleaning(merged) {
        let totalOccupiedMs = 0;
        for (const [start, end] of merged) {
            totalOccupiedMs += (end - start);
        }
        return Math.floor(totalOccupiedMs / (1000 * 60 * 60 * 24));
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

    _normalizeRabbitIdentifiers(rabbitIdentifiers) {
        const rawList = Array.isArray(rabbitIdentifiers) ? rabbitIdentifiers : [rabbitIdentifiers];
        return rawList.map(item => {
            if (typeof item === 'object' && item !== null) {
                return {
                    label: item.name ? `${item.name} - ${item.code}` : (item.label || item.code || ''),
                    isFemale: item.sex === 'hembra'
                };
            }
            return {
                label: String(item),
                isFemale: false
            };
        });
    }

    _buildSingleRabbitAssignmentText(cageNumber, first, isAssigned) {
        const isFemale = Boolean(first.isFemale);
        const noun = isFemale ? 'coneja' : 'conejo';
        const article = isFemale ? 'La' : 'El';

        if (isAssigned) {
            const title = isFemale ? 'Nueva Asignación de Coneja' : 'Nueva Asignación de Conejo';
            const actionWord = isFemale ? 'asignada' : 'asignado';
            return {
                title,
                message: `${article} ${noun} **${first.label}** ha sido ${actionWord} a tu jaula ${cageNumber}.`
            };
        }

        const title = isFemale ? 'Coneja Removida' : 'Conejo Removido';
        const actionWord = isFemale ? 'removida' : 'removido';
        return {
            title,
            message: `${article} ${noun} **${first.label}** ha sido ${actionWord} de tu jaula ${cageNumber}.`
        };
    }

    _buildAssignmentNotificationContent(cageNumber, normalizedList, isAssigned) {
        const count = normalizedList.length;
        if (count === 1) {
            return this._buildSingleRabbitAssignmentText(cageNumber, normalizedList[0], isAssigned);
        }

        if (isAssigned) {
            return {
                title: 'Nuevas Asignaciones de Conejos',
                message: `Se asignaron **${count} conejos** a tu jaula ${cageNumber}: ${normalizedList.map(r => r.label).join(', ')}.`
            };
        }

        return {
            title: 'Conejos Removidos',
            message: `Se removieron **${count} conejos** de tu jaula ${cageNumber}.`
        };
    }

    async createRabbitAssignmentNotification(cageId, rabbitIdentifiers, isAssigned) {
        try {
            const { WorkerCage, FarmMember, Cage, Notification } = require('../../domain/models');
            const { Op } = require('sequelize');

            const [cage, workerCages] = await Promise.all([
                Cage.findByPk(cageId),
                WorkerCage.findAll({ where: { cageId } })
            ]);
            if (!cage || !workerCages || workerCages.length === 0) return;

            const memberIds = workerCages.map(wc => wc.farmMemberId);
            const members = await FarmMember.findAll({ where: { id: { [Op.in]: memberIds } } });

            const normalizedList = this._normalizeRabbitIdentifiers(rabbitIdentifiers);
            const count = normalizedList.length;
            if (count === 0) return;

            const first = normalizedList[0];
            const { title, message } = this._buildAssignmentNotificationContent(cage.number, normalizedList, isAssigned);

            const notificationsToCreate = [];
            for (const member of members) {
                if (member?.role !== 'worker' || member?.status !== 'active' || !member?.profileId) continue;

                notificationsToCreate.push({
                    profileId: member.profileId,
                    type: 'info',
                    title,
                    message,
                    data: {
                        type: 'rabbit_assignment',
                        cageId,
                        rabbitCode: first.label,
                        rabbitsList: normalizedList.map(r => r.label),
                        count,
                        isAssigned
                    }
                });
            }

            if (notificationsToCreate.length > 0) {
                await Notification.bulkCreate(notificationsToCreate);
            }
        } catch (error) {
            console.error('Error creating rabbit assignment notification:', error);
        }
    }

    async _runAllChecks(profileId, options = {}) {
        const now = Date.now();
        const lastCheck = lastChecksTimestamp.get(profileId) || 0;
        const CHECK_THROTTLE_MS = 2 * 60 * 1000; // 2 minutos de throttle para evitar saturar la base de datos

        if (!options.freshSession && !options.force && (now - lastCheck < CHECK_THROTTLE_MS)) {
            return;
        }

        if (ongoingChecks.has(`all_checks_${profileId}`)) {
            return ongoingChecks.get(`all_checks_${profileId}`);
        }

        const promise = (async () => {
            try {
                await Promise.all([
                    this.checkAndCreateBirthNotifications(profileId),
                    this.checkAndCreateCleaningNotifications(profileId),
                    this.checkAndCreateWeaningNotifications(profileId),
                    this.checkAndCreateMaturityNotifications(profileId),
                    this.checkAndCreateFeedingNotifications(profileId, options),
                    growthService.processDailyGrowth(profileId)
                ]);
                lastChecksTimestamp.set(profileId, Date.now());
            } catch (error) {
                console.error('Error running notification checks:', error);
            } finally {
                ongoingChecks.delete(`all_checks_${profileId}`);
            }
        })();

        ongoingChecks.set(`all_checks_${profileId}`, promise);
        return promise;
    }

    async getNotificationsByProfile(profileId, options = {}) {
        await this._runAllChecks(profileId, options);

        const page = Number.parseInt(options.page) || 1;
        const limit = Number.parseInt(options.limit) || 12;
        const { limit: limitValue, offset, page: pageValue } = getPaginationParams(page, limit);

        const queryOptions = {
            ...options,
            limit: limitValue,
            offset
        };

        const { Op, Sequelize } = require('sequelize');
        const [, notifications, total] = await Promise.all([
            Promise.resolve(Notification.destroy ? Notification.destroy({
                where: {
                    profileId,
                    [Op.or]: [
                        Sequelize.literal(`COALESCE(("data"->>'type'), '') IN ('incident', 'incident_response')`),
                        { title: { [Op.iLike]: '%novedad%' } }
                    ]
                }
            }) : null).catch(() => { }),
            notificationRepository.findByProfileId(profileId, queryOptions),
            notificationRepository.countByProfileId(profileId, queryOptions)
        ]);

        return createPaginatedResponse(
            (notifications || []).map(toNotificationDTO),
            pageValue,
            limitValue,
            total || 0
        );
    }

    async getUnreadCount(profileId, filter) {
        await this._runAllChecks(profileId);
        return await notificationRepository.countUnread(profileId, filter);
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
        const notif = await notificationRepository.findById(id);
        if (notif && notif.data && notif.data.isContract) {
            throw new AppError('Este aviso de responsabilidad no se puede borrar mientras mantengas los permisos correspondientes.', 400);
        }
        return await notificationRepository.delete(id);
    }

    async _resolveMembershipReproductionCondition(m) {
        if (m.role === 'owner') {
            return { galponId: m.galponId };
        }
        if (m.role !== 'worker') return null;

        const { WorkerCage, WorkerPermission } = require('../../domain/models');
        const [hasPermission, workerCages] = await Promise.all([
            WorkerPermission.findOne({
                where: {
                    farmMemberId: m.id,
                    moduleName: { [Op.in]: ['reproduccionyparto', 'reproduction'] },
                    canRead: true
                }
            }),
            WorkerCage.findAll({ where: { farmMemberId: m.id } })
        ]);

        if (!hasPermission) return null;
        const cageIds = workerCages.map(wc => wc.cageId);
        if (cageIds.length === 0) return null;

        return {
            galponId: m.galponId,
            '$female.assignments.cageId$': { [Op.in]: cageIds }
        };
    }

    async _getReproductionConditions(profileId) {
        const [memberships, ownedGalpones] = await Promise.all([
            FarmMember.findAll({ where: { profileId, status: 'active' } }),
            Galpon.findAll({ where: { profileId } })
        ]);

        const conditions = [];

        if (ownedGalpones.length > 0) {
            conditions.push({ galponId: { [Op.in]: ownedGalpones.map(g => g.id) } });
        }

        const resolvedConditions = await Promise.all(
            memberships.map(m => this._resolveMembershipReproductionCondition(m))
        );

        for (const cond of resolvedConditions) {
            if (cond) conditions.push(cond);
        }

        return conditions;
    }

    async _getNotifiedIds(profileId, type, filterType) {
        const warnings = await Notification.findAll({ where: { profileId, type } });
        const notifiedIds = new Set();
        const notificationMap = new Map();
        for (const w of warnings) {
            if (w.data) {
                const dataObj = this._parseNotificationData(w.data);
                if (!dataObj) continue;
                this._addNotifiedId(notifiedIds, notificationMap, w.id, dataObj, filterType);
            }
        }
        return { notifiedIds, notificationMap };
    }

    _addNotifiedId(notifiedIds, notificationMap, notificationId, dataObj, filterType) {
        if ((filterType === 'birth' && dataObj?.type === 'birth_warning' && dataObj?.reproductionId) || (filterType === 'weaning' && dataObj?.type === 'weaning_alert' && dataObj?.reproductionId)) {
            notifiedIds.add(Number(dataObj.reproductionId));
            notificationMap.set(Number(dataObj.reproductionId), notificationId);
        } else if (filterType === 'cleaning' && dataObj?.type === 'cleaning_warning' && dataObj?.cageId) {
            notifiedIds.add(Number(dataObj.cageId));
            notificationMap.set(Number(dataObj.cageId), notificationId);
        } else if (filterType === 'maturity' && dataObj?.type === 'maturity_info' && dataObj?.rabbitId) {
            notifiedIds.add(Number(dataObj.rabbitId));
            notificationMap.set(Number(dataObj.rabbitId), notificationId);
        }
    }

    async _getWorkerCleaningCages(m, assignedCageIds) {
        const { Cage, WorkerCage, WorkerPermission } = require('../../domain/models');
        const { Op } = require('sequelize');

        const [hasPermission, workerCages] = await Promise.all([
            WorkerPermission.findOne({
                where: {
                    farmMemberId: m.id,
                    moduleName: { [Op.in]: ['limpieza', 'cleaning'] },
                    canRead: true
                }
            }),
            WorkerCage.findAll({ where: { farmMemberId: m.id } })
        ]);

        if (!hasPermission) return [];
        const cageIds = workerCages.map(wc => wc.cageId).filter(id => assignedCageIds.has(Number(id)));
        if (cageIds.length === 0) return [];

        return Cage.findAll({
            where: { id: { [Op.in]: cageIds }, galponId: m.galponId }
        });
    }

    async _resolveMembershipCleaningCages(m, assignedCageIds) {
        const { Cage } = require('../../domain/models');
        const { Op } = require('sequelize');

        if (m.role === 'owner') {
            return Cage.findAll({
                where: { galponId: m.galponId, id: { [Op.in]: Array.from(assignedCageIds) } }
            });
        }
        if (m.role === 'worker') {
            return this._getWorkerCleaningCages(m, assignedCageIds);
        }
        return [];
    }

    async _getCagesToCheckForCleaning(profileId, assignedCageIds) {
        const [memberships, ownedGalpones] = await Promise.all([
            FarmMember.findAll({ where: { profileId, status: 'active' } }),
            Galpon.findAll({ where: { profileId } })
        ]);
        const { Cage } = require('../../domain/models');
        const { Op } = require('sequelize');

        const cagesToCheck = [];

        if (ownedGalpones.length > 0) {
            const ownerCages = await Cage.findAll({
                where: { galponId: { [Op.in]: ownedGalpones.map(g => g.id) }, id: { [Op.in]: Array.from(assignedCageIds) } }
            });
            cagesToCheck.push(...ownerCages);
        }

        const membershipCagesLists = await Promise.all(
            memberships.map(m => this._resolveMembershipCleaningCages(m, assignedCageIds))
        );

        for (const cageList of membershipCagesLists) {
            if (cageList.length > 0) {
                this._addUniqueCages(cagesToCheck, cageList);
            }
        }
        return cagesToCheck;
    }

    _addUniqueCages(cagesToCheck, newCages) {
        for (const c of newCages) {
            if (!cagesToCheck.some(x => x.id === c.id)) cagesToCheck.push(c);
        }
    }

    async _processUpcomingBirths(upcomingReproductions, profileId, notifiedIds) {
        const notificationsToCreate = [];
        for (const r of upcomingReproductions) {
            const repId = Number(r.id);
            if (!notifiedIds.has(repId)) {
                notifiedIds.add(repId);
                const birthDateStr = typeof r.estimatedBirthDate === 'string' ? r.estimatedBirthDate : r.estimatedBirthDate.toISOString().split('T')[0];
                const rabbitName = r.female?.name ? ` **${r.female.name}**` : '';
                const rabbitCode = r.female?.code ? ` con código **${r.female.code}**` : '';
                notificationsToCreate.push({
                    profileId,
                    type: 'warning',
                    title: 'Alerta de Parto Próximo',
                    message: `La coneja${rabbitName}${rabbitCode} tiene un parto estimado para el **${birthDateStr}**. ¡Prepara la jaula con anticipación!`,
                    data: { type: 'birth_warning', reproductionId: repId, estimatedBirthDate: birthDateStr }
                });
            }
        }
        if (notificationsToCreate.length > 0) {
            const { Notification } = require('../../domain/models');
            await Notification.bulkCreate(notificationsToCreate);
        }
    }

    async _cleanupStaleNotifications(notifiedIds, notificationMap, validStatus, validReproductions = []) {
        if (notifiedIds.size === 0) return;
        const { Notification } = require('../../domain/models');
        const { Op } = require('sequelize');

        const validReproductionIds = new Set(validReproductions.map(r => Number(r.id)));
        const notificationIdsToDelete = [];

        for (const notifiedId of notifiedIds) {
            if (!validReproductionIds.has(notifiedId)) {
                const notifId = notificationMap.get(notifiedId);
                if (notifId) notificationIdsToDelete.push(notifId);
            }
        }

        if (notificationIdsToDelete.length > 0) {
            await Notification.destroy({ where: { id: { [Op.in]: notificationIdsToDelete } } });
        }
    }

    _buildWeaningAlertMessage(weaningReproductions) {
        const count = weaningReproductions.length;
        if (count === 1) {
            const r = weaningReproductions[0];
            const rabbitName = r.female?.name ? ` **${r.female.name}**` : '';
            const rabbitCode = r.female?.code ? ` con código **${r.female.code}**` : '';
            return `La camada de la coneja${rabbitName}${rabbitCode} cumplió 30 días de lactancia. Es tiempo de realizar el destete.`;
        }
        return `Tienes **${count} camadas** listas para destete en tu galpón. Es tiempo de realizar el destete.`;
    }

    async _syncWeaningNotification(weaningNotifications, profileId, message, dataPayload, weaningReproductions) {
        const { Notification } = require('../../domain/models');
        const { Op } = require('sequelize');

        if (weaningNotifications.length > 0) {
            const mainNotif = weaningNotifications[0];
            const prevData = typeof mainNotif.data === 'string' ? JSON.parse(mainNotif.data || '{}') : (mainNotif.data || {});
            const hasChanged = mainNotif.title !== 'Recordatorio de Destete' ||
                mainNotif.message !== message ||
                Number(prevData.count) !== Number(dataPayload.count) ||
                Number(prevData.reproductionId) !== Number(weaningReproductions[0].id);

            if (hasChanged) {
                await mainNotif.update({
                    title: 'Recordatorio de Destete',
                    message,
                    data: dataPayload
                });
            }

            const extraIds = weaningNotifications.slice(1).map(n => n.id);
            if (extraIds.length > 0) {
                await Notification.destroy({ where: { id: { [Op.in]: extraIds } } });
            }
        } else {
            await Notification.create({
                profileId,
                type: 'warning',
                title: 'Recordatorio de Destete',
                message,
                data: dataPayload,
                read: false
            });
        }
    }

    async _processWeaningAlerts(weaningReproductions, profileId) {
        const { Notification } = require('../../domain/models');
        const { Op } = require('sequelize');

        const existingNotifications = await Notification.findAll({
            where: {
                profileId,
                type: 'warning'
            }
        });

        const weaningNotifications = existingNotifications.filter(n => {
            const d = typeof n.data === 'string' ? JSON.parse(n.data || '{}') : (n.data || {});
            return d.type === 'weaning_alert' || n.title?.includes('Destete');
        });

        if (!weaningReproductions || weaningReproductions.length === 0) {
            const toDelete = weaningNotifications.map(n => n.id);
            if (toDelete.length > 0) {
                await Notification.destroy({ where: { id: { [Op.in]: toDelete } } });
            }
            return;
        }

        const count = weaningReproductions.length;
        const reproductionsList = weaningReproductions.map(r => ({
            id: Number(r.id),
            code: r.female?.code || '',
            name: r.female?.name || ''
        }));

        const message = this._buildWeaningAlertMessage(weaningReproductions);
        const dataPayload = {
            type: 'weaning_alert',
            reproductionId: Number(weaningReproductions[0].id),
            count,
            reproductions: reproductionsList
        };

        await this._syncWeaningNotification(weaningNotifications, profileId, message, dataPayload, weaningReproductions);
    }
}

module.exports = new NotificationService();
