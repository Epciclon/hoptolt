const dewormingRepository = require('./deworming.repository');
const { Galpon, FarmMember } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { validateWorkerAssignedCages, fetchPaginatedGalponRecords } = require('../../common/helpers/repository.helper');

class DewormingService {
    _validateSingleDeworming(rabbitId, params, dewormingErrors) {
        const { rabbitMap, assignmentSet, lactatingSet, prevDewMap, galponId, dewormingPeriod, currentDate } = params;
        
        const rabbit = rabbitMap.get(rabbitId);
        if (!rabbit) {
            dewormingErrors.push(`El conejo con ID ${rabbitId} no existe.`);
            return;
        }
        
        const rabbitLabel = rabbit.name ? `${rabbit.name} - ${rabbit.code}` : rabbit.code;
        if (rabbit.galponId !== galponId) {
            dewormingErrors.push(`El conejo ${rabbitLabel} no pertenece al galpón activo.`);
            return;
        }

        if (!assignmentSet.has(rabbitId)) {
            dewormingErrors.push(`El conejo ${rabbitLabel} no está asignado a una jaula.`);
            return;
        }

        if (lactatingSet.has(rabbitId)) {
            dewormingErrors.push(`El conejo ${rabbitLabel} está en período de lactancia. No se puede administrar desparasitante hasta que finalice esta etapa, verifique en el módulo de Reproducción y Partos.`);
            return;
        }

        const lastDeworming = prevDewMap.get(rabbitId);
        if (lastDeworming) {
            const lastDate = new Date(lastDeworming.dewormingDate);
            const daysSinceLast = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));
            
            if (daysSinceLast < dewormingPeriod) {
                const daysRemaining = dewormingPeriod - daysSinceLast;
                dewormingErrors.push(
                    `El conejo ${rabbitLabel} no puede recibir desparasitación aún. ` +
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
        const { Rabbit, Assignment, Reproduction, Deworming } = require('../../domain/models');

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

        await validateWorkerAssignedCages(
            membership,
            assignments,
            'No tienes permiso para desparasitar conejos en jaulas que no tienes asignadas.'
        );

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
        return fetchPaginatedGalponRecords(dewormingRepository, galponId, profileId, page, limit, filters);
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
