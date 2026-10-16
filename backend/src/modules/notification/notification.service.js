const notificationRepository = require('./notification.repository');
const { toNotificationDTO } = require('../../common/dtos/notification.dto');
const { Notification, FarmMember, Galpon, Reproduction, Rabbit } = require('../../domain/models');
const { getPaginationParams, createPaginatedResponse } = require('../../common/helpers/pagination.helper');
const growthService = require('../growth/growth.service');
const { Op } = require('sequelize');

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
            const { notifiedIds, notificationMap } = await this._getNotifiedIds(profileId, 'warning', 'birth');
            const conditions = await this._getReproductionConditions(profileId);

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
            const { notifiedIds, notificationMap } = await this._getNotifiedIds(profileId, 'warning', 'weaning');
            const conditions = await this._getReproductionConditions(profileId);

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

            await this._processWeaningAlerts(weaningReproductions, profileId, notifiedIds);
            await this._cleanupStaleNotifications(notifiedIds, notificationMap, 'lactancia', weaningReproductions);
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

    async _runMaturityCheck(profileId) {
        try {
            const { Assignment, Cage, Rabbit, Notification, FarmMember, Galpon } = require('../../domain/models');
            const { Op } = require('sequelize');

            // Find all active assignments for rabbits in engorde cages
            const assignments = await Assignment.findAll({
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
            });

            // Filter rabbits that are >= 4 months old
            const today = new Date();
            const maturityMs = 4 * 30.44 * 24 * 60 * 60 * 1000;
            const matureAssignments = assignments.filter(a => {
                const birthDate = new Date(a.rabbit.birthDate);
                return (today - birthDate) >= maturityMs;
            });

            const { notifiedIds, notificationMap } = await this._getNotifiedIds(profileId, 'info', 'maturity');

            if (matureAssignments.length === 0) {
                if (notificationMap.size > 0) {
                    await Notification.destroy({ where: { id: { [Op.in]: Array.from(notificationMap.values()) } } });
                }
                return;
            }

            // Only notify for those in the user's galpones/access
            const memberships = await FarmMember.findAll({ where: { profileId, status: 'active' } });
            const ownedGalpones = await Galpon.findAll({ where: { profileId } });
            const { WorkerCage, WorkerPermission } = require('../../domain/models');

            const relevantAssignments = [];
            for (const a of matureAssignments) {
                const cageGalponId = a.cage.galponId;
                const isOwner = ownedGalpones.some(g => g.id === cageGalponId) ||
                    memberships.some(m => m.galponId === cageGalponId && m.role === 'owner');

                if (isOwner) {
                    relevantAssignments.push(a);
                    continue;
                }

                // If user is a worker in this galpon:
                const workerMembership = memberships.find(m => m.galponId === cageGalponId && m.role === 'worker');
                if (workerMembership) {
                    const hasPermission = await WorkerPermission.findOne({
                        where: {
                            farmMemberId: workerMembership.id,
                            moduleName: { [Op.in]: ['reproduccionyparto', 'reproduction', 'rabbits', 'conejos', 'assignments', 'asignaciones'] },
                            canRead: true
                        }
                    });

                    if (hasPermission) {
                        const isCageAssigned = await WorkerCage.findOne({
                            where: { farmMemberId: workerMembership.id, cageId: a.cage.id }
                        });
                        if (isCageAssigned) {
                            relevantAssignments.push(a);
                        }
                    }
                }
            }

            const notificationsToCreate = [];

            for (const a of relevantAssignments) {
                const rabbitId = Number(a.rabbit.id);
                if (!notifiedIds.has(rabbitId)) {
                    notifiedIds.add(rabbitId);
                    notificationsToCreate.push({
                        profileId,
                        type: 'info',
                        title: 'Pie de Cría Listo',
                        message: `El conejo de pie de cría ${a.rabbit.name} (${a.rabbit.code}) en la jaula ${a.cage.number} ha cumplido 4 meses. Se sugiere moverlo a una jaula individual de reproducción.`,
                        data: { type: 'maturity_info', rabbitId: rabbitId, cageId: a.cage.id }
                    });
                }
            }

            if (notificationsToCreate.length > 0) {
                await Notification.bulkCreate(notificationsToCreate);
            }
            
            // Cleanup stale (if they were moved or no longer mature/exist)
            if (notifiedIds.size > 0) {
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

    async _runFeedingCheck(profileId, options = {}) {
        try {
            const { Notification, FarmMember, Galpon, Cage, Assignment, Feeding, WorkerPermission, WorkerCage } = require('../../domain/models');
            const { Op } = require('sequelize');
            const feedingRepository = require('../feeding/feeding.repository');

            // Determinar hora y minutos actuales en Ecuador (GMT-5)
            const now = new Date();
            const timeFormatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'America/Guayaquil',
                hour: 'numeric',
                minute: 'numeric',
                hour12: false
            });
            const parts = timeFormatter.formatToParts(now);
            const currentHour = Number.parseInt(parts.find(p => p.type === 'hour').value, 10);
            const currentMinute = Number.parseInt(parts.find(p => p.type === 'minute').value, 10);
            const currentTotalMinutes = currentHour * 60 + currentMinute;

            // Horario de alimentación habitual:
            // Turno Mañana: alimentación 4:00 AM - 9:00 AM. Alerta activa desde las 9:00 AM hasta las 11:59 AM (a las 12:00 PM expira y se limpia automáticamente).
            // Turno Tarde: alimentación 4:00 PM - 7:00 PM. Alerta activa desde las 5:00 PM (17:00) en adelante (y madrugada hasta las 3:59 AM).
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
                // Madrugada post-turno tarde: revisar el turno tarde del día que recién cerró
                dateForShift = new Date(now.getTime() - 6 * 60 * 60 * 1000);
            }

            // Si estamos fuera del horario de alerta, limpiar cualquier recordatorio existente
            if (!activeShift) {
                const existingReminders = await Notification.findAll({
                    where: { profileId, type: 'warning' }
                });
                const toDelete = [];
                for (const n of existingReminders) {
                    let d = n.data;
                    if (typeof d === 'string') {
                        try { d = JSON.parse(d); } catch (e) { continue; }
                    }
                    if (d?.type === 'feeding_reminder') {
                        toDelete.push(n.id);
                    }
                }
                if (toDelete.length > 0) {
                    await Notification.destroy({ where: { id: { [Op.in]: toDelete } } });
                }
                return;
            }

            // Obtener galpones y membresías del usuario
            const ownedGalpones = await Galpon.findAll({ where: { profileId } });
            const memberships = await FarmMember.findAll({ where: { profileId, status: 'active' } });

            const accessibleGalponMap = new Map();
            for (const og of ownedGalpones) {
                accessibleGalponMap.set(og.id, { galpon: og, isOwner: true });
            }

            for (const m of memberships) {
                if (m.role === 'owner') {
                    if (!accessibleGalponMap.has(m.galponId)) {
                        const g = await Galpon.findByPk(m.galponId);
                        if (g) accessibleGalponMap.set(m.galponId, { galpon: g, isOwner: true });
                    }
                } else if (m.role === 'worker') {
                    // Verificar si el trabajador tiene permiso en el módulo de alimentación
                    const hasPermission = await WorkerPermission.findOne({
                        where: {
                            farmMemberId: m.id,
                            moduleName: { [Op.in]: ['alimentacion', 'feeding'] },
                            [Op.or]: [
                                { canRead: true },
                                { canCreate: true }
                            ]
                        }
                    });
                    if (hasPermission && !accessibleGalponMap.has(m.galponId)) {
                        const g = await Galpon.findByPk(m.galponId);
                        if (g) accessibleGalponMap.set(m.galponId, { galpon: g, isOwner: false, memberId: m.id });
                    }
                }
            }

            const { startOfDay, endOfDay } = feedingRepository._getEcuadorDayBounds(dateForShift);
            const galponIdsWithPendingFeeding = new Map();

            for (const [galponId, entry] of accessibleGalponMap.entries()) {
                const { galpon, isOwner, memberId } = entry;
                let cageIdsToCheck = [];

                if (isOwner) {
                    // Todas las jaulas del galpón con conejos actualmente asignados
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
                    // Jaulas asignadas al trabajador que tengan conejos actualmente
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

                if (cageIdsToCheck.length > 0) {
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

                    if (unfedCageIds.length > 0) {
                        galponIdsWithPendingFeeding.set(galpon.id, {
                            galpon,
                            unfedCount: unfedCageIds.length
                        });
                    }
                }
            }

            // Revisar notificaciones existentes de recordatorio de alimentación
            const existingReminders = await Notification.findAll({
                where: { profileId, type: 'warning' }
            });

            const todayStr = dateForShift.toLocaleDateString('sv', { timeZone: 'America/Guayaquil' });
            const toDelete = [];
            const alreadyNotifiedGalponIds = new Set();

            for (const n of existingReminders) {
                let d = n.data;
                if (typeof d === 'string') {
                    try { d = JSON.parse(d); } catch (e) { continue; }
                }
                if (d?.type === 'feeding_reminder') {
                    const reminderGalponId = Number(d.galponId);
                    // Si el recordatorio no es de hoy, no es del turno activo, o el galpón ya no tiene jaulas pendientes:
                    if (d.shift !== activeShift || d.date !== todayStr || !galponIdsWithPendingFeeding.has(reminderGalponId)) {
                        toDelete.push(n.id);
                    } else {
                        const nowMs = Date.now();
                        const lastNotifiedMs = d.lastNotifiedAt ? new Date(d.lastNotifiedAt).getTime() : new Date(n.createdAt).getTime();
                        const FEEDING_INTERVAL = 60 * 60 * 1000; // 1 hora (60 minutos)
                        const JITTER_BUFFER = 5000; // Margen de 5s para sincronizar exactamente con el cron de cada minuto
                        const isIntervalDue = (nowMs - lastNotifiedMs) >= (FEEDING_INTERVAL - JITTER_BUFFER);
                        const hasLegacyMessage = n.message?.includes('Son más de las') || n.message?.includes('(hora límite:') || n.message?.includes('Son las');

                        // Solo se elimina y renueva si ya transcurrió el intervalo de 1 hora o si tiene mensaje legacy
                        if (isIntervalDue || hasLegacyMessage) {
                            toDelete.push(n.id);
                        } else {
                            alreadyNotifiedGalponIds.add(reminderGalponId);
                        }
                    }
                }
            }

            if (toDelete.length > 0) {
                await Notification.destroy({ where: { id: { [Op.in]: toDelete } } });
            }

            // Crear notificaciones para los galpones pendientes que aún no han sido notificados
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
                            lastNotifiedAt: new Date().toISOString()
                        },
                        createdAt: new Date()
                    });
                }
            }

            if (notificationsToCreate.length > 0) {
                await Notification.bulkCreate(notificationsToCreate);
            }
        } catch (error) {
            console.error('Error checking/creating feeding notifications:', error);
        }
    }

    async checkAllProfilesFeedingNotifications() {
        try {
            const { Galpon, FarmMember } = require('../../domain/models');
            const owned = await Galpon.findAll({ attributes: ['profileId'], raw: true });
            const members = await FarmMember.findAll({ where: { status: 'active' }, attributes: ['profileId'], raw: true });

            const profileIds = new Set();
            for (const o of owned) {
                if (o.profileId) profileIds.add(o.profileId);
            }
            for (const m of members) {
                if (m.profileId) profileIds.add(m.profileId);
            }

            for (const profileId of profileIds) {
                await this.checkAndCreateFeedingNotifications(profileId);
            }
        } catch (error) {
            console.error('Error checking all profiles feeding notifications:', error.message);
        }
    }

    async _processCleaningNotifications(profileId, cagesToCheck) {
        const { Cleaning, Notification, Assignment } = require('../../domain/models');
        const { Op } = require('sequelize');
        const todayMs = Date.now();

        const cageIds = (cagesToCheck || []).map(c => c.id);
        const dirtyCages = [];

        if (cageIds.length > 0) {
            const cleanings = await Cleaning.findAll({
                where: { cageId: { [Op.in]: cageIds } },
                order: [['cleaningDate', 'DESC']]
            });
            const cleaningMap = new Map();
            for (const c of cleanings) {
                if (!cleaningMap.has(c.cageId)) cleaningMap.set(c.cageId, c);
            }

            const assignments = await Assignment.findAll({
                where: { cageId: { [Op.in]: cageIds } },
                order: [['assignedAt', 'ASC']]
            });
            const assignmentMap = new Map();
            for (const a of assignments) {
                if (!assignmentMap.has(a.cageId)) assignmentMap.set(a.cageId, []);
                assignmentMap.get(a.cageId).push(a);
            }

            for (const cage of cagesToCheck) {
                const lastCleaning = cleaningMap.get(cage.id);
                const cageAssignments = assignmentMap.get(cage.id) || [];

                let startDate = null;
                if (lastCleaning?.cleaningDate) {
                    startDate = new Date(lastCleaning.cleaningDate);
                } else if (cageAssignments.length > 0) {
                    const firstAssignment = cageAssignments[0];
                    startDate = firstAssignment?.assignedAt ? new Date(firstAssignment.assignedAt) : null;
                }

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
        }

        // Buscar alertas de limpieza existentes para este usuario
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
                await groupedNotif.update({
                    title: 'Alerta de Limpieza Requerida',
                    message,
                    data: dataPayload,
                    read: false
                });
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

    async createRabbitAssignmentNotification(cageId, rabbitCode, isAssigned) {
        try {
            const { WorkerCage, FarmMember, Cage, Notification } = require('../../domain/models');
            const { Op } = require('sequelize');

            const cage = await Cage.findByPk(cageId);
            if (!cage) return;

            const workerCages = await WorkerCage.findAll({ where: { cageId } });
            if (workerCages.length === 0) return;

            const memberIds = workerCages.map(wc => wc.farmMemberId);
            const members = await FarmMember.findAll({ where: { id: { [Op.in]: memberIds } } });

            const notificationsToCreate = [];

            for (const member of members) {
                if (member?.role !== 'worker' || member?.status !== 'active' || !member?.profileId) continue;

                const title = isAssigned ? 'Nueva Asignación de Conejo' : 'Conejo Removido';
                const message = isAssigned
                    ? `El conejo con código ${rabbitCode} ha sido asignado a tu jaula ${cage.number}.`
                    : `El conejo con código ${rabbitCode} ha sido removido de tu jaula ${cage.number}.`;

                notificationsToCreate.push({
                    profileId: member.profileId,
                    type: 'info',
                    title,
                    message,
                    data: { type: 'rabbit_assignment', cageId, rabbitCode, isAssigned }
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
        const CHECK_THROTTLE_MS = 60 * 1000; // 60 segundos de throttle para evitar saturar la base de datos

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

        const notifications = await notificationRepository.findByProfileId(profileId, queryOptions);
        const total = await notificationRepository.countByProfileId(profileId, queryOptions);

        return createPaginatedResponse(
            notifications.map(toNotificationDTO),
            pageValue,
            limitValue,
            total
        );
    }

    async getUnreadCount(profileId) {
        await this._runAllChecks(profileId);
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
        const { WorkerCage, WorkerPermission } = require('../../domain/models');

        const conditions = [];

        if (ownedGalpones.length > 0) {
            conditions.push({ galponId: { [Op.in]: ownedGalpones.map(g => g.id) } });
        }

        for (const m of memberships) {
            if (m.role === 'owner') {
                conditions.push({ galponId: m.galponId });
            } else if (m.role === 'worker') {
                const hasPermission = await WorkerPermission.findOne({
                    where: { 
                        farmMemberId: m.id, 
                        moduleName: { [Op.in]: ['reproduccionyparto', 'reproduction'] }, 
                        canRead: true 
                    }
                });

                if (hasPermission) {
                    const workerCages = await WorkerCage.findAll({ where: { farmMemberId: m.id } });
                    const cageIds = workerCages.map(wc => wc.cageId);
                    if (cageIds.length > 0) {
                        conditions.push({
                            galponId: m.galponId,
                            '$female.assignments.cageId$': { [Op.in]: cageIds }
                        });
                    }
                }
            }
        }
        return conditions;
    }

    async _getNotifiedIds(profileId, type, filterType) {
        const warnings = await Notification.findAll({ where: { profileId, type } });
        const notifiedIds = new Set();
        const notificationMap = new Map();
        for (const w of warnings) {
            if (w.data) {
                let dataObj = w.data;
                if (typeof dataObj === 'string') {
                    try { dataObj = JSON.parse(dataObj); } catch (e) { console.error("Error parsing notification data", e); continue; }
                }
                this._addNotifiedId(notifiedIds, notificationMap, w.id, dataObj, filterType);
            }
        }
        return { notifiedIds, notificationMap };
    }

    _addNotifiedId(notifiedIds, notificationMap, notificationId, dataObj, filterType) {
        if ((filterType === 'birth' && dataObj?.reproductionId) || (filterType === 'weaning' && dataObj?.type === 'weaning_alert' && dataObj?.reproductionId)) {
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

    async _getCagesToCheckForCleaning(profileId, assignedCageIds) {
        const memberships = await FarmMember.findAll({ where: { profileId, status: 'active' } });
        const ownedGalpones = await Galpon.findAll({ where: { profileId } });
        const { Cage, WorkerCage, WorkerPermission } = require('../../domain/models');

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
                const hasPermission = await WorkerPermission.findOne({
                    where: {
                        farmMemberId: m.id,
                        moduleName: { [Op.in]: ['limpieza', 'cleaning'] },
                        canRead: true
                    }
                });

                if (hasPermission) {
                    const workerCages = await WorkerCage.findAll({ where: { farmMemberId: m.id } });
                    const cageIds = workerCages.map(wc => wc.cageId).filter(id => assignedCageIds.has(Number(id)));
                    if (cageIds.length > 0) {
                        const assignedCages = await Cage.findAll({
                            where: { id: { [Op.in]: cageIds }, galponId: m.galponId }
                        });
                        this._addUniqueCages(cagesToCheck, assignedCages);
                    }
                }
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
                const rabbitName = r.female?.name ? " (" + r.female.name + ")" : "";
                notificationsToCreate.push({
                    profileId,
                    type: 'warning',
                    title: 'Alerta de Parto Próximo',
                    message: `La coneja con código ${r.female?.code}${rabbitName} tiene un parto estimado para el ${birthDateStr}. ¡Por favor prepara la jaula con al menos 3 días de anticipación!`,
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

    async _processWeaningAlerts(weaningReproductions, profileId, notifiedIds) {
        const notificationsToCreate = [];
        for (const r of weaningReproductions) {
            const repId = Number(r.id);
            if (!notifiedIds.has(repId)) {
                notifiedIds.add(repId);
                const rabbitName = r.female?.name ? ` **${r.female.name}**` : "";
                notificationsToCreate.push({
                    profileId,
                    type: 'warning',
                    title: 'Recordatorio de Destete',
                    message: `La camada de la coneja ${rabbitName} ya cumplió 30 días de lactancia. Es tiempo de realizar el destete.`,
                    data: { type: 'weaning_alert', reproductionId: repId }
                });
            }
        }
        if (notificationsToCreate.length > 0) {
            const { Notification } = require('../../domain/models');
            await Notification.bulkCreate(notificationsToCreate);
        }
    }

}

module.exports = new NotificationService();
