const dewormingRepository = require('./deworming.repository');
const { Rabbit, Assignment, Galpon, FarmMember } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { getPaginationParams, createPaginatedResponse } = require('../../common/helpers/pagination.helper');

class DewormingService {
    _validateSingleDeworming(rabbitId, params, dewormingErrors) {
        const { rabbitMap, assignmentSet, lactatingSet, prevDewMap, galponId, dewormingPeriod, currentDate } = params;
        
        const rabbit = rabbitMap.get(rabbitId);
        if (!rabbit) {
            dewormingErrors.push(`El conejo con ID ${rabbitId} no existe.`);
            return;
        }
        
        const nameSuffix = rabbit.name ? ' - ' + rabbit.name : '';
        if (rabbit.galponId !== galponId) {
            dewormingErrors.push(`El conejo ${rabbit.code}${nameSuffix} no pertenece al galpón activo.`);
            return;
        }

        if (!assignmentSet.has(rabbitId)) {
            dewormingErrors.push(`El conejo ${rabbit.code}${nameSuffix} no está asignado a una jaula.`);
            return;
        }

        if (lactatingSet.has(rabbitId)) {
            dewormingErrors.push(`El conejo ${rabbit.code}${nameSuffix} está en período de lactancia. No se puede administrar desparasitante hasta que finalice esta etapa, verifique en el módulo de Reproducción y Partos.`);
            return;
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

    _validateDewormings(params) {
        const dewormingErrors = [];
        for (const rabbitId of params.rabbitIds) {
            this._validateSingleDeworming(rabbitId, params, dewormingErrors);
        }
        if (dewormingErrors.length > 0) {
            throw new AppError(dewormingErrors.join('\n'), 400);
        }
    }

    async registerDeworming(data, galponId, profileId) {
        const { rabbitIds } = data;
        const { Op } = require('sequelize');
        const { Rabbit, Assignment, Reproduction, Deworming, WorkerCage } = require('../../domain/models');

        // Precarga masiva concurrente en un solo bloque paralelo
        const [membership, galpon, rabbits, assignments, lactatingReps, previousDewormings] = await Promise.all([
            FarmMember.findOne({
                where: { profileId, galponId, status: 'active' }
            }),
            Galpon.findByPk(galponId),
            Rabbit.findAll({ where: { id: { [Op.in]: rabbitIds } } }),
            Assignment.findAll({ where: { rabbitId: { [Op.in]: rabbitIds }, status: 'asignado' } }),
            Reproduction.findAll({ where: { femaleId: { [Op.in]: rabbitIds }, status: 'lactancia' } }),
            Deworming.findAll({
                where: { rabbitId: { [Op.in]: rabbitIds } },
                order: [['dewormingDate', 'DESC']]
            })
        ]);

        if (!membership) throw new AppError('No tienes acceso a este galpón.', 403);
        if (!galpon) throw new AppError('Galpón no encontrado.', 404);

        const dewormingPeriod = galpon.dewormingPeriod || 30;

        const rabbitMap = new Map();
        rabbits.forEach(r => rabbitMap.set(r.id, r));

        const assignmentSet = new Set(assignments.map(a => a.rabbitId));

        // Si es trabajador, validar que todas las jaulas de los conejos estén asignadas a él
        if (membership.role === 'worker') {
            const workerCages = await WorkerCage.findAll({ where: { farmMemberId: membership.id } });
            const assignedCageIds = new Set(workerCages.map(wc => Number(wc.cageId)));
            for (const assignment of assignments) {
                if (!assignedCageIds.has(Number(assignment.cageId))) {
                    throw new AppError('No tienes permiso para desparasitar conejos en jaulas que no tienes asignadas.', 403);
                }
            }
        }

        const lactatingSet = new Set(lactatingReps.map(r => r.femaleId));

        const prevDewMap = new Map();
        previousDewormings.forEach(d => {
            if (!prevDewMap.has(d.rabbitId)) prevDewMap.set(d.rabbitId, d); // Solo necesitamos el último (por DESC)
        });

        const currentDate = new Date();

        this._validateDewormings({ rabbitIds, rabbitMap, assignmentSet, lactatingSet, prevDewMap, galponId, dewormingPeriod, currentDate });

        // Si todos pasan la validación, registrar todos concurrentemente
        const toCreate = rabbitIds.map(rabbitId => ({
            rabbitId,
            dewormingDate: new Date(),
            galponId,
            profileId
        }));
        
        const createdDewormings = await Promise.all(toCreate.map(data => dewormingRepository.create(data)));

        const { notifyOwnerOnWorkerAction } = require('../../common/helpers/notification.helper');
        notifyOwnerOnWorkerAction(profileId, galponId, 'deworming', 'Desparasitación', rabbitIds.length, 'conejo')
            .catch(err => console.error('Error notifying owner on deworming:', err));

        return createdDewormings;
    }

    async getDewormings(galponId, profileId, page = 1, limit = 10, filters = {}) {
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

        const { limit: limitValue, offset } = getPaginationParams(page, limit);
        
        const queryOptions = filters.all ? {} : { limit: limitValue, offset };
        
        const [dewormings, count] = await Promise.all([
            dewormingRepository.findByGalponId(galponId, queryOptions, filters),
            filters.all ? Promise.resolve(0) : dewormingRepository.countByGalponId(galponId, filters)
        ]);

        return createPaginatedResponse(dewormings, page, limit, filters.all ? dewormings.length : count);
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
