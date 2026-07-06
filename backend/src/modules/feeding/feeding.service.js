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
        const currentHourEcuador = parseInt(formatter.format(now), 10);
        
        // Si no mandan turno explícito, deducirlo de la hora de Ecuador
        let finalShift = shift;
        if (!finalShift) {
            finalShift = currentHourEcuador < 12 ? 'mañana' : 'tarde';
        }

        const createdFeedings = [];

        for (const cageId of cageIds) {
            const cage = await Cage.findByPk(cageId);
            if (!cage) throw new AppError(`La jaula con ID ${cageId} no existe.`, 404);
            if (cage.galponId !== galponId) throw new AppError(`La jaula con ID ${cageId} no pertenece al galpón activo.`, 400);

            // Obtener conejos asignados a esta jaula
            const { Rabbit } = require('../../domain/models');
            const assignments = await Assignment.findAll({
                where: { cageId, status: 'asignado' },
                include: [{ model: Rabbit, as: 'rabbit', attributes: ['id', 'code', 'name', 'race', 'imageUrl'] }]
            });

            if (assignments.length === 0) {
                throw new AppError(`La jaula con ID ${cageId} no tiene conejos asignados.`, 400);
            }

            const rabbitsSnapshot = assignments.map(a => a.rabbit).filter(Boolean);

            const feedingsByThisUserThisShift = await feedingRepository.countByUniqueAttributes(cageId, now, finalShift, profileId);
            
            if (feedingsByThisUserThisShift >= 1 && !justification) {
                throw new AppError(`Ya tienes un registro de alimentación en el turno de la ${finalShift} para la jaula ${cage.number}. Se requiere justificación.`, 400);
            }

            const feeding = await feedingRepository.create({
                cageId,
                foodTypes,
                justification: justification || null,
                feedingDate: now,
                shift: finalShift,
                galponId,
                profileId,
                rabbitsSnapshot
            });

            createdFeedings.push(feeding);
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

        const { limit: limitValue, offset, page: pageValue } = getPaginationParams(page, limit);
        
        const queryOptions = filters.all ? {} : { limit: limitValue, offset };
        
        const feedings = await feedingRepository.findByGalponId(galponId, queryOptions, filters);
        const total = await feedingRepository.countByGalponId(galponId, filters);

        return createPaginatedResponse(feedings, filters.all ? 1 : pageValue, filters.all ? feedings.length : limitValue, total);
    }
}

module.exports = new FeedingService();
