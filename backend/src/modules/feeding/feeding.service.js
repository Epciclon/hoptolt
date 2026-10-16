const feedingRepository = require('./feeding.repository');
const galponRepository = require('../galpon/galpon.repository');
const { Cage, Assignment, FarmMember } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { getPaginationParams, createPaginatedResponse } = require('../../common/helpers/pagination.helper');

class FeedingService {
    async getFoodTypes(galponId) {
        const galpon = await galponRepository.findById(galponId);
        if (!galpon) throw new AppError('El galpón no existe.', 404);
        return galpon.foodTypes || [];
    }

    _buildFeedingPayloads(params) {
        const { cageIds, cageMap, assignmentsMap, existingCountMap, galponId, finalShift, justification, foodTypes, now, profileId } = params;
        const toCreate = [];
        for (const cageId of cageIds) {
            const cage = cageMap.get(cageId);
            if (!cage) throw new AppError(`La jaula con ID ${cageId} no existe.`, 404);
            if (cage.galponId !== galponId) throw new AppError(`La jaula con ID ${cageId} no pertenece al galpón activo.`, 400);

            const cageAssignments = assignmentsMap.get(cageId) || [];
            if (cageAssignments.length === 0) {
                throw new AppError(`La jaula con ID ${cageId} no tiene conejos asignados.`, 400);
            }

            const feedingsCount = existingCountMap.get(cageId) || 0;
            if (feedingsCount >= 1 && !justification) {
                throw new AppError(`La jaula ${cage.number} ya cuenta con registro de alimentación en el turno de la ${finalShift}. Se requiere justificación si deseas registrarla nuevamente.`, 400);
            }

            const rabbitsSnapshot = cageAssignments.map(a => a.rabbit).filter(Boolean);

            toCreate.push({
                cageId,
                foodTypes,
                justification: justification || null,
                feedingDate: now,
                shift: finalShift,
                galponId,
                profileId,
                rabbitsSnapshot
            });
        }
        return toCreate;
    }

    async registerFeeding(data, galponId, profileId) {
        const { cageIds, foodTypes, justification, shift } = data;

        // Obtener la hora actual en zona horaria de Ecuador (GMT-5)
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Guayaquil',
            hour: 'numeric',
            hour12: false
        });
        const currentHourEcuador = Number.parseInt(formatter.format(now), 10);
        
        // Si no mandan turno explícito, deducirlo de la hora de Ecuador
        let finalShift = shift;
        if (!finalShift) {
            finalShift = currentHourEcuador < 12 ? 'mañana' : 'tarde';
        }

        const { Op } = require('sequelize');
        const { Cage, Assignment, Rabbit, Feeding, WorkerCage } = require('../../domain/models');

        // Verificar que el usuario tiene acceso al galpón y validar sus jaulas si es trabajador
        const membership = await FarmMember.findOne({
            where: { profileId, galponId, status: 'active' }
        });
        if (!membership) throw new AppError('No tienes acceso a este galpón.', 403);

        if (membership.role === 'worker') {
            const workerCages = await WorkerCage.findAll({ where: { farmMemberId: membership.id } });
            const assignedCageIds = new Set(workerCages.map(wc => Number(wc.cageId)));
            for (const cageId of cageIds) {
                if (!assignedCageIds.has(Number(cageId))) {
                    throw new AppError(`No tienes permiso para alimentar jaulas que no tienes asignadas (jaula ID ${cageId}).`, 403);
                }
            }
        }

        // Precarga de Jaulas
        const cages = await Cage.findAll({ where: { id: { [Op.in]: cageIds } } });
        const cageMap = new Map();
        for (const c of cages) cageMap.set(c.id, c);

        // Precarga de Asignaciones
        const assignments = await Assignment.findAll({
            where: { cageId: { [Op.in]: cageIds }, status: 'asignado' },
            include: [{ model: Rabbit, as: 'rabbit', attributes: ['id', 'code', 'name', 'race', 'imageUrl'] }]
        });
        const assignmentsMap = new Map();
        for (const a of assignments) {
            if (!assignmentsMap.has(a.cageId)) assignmentsMap.set(a.cageId, []);
            assignmentsMap.get(a.cageId).push(a);
        }

        // Precarga de registros existentes (para validación de duplicados en el turno a nivel de galpón y jaula)
        const { startOfDay, endOfDay } = feedingRepository._getEcuadorDayBounds(now);
        const existingFeedings = await Feeding.findAll({
            where: {
                galponId,
                cageId: { [Op.in]: cageIds },
                shift: finalShift,
                feedingDate: { [Op.between]: [startOfDay, endOfDay] }
            },
            attributes: ['cageId']
        });
        const existingCountMap = new Map();
        for (const ef of existingFeedings) {
            existingCountMap.set(ef.cageId, (existingCountMap.get(ef.cageId) || 0) + 1);
        }

        const toCreate = this._buildFeedingPayloads({ cageIds, cageMap, assignmentsMap, existingCountMap, galponId, finalShift, justification, foodTypes, now, profileId });

        // Inserción concurrente rápida
        const createdFeedings = await Promise.all(toCreate.map(data => feedingRepository.create(data)));

        const { notifyOwnerOnWorkerAction } = require('../../common/helpers/notification.helper');
        await notifyOwnerOnWorkerAction(profileId, galponId, 'feeding', 'Alimentación');

        // Sincronización asíncrona en tiempo real: verificar y limpiar recordatorios de alimentación si ya se completaron
        try {
            const notificationService = require('../notification/notification.service');
            await notificationService.checkAndCreateFeedingNotifications(profileId);

            const galpon = await galponRepository.findById(galponId);
            if (galpon?.profileId && galpon.profileId !== profileId) {
                await notificationService.checkAndCreateFeedingNotifications(galpon.profileId);
            }

            const members = await FarmMember.findAll({ where: { galponId, status: 'active' } });
            for (const m of members) {
                if (m.profileId && m.profileId !== profileId && m.profileId !== galpon?.profileId) {
                    await notificationService.checkAndCreateFeedingNotifications(m.profileId);
                }
            }
        } catch (notifErr) {
            console.error('Error synchronizing feeding notifications after register:', notifErr);
        }

        return createdFeedings;
    }

    async getFeedings(galponId, profileId, page = 1, limit = 10, filters = {}) {
        if (!galponId) return createPaginatedResponse([], page, limit, 0);

        // Verificar que el usuario tiene acceso al galpón
        const membership = await FarmMember.findOne({
            where: { profileId, galponId, status: 'active' }
        });
        if (!membership) throw new AppError('No tienes acceso a este galpón.', 403);

        if (membership.role === 'worker') {
            const { WorkerCage } = require('../../domain/models');
            const workerCages = await WorkerCage.findAll({ where: { farmMemberId: membership.id } });
            const assignedCageIds = workerCages.map(wc => Number(wc.cageId));
            filters.cageIds = assignedCageIds;
        }

        const { limit: limitValue, offset, page: pageValue } = getPaginationParams(page, limit);
        
        const queryOptions = filters.all ? {} : { limit: limitValue, offset };
        
        const feedings = await feedingRepository.findByGalponId(galponId, queryOptions, filters);
        const total = await feedingRepository.countByGalponId(galponId, filters);

        return createPaginatedResponse(feedings, filters.all ? 1 : pageValue, filters.all ? feedings.length : limitValue, total);
    }
}

module.exports = new FeedingService();
