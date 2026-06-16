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

    async registerFeeding(data, galponId) {
        const { cageIds, foodTypes, justification } = data;

        // Obtener fecha y hora actual en zona horaria de Ecuador (GMT-5)
        const now = new Date();
        const ecuadorTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
        
        const createdFeedings = [];

        for (const cageId of cageIds) {
            const cage = await Cage.findByPk(cageId);
            if (!cage) throw new AppError(`La jaula con ID ${cageId} no existe.`, 404);
            if (cage.galponId !== galponId) throw new AppError(`La jaula con ID ${cageId} no pertenece al galpón activo.`, 400);

            // Obtener conejos asignados a esta jaula
            const assignments = await Assignment.findAll({
                where: { cageId, status: 'asignado' }
            });

            if (assignments.length === 0) {
                throw new AppError(`La jaula con ID ${cageId} no tiene conejos asignados.`, 400);
            }

            const feedingsToday = await feedingRepository.findByCageIdAndDate(cageId, ecuadorTime);
            
            if (feedingsToday.length >= 2 && !justification) {
                throw new AppError(`La jaula con ID ${cageId} ya tiene 2 registros de alimentación hoy. Se requiere justificación para un tercero.`, 400);
            }

            const feeding = await feedingRepository.create({
                cageId,
                foodTypes,
                justification: justification || null,
                feedingDate: ecuadorTime,
                galponId
            });

            createdFeedings.push(feeding);
        }

        return createdFeedings;
    }

    async getFeedings(galponId, profileId, page = 1, limit = 10) {
        if (!galponId) return createPaginatedResponse([], page, limit, 0);

        // Verificar que el usuario tiene acceso al galpón
        const membership = await FarmMember.findOne({
            where: { profileId, galponId, status: 'active' }
        });
        if (!membership) throw new AppError('No tienes acceso a este galpón.', 403);

        const { limit: limitValue, offset, page: pageValue } = getPaginationParams(page, limit);
        const feedings = await feedingRepository.findByGalponId(galponId, { limit: limitValue, offset });
        const total = await feedingRepository.countByGalponId(galponId);

        return createPaginatedResponse(feedings, pageValue, limitValue, total);
    }
}

module.exports = new FeedingService();
