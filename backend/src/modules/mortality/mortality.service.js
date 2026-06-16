const mortalityRepository = require('./mortality.repository');
const { Rabbit, FarmMember, Assignment } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { getPaginationParams, createPaginatedResponse } = require('../../common/helpers/pagination.helper');

class MortalityService {
    async registerMortality(data, galponId, profileId) {
        const { rabbitId, cause, observations, deathDate } = data;

        const { Rabbit, Assignment, Profile } = require('../../domain/models');

        const profile = await Profile.findByPk(profileId);
        if (!profile) throw new AppError('Usuario no encontrado.', 404);

        const rabbit = await Rabbit.findByPk(rabbitId);
        if (!rabbit) throw new AppError(`El conejo con ID ${rabbitId} no existe.`, 404);
        if (rabbit.galponId !== galponId) throw new AppError(`El conejo con ID ${rabbitId} no pertenece al galpón activo.`, 400);

        const dDate = deathDate ? new Date(deathDate) : new Date();
        const bDate = new Date(rabbit.birthDate);
        const today = new Date();

        // Eliminar horas para comparaciones correctas de fecha
        dDate.setHours(0, 0, 0, 0);
        bDate.setHours(0, 0, 0, 0);
        today.setHours(23, 59, 59, 999);

        if (dDate > today) {
            throw new AppError('La fecha de muerte no puede ser futura.', 400);
        }
        if (dDate < bDate) {
            throw new AppError('La fecha de muerte no puede ser anterior al nacimiento del conejo.', 400);
        }

        if (cause === 'otra' && (!observations || observations.trim() === '')) {
            throw new AppError('Las observaciones son obligatorias cuando la causa es "otra".', 400);
        }

        // 1. Liberar jaula (desasignar conejo)
        const assignment = await Assignment.findOne({
            where: { rabbitId, status: 'asignado' }
        });
        if (assignment) {
            await assignment.update({ status: 'liberado' });
        }

        // 2. Registrar la mortalidad
        const mortality = await mortalityRepository.create({
            rabbitId,
            cause: cause.trim(),
            observations: observations ? observations.trim() : null,
            deathDate: dDate,
            galponId,
            profileId
        });

        // 3. Aplicar borrado lógico
        await rabbit.destroy();

        return mortality;
    }

    async getMortalities(galponId, profileId, page = 1, limit = 10) {
        if (!galponId) return createPaginatedResponse([], page, limit, 0);

        // Verificar que el usuario tiene acceso al galpón
        const membership = await FarmMember.findOne({
            where: { profileId, galponId, status: 'active' }
        });
        if (!membership) throw new AppError('No tienes acceso a este galpón.', 403);

        // Si es trabajador, filtrar por su profileId
        const filterProfileId = membership.role === 'worker' ? profileId : null;

        const { limit: limitValue, offset, page: pageValue } = getPaginationParams(page, limit);
        const mortalities = await mortalityRepository.findByGalponId(galponId, { limit: limitValue, offset }, filterProfileId);
        const total = await mortalityRepository.countByGalponId(galponId, filterProfileId);

        return createPaginatedResponse(mortalities, pageValue, limitValue, total);
    }
}

module.exports = new MortalityService();
