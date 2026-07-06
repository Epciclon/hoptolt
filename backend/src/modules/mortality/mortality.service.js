const mortalityRepository = require('./mortality.repository');
const { Rabbit, FarmMember, Assignment } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { getPaginationParams, createPaginatedResponse } = require('../../common/helpers/pagination.helper');

class MortalityService {
    async registerMortality(data, galponId, profileId) {
        const { rabbitId, cause, observations, deathDate, isKits, numberOfKits } = data;

        const { Rabbit, Assignment, Profile } = require('../../domain/models');

        const profile = await Profile.findByPk(profileId);
        if (!profile) throw new AppError('Usuario no encontrado.', 404);

        const rabbit = await Rabbit.findByPk(rabbitId);
        if (!rabbit) throw new AppError(`El conejo con ID ${rabbitId} no existe.`, 404);
        if (rabbit.galponId !== galponId) throw new AppError(`El conejo con ID ${rabbitId} no pertenece al galpón activo.`, 400);

        // Inyectar hora actual a la fecha de muerte
        const now = new Date();
        const [y, m, d] = deathDate ? deathDate.split('-') : [now.getFullYear(), now.getMonth() + 1, now.getDate()];
        const dDate = new Date(Number(y), Number(m) - 1, Number(d), now.getHours(), now.getMinutes(), now.getSeconds());

        const bDate = new Date(rabbit.birthDate);
        const today = new Date();

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

        if (isKits) {
            if (!numberOfKits || numberOfKits <= 0) throw new AppError('Debe especificar un número válido de gazapos.', 400);
            
            const { Reproduction, Mortality } = require('../../domain/models');
            const { Op } = require('sequelize');

            const activeLactation = await Reproduction.findOne({
                where: { femaleId: rabbitId, status: 'lactancia' }
            });

            if (activeLactation && activeLactation.bornKits !== null && (activeLactation.bornKits - numberOfKits <= 0)) {
                // If this mortality wipes out the entire litter, aggregate it all into a single "fallido" record
                const previousMortalities = await Mortality.findAll({
                    where: {
                        rabbitId,
                        isKits: true,
                        createdAt: { [Op.gte]: activeLactation.mountDate }
                    }
                });
                
                const previousDeadKits = previousMortalities.reduce((acc, curr) => acc + curr.numberOfKits, 0);
                const originalBornKits = activeLactation.bornKits + previousDeadKits;
                
                await Mortality.destroy({
                    where: {
                        rabbitId,
                        isKits: true,
                        createdAt: { [Op.gte]: activeLactation.mountDate }
                    }
                });

                activeLactation.bornKits = originalBornKits;
                activeLactation.status = 'fallido';
                activeLactation.cancellationReason = `Mortalidad total de la camada (Causa: ${cause.trim()})`;
                await activeLactation.save();
                
                return { id: 'merged_total_mortality', rabbitId, cause, observations, deathDate: dDate, isKits: true, numberOfKits: originalBornKits };
            }

            // Normal partial mortality
            const mortality = await mortalityRepository.create({
                rabbitId,
                cause: cause.trim(),
                observations: observations ? observations.trim() : null,
                deathDate: dDate,
                isKits: true,
                numberOfKits,
                galponId,
                profileId
            });

            if (activeLactation && activeLactation.bornKits !== null) {
                activeLactation.bornKits = Math.max(0, activeLactation.bornKits - numberOfKits);
                await activeLactation.save();
            }

            return mortality;
        }

        // --- Lógica para adulto ---
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
            isKits: false,
            galponId,
            profileId
        });

        // 3. Aplicar borrado lógico al adulto
        await rabbit.destroy();

        return mortality;
    }

    async getMortalities(galponId, profileId, page = 1, limit = 10, isKits = null, filters = {}) {
        if (!galponId) return createPaginatedResponse([], page, limit, 0);

        // Verificar que el usuario tiene acceso al galpón
        const membership = await FarmMember.findOne({
            where: { profileId, galponId, status: 'active' }
        });
        if (!membership) throw new AppError('No tienes acceso a este galpón.', 403);

        // Si es trabajador, filtrar por su profileId (a menos que estemos pidiendo un reporte sin workerId específico)
        const filterProfileId = membership.role === 'worker' ? profileId : null;

        const { limit: limitValue, offset, page: pageValue } = getPaginationParams(page, limit);
        
        const queryOptions = filters.all ? {} : { limit: limitValue, offset };
        
        const mortalities = await mortalityRepository.findByGalponId(galponId, queryOptions, filterProfileId, isKits, filters);
        const total = await mortalityRepository.countByGalponId(galponId, filterProfileId, isKits, filters);

        return createPaginatedResponse(mortalities, filters.all ? 1 : pageValue, filters.all ? mortalities.length : limitValue, total);
    }
}

module.exports = new MortalityService();
