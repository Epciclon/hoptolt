const dewormingRepository = require('./deworming.repository');
const { Rabbit, Assignment, Galpon, FarmMember } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { getPaginationParams, createPaginatedResponse } = require('../../common/helpers/pagination.helper');

class DewormingService {
    async registerDeworming(data, galponId, profileId) {
        const { rabbitIds } = data;
        const { Op } = require('sequelize');
        const { Rabbit, Assignment, Reproduction, Deworming } = require('../../domain/models');

        const galpon = await Galpon.findByPk(galponId);
        if (!galpon) throw new AppError('Galpón no encontrado.', 404);

        const dewormingPeriod = galpon.dewormingPeriod || 30;
        const dewormingErrors = [];

        // Precarga masiva en batch para evitar N+1
        const rabbits = await Rabbit.findAll({ where: { id: { [Op.in]: rabbitIds } } });
        const rabbitMap = new Map();
        rabbits.forEach(r => rabbitMap.set(r.id, r));

        const assignments = await Assignment.findAll({ where: { rabbitId: { [Op.in]: rabbitIds }, status: 'asignado' } });
        const assignmentSet = new Set(assignments.map(a => a.rabbitId));

        const lactatingReps = await Reproduction.findAll({ where: { femaleId: { [Op.in]: rabbitIds }, status: 'lactancia' } });
        const lactatingSet = new Set(lactatingReps.map(r => r.femaleId));

        const previousDewormings = await Deworming.findAll({
            where: { rabbitId: { [Op.in]: rabbitIds } },
            order: [['dewormingDate', 'DESC']]
        });
        const prevDewMap = new Map();
        previousDewormings.forEach(d => {
            if (!prevDewMap.has(d.rabbitId)) prevDewMap.set(d.rabbitId, d); // Solo necesitamos el último (por DESC)
        });

        const currentDate = new Date();

        // Validación en memoria
        for (const rabbitId of rabbitIds) {
            const rabbit = rabbitMap.get(rabbitId);
            if (!rabbit) {
                dewormingErrors.push(`El conejo con ID ${rabbitId} no existe.`);
                continue;
            }
            
            const nameSuffix = rabbit.name ? ' — ' + rabbit.name : '';
            if (rabbit.galponId !== galponId) {
                dewormingErrors.push(`El conejo ${rabbit.code}${nameSuffix} no pertenece al galpón activo.`);
                continue;
            }

            if (!assignmentSet.has(rabbitId)) {
                dewormingErrors.push(`El conejo ${rabbit.code}${nameSuffix} no está asignado a una jaula.`);
                continue;
            }

            if (lactatingSet.has(rabbitId)) {
                dewormingErrors.push(`El conejo ${rabbit.code}${nameSuffix} está en período de lactancia. No se puede administrar desparasitante hasta que finalice esta etapa, verifique en el módulo de Reproducción y Partos.`);
                continue;
            }

            const lastDeworming = prevDewMap.get(rabbitId);
            if (lastDeworming) {
                const lastDate = new Date(lastDeworming.dewormingDate);
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

        // Si hay errores, no registrar nada
        if (dewormingErrors.length > 0) {
            throw new AppError(dewormingErrors.join('\n'), 400);
        }

        // Si todos pasan la validación, registrar todos concurrentemente
        const toCreate = rabbitIds.map(rabbitId => ({
            rabbitId,
            dewormingDate: new Date(),
            galponId,
            profileId
        }));
        
        const createdDewormings = await Promise.all(toCreate.map(data => dewormingRepository.create(data)));

        const { notifyOwnerOnWorkerAction } = require('../../common/helpers/notification.helper');
        await notifyOwnerOnWorkerAction(profileId, galponId, 'deworming', 'Desparasitación');

        return createdDewormings;
    }

    async getDewormings(galponId, profileId, page = 1, limit = 10, filters = {}) {
        if (!galponId) return createPaginatedResponse([], page, limit, 0);

        // Verificar que el usuario tiene acceso al galpón
        const membership = await FarmMember.findOne({
            where: { profileId, galponId, status: 'active' }
        });
        if (!membership) throw new AppError('No tienes acceso a este galpón.', 403);

        const { limit: limitValue, offset } = getPaginationParams(page, limit);
        
        const queryOptions = filters.all ? {} : { limit: limitValue, offset };
        
        const dewormings = await dewormingRepository.findByGalponId(galponId, queryOptions, filters);
        const count = filters.all ? dewormings.length : await dewormingRepository.countByGalponId(galponId, filters);

        return createPaginatedResponse(dewormings, page, limit, count);
    }

    async getGalponDewormingPeriod(galponId) {
        const galpon = await Galpon.findByPk(galponId);
        if (!galpon) throw new AppError('Galpón no encontrado.', 404);
        return galpon.dewormingPeriod || 30;
    }

    async getDewormingsByRabbit(rabbitId) {
        return dewormingRepository.findByRabbitId(rabbitId);
    }
}

module.exports = new DewormingService();
