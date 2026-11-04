const vaccinationRepository = require('./vaccination.repository');
const { Galpon, FarmMember } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { validateWorkerAssignedCages, fetchPaginatedGalponRecords } = require('../../common/helpers/repository.helper');

class VaccinationService {
    _getRabbitNameStr(rabbit) {
        return rabbit.name ? ' - ' + rabbit.name : '';
    }

    _validateSingleVaccination(rabbitId, params, vaccinationErrors) {
        const { rabbitMap, assignmentSet, lactatingSet, prevVacMap, vaccinePeriodMap, vaccines, galponId, currentDate } = params;
        
        const rabbit = rabbitMap.get(rabbitId);
        if (!rabbit) {
            vaccinationErrors.push(`El conejo con ID ${rabbitId} no existe.`);
            return;
        }
        if (rabbit.galponId !== galponId) {
            vaccinationErrors.push(`El conejo ${rabbit.code}${this._getRabbitNameStr(rabbit)} no pertenece al galpón activo.`);
            return;
        }
        if (!assignmentSet.has(rabbitId)) {
            vaccinationErrors.push(`El conejo ${rabbit.code}${this._getRabbitNameStr(rabbit)} no está asignado a una jaula.`);
            return;
        }
        if (lactatingSet.has(rabbitId)) {
            vaccinationErrors.push(`El conejo ${rabbit.code}${this._getRabbitNameStr(rabbit)} está en período de lactancia. No se pueden administrar vacunas hasta que finalice esta etapa.`);
            return;
        }

        const rabbitVaccinations = prevVacMap.get(rabbitId) || [];
        
        for (const vaccine of vaccines) {
            const period = vaccinePeriodMap.get(vaccine);
            if (!period) {
                vaccinationErrors.push(`La vacuna "${vaccine}" no está configurada en el galpón activo.`);
                continue;
            }

            const lastVac = rabbitVaccinations.find(v => Array.isArray(v.vaccines) && v.vaccines.includes(vaccine));
            if (lastVac) {
                const lastDate = new Date(lastVac.vaccinationDate);
                const daysSinceLast = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));
                
                if (daysSinceLast < period) {
                    const daysRemaining = period - daysSinceLast;
                    vaccinationErrors.push(
                        `El conejo ${rabbit.code}${this._getRabbitNameStr(rabbit)} no puede recibir la vacuna "${vaccine}" aún. ` +
                        `Última aplicación: ${lastDate.toLocaleDateString('es-EC')}. ` +
                        `Faltan ${daysRemaining} días para cumplir el período de revacunación.`
                    );
                }
            }
        }
    }

    _validateVaccinations(params) {
        const vaccinationErrors = [];
        for (const rabbitId of params.rabbitIds) {
            this._validateSingleVaccination(rabbitId, params, vaccinationErrors);
        }

        if (vaccinationErrors.length > 0) {
            throw new AppError(vaccinationErrors.join('\n'), 400);
        }
    }

    async registerVaccination(data, galponId, profileId) {
        const { rabbitIds, vaccines } = data;
        const { Op } = require('sequelize');
        const { Rabbit, Assignment, Reproduction, Vaccination } = require('../../domain/models');

        // Precarga masiva concurrente en un solo bloque paralelo
        const [membership, galpon, rabbits, assignments, lactatingReps, previousVaccinations] = await Promise.all([
            FarmMember.findOne({
                where: { profileId, galponId, status: 'active' }
            }),
            Galpon.findByPk(galponId),
            Rabbit.findAll({ where: { id: { [Op.in]: rabbitIds } } }),
            Assignment.findAll({ where: { rabbitId: { [Op.in]: rabbitIds }, status: 'asignado' } }),
            Reproduction.findAll({ where: { femaleId: { [Op.in]: rabbitIds }, status: 'lactancia' } }),
            Vaccination.findAll({ 
                where: { rabbitId: { [Op.in]: rabbitIds } },
                order: [['vaccinationDate', 'DESC']]
            })
        ]);

        if (!membership) throw new AppError('No tienes acceso a este galpón.', 403);
        if (!galpon) throw new AppError('Galpón no encontrado.', 404);

        const galponVaccines = galpon.vaccines || [];
        const vaccinePeriodMap = new Map();
        galponVaccines.forEach(v => vaccinePeriodMap.set(v.name, v.period));

        const rabbitMap = new Map();
        rabbits.forEach(r => rabbitMap.set(r.id, r));

        const assignmentSet = new Set(assignments.map(a => a.rabbitId));

        await validateWorkerAssignedCages(
            membership,
            assignments,
            'No tienes permiso para vacunar conejos en jaulas que no tienes asignadas.'
        );

        const lactatingSet = new Set(lactatingReps.map(r => r.femaleId));

        const prevVacMap = new Map(); // rabbitId -> array of vaccinations
        previousVaccinations.forEach(v => {
            if (!prevVacMap.has(v.rabbitId)) prevVacMap.set(v.rabbitId, []);
            prevVacMap.get(v.rabbitId).push(v);
        });

        const currentDate = new Date();

        this._validateVaccinations({ rabbitIds, rabbitMap, assignmentSet, lactatingSet, prevVacMap, vaccinePeriodMap, vaccines, galponId, currentDate });

        const toCreate = rabbitIds.map(rabbitId => ({
            rabbitId,
            vaccines,
            vaccinationDate: new Date(),
            galponId,
            profileId
        }));

        const createdVaccinations = await Promise.all(toCreate.map(data => vaccinationRepository.create(data)));

        const { notifyOwnerOnWorkerAction } = require('../../common/helpers/notification.helper');
        notifyOwnerOnWorkerAction(profileId, galponId, 'vaccination', 'Vacunación', rabbitIds.length, 'conejo')
            .catch(err => console.error('Error notifying owner on vaccination:', err));

        return createdVaccinations;
    }

    async getVaccinations(galponId, profileId, page = 1, limit = 10, filters = {}) {
        return fetchPaginatedGalponRecords(vaccinationRepository, galponId, profileId, page, limit, filters);
    }

    async getGalponVaccines(galponId) {
        const galpon = await Galpon.findByPk(galponId);
        if (!galpon) throw new AppError('Galpón no encontrado.', 404);
        return galpon.vaccines || [];
    }

    async getVaccinationsByRabbit(rabbitId) {
        return vaccinationRepository.findByRabbitId(rabbitId);
    }
}

module.exports = new VaccinationService();
