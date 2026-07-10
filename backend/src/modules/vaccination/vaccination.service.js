const vaccinationRepository = require('./vaccination.repository');
const { Rabbit, Assignment, Galpon, FarmMember } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { getPaginationParams, createPaginatedResponse } = require('../../common/helpers/pagination.helper');

class VaccinationService {
    _getRabbitNameStr(rabbit) {
        return rabbit.name ? ' — ' + rabbit.name : '';
    }

    async _validateSingleRabbitForVaccination(rabbitId, galponId, vaccines, vaccinePeriodMap, vaccinationErrors) {
        const rabbit = await Rabbit.findByPk(rabbitId);
        if (!rabbit) {
            vaccinationErrors.push(`El conejo con ID ${rabbitId} no existe.`);
            return;
        }
        if (rabbit.galponId !== galponId) {
            vaccinationErrors.push(`El conejo ${rabbit.code}${this._getRabbitNameStr(rabbit)} no pertenece al galpón activo.`);
            return;
        }

        const assignment = await Assignment.findOne({ where: { rabbitId, status: 'asignado' } });
        if (!assignment) {
            vaccinationErrors.push(`El conejo ${rabbit.code}${this._getRabbitNameStr(rabbit)} no está asignado a una jaula.`);
            return;
        }

        const { Reproduction } = require('../../domain/models');
        const lactating = await Reproduction.findOne({ where: { femaleId: rabbitId, status: 'lactancia' } });
        if (lactating) {
            vaccinationErrors.push(`El conejo ${rabbit.code}${this._getRabbitNameStr(rabbit)} está en período de lactancia. No se pueden administrar vacunas hasta que finalice esta etapa, verifique en el módulo de Reproducción y Partos.`);
            return;
        }

        for (const vaccine of vaccines) {
            const period = vaccinePeriodMap.get(vaccine);
            if (!period) {
                vaccinationErrors.push(`La vacuna "${vaccine}" no está configurada en el galpón activo.`);
                break;
            }

            const lastVaccination = await vaccinationRepository.findLastVaccinationByRabbitAndVaccine(rabbitId, vaccine);
            if (lastVaccination) {
                const lastDate = new Date(lastVaccination.vaccinationDate);
                const currentDate = new Date();
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

    async registerVaccination(data, galponId, profileId) {
        const { rabbitIds, vaccines } = data;

        const galpon = await Galpon.findByPk(galponId);
        if (!galpon) throw new AppError('Galpón no encontrado.', 404);

        const galponVaccines = galpon.vaccines || [];
        const vaccinePeriodMap = new Map();
        galponVaccines.forEach(v => {
            vaccinePeriodMap.set(v.name, v.period);
        });

        const vaccinationErrors = [];

        // Primero validar todos los conejos antes de registrar
        for (const rabbitId of rabbitIds) {
            await this._validateSingleRabbitForVaccination(rabbitId, galponId, vaccines, vaccinePeriodMap, vaccinationErrors);
        }

        // Si hay errores, no registrar nada
        if (vaccinationErrors.length > 0) {
            throw new AppError(vaccinationErrors.join('\n'), 400);
        }

        // Si todos pasan la validación, registrar todos
        const createdVaccinations = [];
        for (const rabbitId of rabbitIds) {
            const vaccination = await vaccinationRepository.create({
                rabbitId,
                vaccines,
                vaccinationDate: new Date(),
                galponId,
                profileId
            });
            createdVaccinations.push(vaccination);
        }

        const { notifyOwnerOnWorkerAction } = require('../../common/helpers/notification.helper');
        await notifyOwnerOnWorkerAction(profileId, galponId, 'vaccination', 'Vacunación');

        return createdVaccinations;
    }

    async getVaccinations(galponId, profileId, page = 1, limit = 10, filters = {}) {
        if (!galponId) return createPaginatedResponse([], page, limit, 0);

        // Verificar que el usuario tiene acceso al galpón
        const membership = await FarmMember.findOne({
            where: { profileId, galponId, status: 'active' }
        });
        if (!membership) throw new AppError('No tienes acceso a este galpón.', 403);

        const { limit: limitValue, offset, page: pageValue } = getPaginationParams(page, limit);
        
        const queryOptions = filters.all ? {} : { limit: limitValue, offset };
        
        const vaccinations = await vaccinationRepository.findByGalponId(galponId, queryOptions, filters);
        const total = await vaccinationRepository.countByGalponId(galponId, filters);

        return createPaginatedResponse(vaccinations, filters.all ? 1 : pageValue, filters.all ? vaccinations.length : limitValue, total);
    }

    async getVaccinationsByRabbit(rabbitId) {
        return vaccinationRepository.findByRabbitId(rabbitId);
    }
}

module.exports = new VaccinationService();
