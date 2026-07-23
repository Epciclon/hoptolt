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
        const { Cage, Assignment, Rabbit, Feeding } = require('../../domain/models');

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

        // Precarga de registros existentes (para validación de duplicados en el turno)
        const { startOfDay, endOfDay } = feedingRepository._getEcuadorDayBounds(now);
        const existingFeedings = await Feeding.findAll({
            where: {
                cageId: { [Op.in]: cageIds },
                shift: finalShift,
                profileId,
                feedingDate: { [Op.between]: [startOfDay, endOfDay] }
            },
            attributes: ['cageId']
        });
        const existingCountMap = new Map();
        for (const ef of existingFeedings) {
            existingCountMap.set(ef.cageId, (existingCountMap.get(ef.cageId) || 0) + 1);
        }

        // Validación en memoria
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
                throw new AppError(`Ya tienes un registro de alimentación en el turno de la ${finalShift} para la jaula ${cage.number}. Se requiere justificación.`, 400);
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

        // Inserción concurrente rápida
        const createdFeedings = await Promise.all(toCreate.map(data => feedingRepository.create(data)));

        const { notifyOwnerOnWorkerAction } = require('../../common/helpers/notification.helper');
        await notifyOwnerOnWorkerAction(profileId, galponId, 'feeding', 'Alimentación');

        return createdFeedings;
    }

    async getFeedings(galponId, profileId, page = 1, limit = 10, filters = {}) {
        if (!galponId) return createPaginatedResponse([], page, limit, 0);

        // Verificar que el usuario tiene acceso al galpón
        const membership = await FarmMember.findOne({
            where: { profileId, galponId, status: 'active' }
        });
        if (!membership) throw new AppError('No tienes acceso a este galpón.', 403);

        const { limit: limitValue, offset, page: pageValue } = getPaginationParams(page, limit);
        
        const queryOptions = filters.all ? {} : { limit: limitValue, offset };
        
        const feedings = await feedingRepository.findByGalponId(galponId, queryOptions, filters);
        const total = await feedingRepository.countByGalponId(galponId, filters);

        return createPaginatedResponse(feedings, filters.all ? 1 : pageValue, filters.all ? feedings.length : limitValue, total);
    }
}

module.exports = new FeedingService();
