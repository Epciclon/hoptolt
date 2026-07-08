const dewormingRepository = require('./deworming.repository');
const { Rabbit, Assignment, Galpon, FarmMember } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { getPaginationParams, createPaginatedResponse } = require('../../common/helpers/pagination.helper');

class DewormingService {
    async registerDeworming(data, galponId, profileId) {
        const { rabbitIds } = data;

        const galpon = await Galpon.findByPk(galponId);
        if (!galpon) throw new AppError('Galpón no encontrado.', 404);

        const dewormingPeriod = galpon.dewormingPeriod || 30;

        const dewormingErrors = [];

        for (const rabbitId of rabbitIds) {
            await this._validateRabbitForDeworming(rabbitId, galponId, dewormingPeriod, dewormingErrors);
        }

        // Si hay errores, no registrar nada
        if (dewormingErrors.length > 0) {
            throw new AppError(dewormingErrors.join('\n'), 400);
        }

        // Si todos pasan la validación, registrar todos
        const createdDewormings = [];
        for (const rabbitId of rabbitIds) {
            const deworming = await dewormingRepository.create({
                rabbitId,
                dewormingDate: new Date(),
                galponId,
                profileId
            });
            createdDewormings.push(deworming);
        }

        return createdDewormings;
    }

    async _validateRabbitForDeworming(rabbitId, galponId, dewormingPeriod, dewormingErrors) {
        const rabbit = await Rabbit.findByPk(rabbitId);
        if (!rabbit) {
            dewormingErrors.push(`El conejo con ID ${rabbitId} no existe.`);
            return;
        }
        
        const nameSuffix = rabbit.name ? ' — ' + rabbit.name : '';
        if (rabbit.galponId !== galponId) {
            dewormingErrors.push(`El conejo ${rabbit.code}${nameSuffix} no pertenece al galpón activo.`);
            return;
        }

        const assignment = await Assignment.findOne({
            where: { rabbitId, status: 'asignado' }
        });
        if (!assignment) {
            dewormingErrors.push(`El conejo ${rabbit.code}${nameSuffix} no está asignado a una jaula.`);
            return;
        }

        const lastDeworming = await dewormingRepository.findLastDewormingByRabbit(rabbitId);
        if (lastDeworming) {
            const lastDate = new Date(lastDeworming.dewormingDate);
            const currentDate = new Date();
            const daysSinceLast = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));
            
            if (daysSinceLast < dewormingPeriod) {
                const daysRemaining = dewormingPeriod - daysSinceLast;
                dewormingErrors.push(
                    `El conejo ${rabbit.code}${nameSuffix} no puede recibir desparasitación aún. ` +
                    `Última aplicación: ${lastDate.toLocaleDateString('es-EC')}. ` +
                    `Faltan ${daysRemaining} días para cumplir el período de desparasitación.`
                );
            }
        }
    }

    async getDewormings(galponId, profileId, page = 1, limit = 10, filters = {}) {
        if (!galponId) return createPaginatedResponse([], page, limit, 0);

        // Verificar que el usuario tiene acceso al galpón
        const membership = await FarmMember.findOne({
            where: { profileId, galponId, status: 'active' }
        });
        if (!membership) throw new AppError('No tienes acceso a este galpón.', 403);

        const { limit: limitValue, offset, page: pageValue } = getPaginationParams(page, limit);
        
        const queryOptions = filters.all ? {} : { limit: limitValue, offset };
        
        const dewormings = await dewormingRepository.findByGalponId(galponId, queryOptions, filters);
        const total = await dewormingRepository.countByGalponId(galponId, filters);

        return createPaginatedResponse(dewormings, filters.all ? 1 : pageValue, filters.all ? dewormings.length : limitValue, total);
    }

    async getDewormingsByRabbit(rabbitId) {
        return dewormingRepository.findByRabbitId(rabbitId);
    }
}

module.exports = new DewormingService();
