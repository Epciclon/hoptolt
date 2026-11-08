const mortalityRepository = require('./mortality.repository');
const { Rabbit, FarmMember, Assignment } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { getPaginationParams, createPaginatedResponse } = require('../../common/helpers/pagination.helper');

class MortalityService {
    async registerMortality(data, galponId, profileId) {
        const { rabbitId, cause, observations, deathDate, isKits, numberOfKits } = data;

        const { Profile } = require('../../domain/models');

        const [profile, membership, rabbit] = await Promise.all([
            Profile.findByPk(profileId),
            FarmMember.findOne({
                where: { profileId, galponId, status: 'active' }
            }),
            Rabbit.findByPk(rabbitId, isKits ? { paranoid: false } : undefined)
        ]);

        if (!profile) throw new AppError('Usuario no encontrado.', 404);
        if (!membership) throw new AppError('No tienes acceso a este galpón.', 403);
        if (!rabbit) throw new AppError(`El conejo con ID ${rabbitId} no existe.`, 404);
        if (rabbit.galponId !== galponId) throw new AppError(`El conejo con ID ${rabbitId} no pertenece al galpón activo.`, 400);

        if (membership.role === 'worker') {
            const { WorkerCage } = require('../../domain/models');
            const [workerCages, activeAssignment] = await Promise.all([
                WorkerCage.findAll({ where: { farmMemberId: membership.id } }),
                Assignment.findOne({ where: { rabbitId, status: 'asignado' } })
            ]);
            const resolvedAssignment = activeAssignment || (isKits
                ? await Assignment.findOne({ where: { rabbitId }, order: [['id', 'DESC']] })
                : null);
            const assignedCageIds = new Set(workerCages.map(wc => Number(wc.cageId)));

            if (!resolvedAssignment || !assignedCageIds.has(Number(resolvedAssignment.cageId))) {
                throw new AppError('No tienes permiso para registrar mortalidad de un conejo que no esté en tus jaulas asignadas.', 403);
            }
        }

        // Inyectar hora actual a la fecha de muerte
        const now = new Date();
        const dateStr = deathDate ? String(deathDate).split('T')[0] : null;
        const [y, m, d] = dateStr ? dateStr.split('-') : [now.getFullYear(), now.getMonth() + 1, now.getDate()];
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

        let result;
        if (isKits) {
            result = await this._processKitsMortality(rabbitId, cause, observations, dDate, numberOfKits, galponId, profileId);
        } else {
            result = await this._processAdultMortality(rabbit, rabbitId, cause, observations, dDate, galponId, profileId);
        }

        const deathCount = isKits ? (Number(numberOfKits) || 1) : 1;
        const { notifyOwnerOnWorkerAction } = require('../../common/helpers/notification.helper');
        notifyOwnerOnWorkerAction(profileId, galponId, 'mortality', 'Mortalidad', deathCount, 'caso')
            .catch(err => console.error('Error notifying owner on mortality:', err));

        return result;
    }

    async _processKitsMortality(rabbitId, cause, observations, dDate, numberOfKits, galponId, profileId) {
        if (!numberOfKits || numberOfKits <= 0) throw new AppError('Debe especificar un número válido de gazapos.', 400);
        
        const { Reproduction, Mortality } = require('../../domain/models');
        const { Op } = require('sequelize');

        const activeLactation = await Reproduction.findOne({
            where: { femaleId: rabbitId, status: 'lactancia' }
        });

        if (activeLactation && activeLactation.bornKits !== null && (activeLactation.bornKits - numberOfKits <= 0)) {
            const previousMortalities = await Mortality.findAll({
                where: { rabbitId, isKits: true, createdAt: { [Op.gte]: activeLactation.mountDate } }
            });
            const previousDeadKits = previousMortalities.reduce((acc, curr) => acc + curr.numberOfKits, 0);
            const originalBornKits = activeLactation.bornKits + previousDeadKits;
            
            activeLactation.bornKits = originalBornKits;
            activeLactation.status = 'fallido';
            activeLactation.cancellationReason = `Mortalidad total de la camada (Causa: ${cause.trim()})`;
            activeLactation.updatedBySystem = false;
            activeLactation.profileId = profileId;

            await Promise.all([
                Mortality.destroy({
                    where: { rabbitId, isKits: true, createdAt: { [Op.gte]: activeLactation.mountDate } }
                }),
                activeLactation.save()
            ]);
            
            return { id: 'merged_total_mortality', rabbitId, cause, observations, deathDate: dDate, isKits: true, numberOfKits: originalBornKits };
        }

        const [mortality] = await Promise.all([
            mortalityRepository.create({
                rabbitId, cause: cause.trim(), observations: observations ? observations.trim() : null,
                deathDate: dDate, isKits: true, numberOfKits, galponId, profileId
            }),
            (activeLactation && activeLactation.bornKits !== null)
                ? (() => {
                    activeLactation.bornKits = Math.max(0, activeLactation.bornKits - numberOfKits);
                    return activeLactation.save();
                })()
                : Promise.resolve()
        ]);

        return mortality;
    }

    async _cleanupActiveFemaleReproduction(rabbit, rabbitId, profileId) {
        if (rabbit.sex !== 'hembra') return;
        const { Reproduction } = require('../../domain/models');
        const { Op } = require('sequelize');
        if (typeof Reproduction?.findOne !== 'function') return;

        const activeRep = await Reproduction.findOne({
            where: {
                femaleId: rabbitId,
                status: { [Op.in]: ['monta', 'gestacion'] }
            }
        });
        if (!activeRep) return;

        if (activeRep.status === 'monta' && typeof activeRep.destroy === 'function') {
            await activeRep.destroy();
        } else if (typeof activeRep.update === 'function') {
            await activeRep.update({
                status: 'fallido',
                cancellationReason: 'Baja de la madre registrada en Mortalidad',
                profileId,
                updatedBySystem: false
            });
        }
    }

    async _processAdultMortality(rabbit, rabbitId, cause, observations, dDate, galponId, profileId) {
        const { Assignment } = require('../../domain/models');

        const [assignment, mortality] = await Promise.all([
            Assignment.findOne({ where: { rabbitId, status: 'asignado' } }),
            mortalityRepository.create({
                rabbitId, cause: cause.trim(), observations: observations ? observations.trim() : null,
                deathDate: dDate, isKits: false, galponId, profileId
            })
        ]);

        await Promise.all([
            assignment ? assignment.update({ status: 'liberado' }) : Promise.resolve(),
            this._cleanupActiveFemaleReproduction(rabbit, rabbitId, profileId),
            rabbit.destroy()
        ]);

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
        
        const [mortalities, total] = await Promise.all([
            mortalityRepository.findByGalponId(galponId, queryOptions, filterProfileId, isKits, filters),
            mortalityRepository.countByGalponId(galponId, filterProfileId, isKits, filters)
        ]);

        return createPaginatedResponse(mortalities, filters.all ? 1 : pageValue, filters.all ? mortalities.length : limitValue, total);
    }
}

module.exports = new MortalityService();
