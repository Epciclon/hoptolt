const vaccinationRepository = require('./vaccination.repository');
const { Rabbit, Assignment, Galpon, FarmMember } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { getPaginationParams, createPaginatedResponse } = require('../../common/helpers/pagination.helper');

class VaccinationService {
    async registerVaccination(data, galponId) {
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
            const rabbit = await Rabbit.findByPk(rabbitId);
            if (!rabbit) {
                vaccinationErrors.push(`El conejo con ID ${rabbitId} no existe.`);
                continue;
            }
            if (rabbit.galponId !== galponId) {
                vaccinationErrors.push(`El conejo ${rabbit.code}${rabbit.name ? ` — ${rabbit.name}` : ''} no pertenece al galpón activo.`);
                continue;
            }

            const assignment = await Assignment.findOne({
                where: { rabbitId, status: 'asignado' }
            });
            if (!assignment) {
                vaccinationErrors.push(`El conejo ${rabbit.code}${rabbit.name ? ` — ${rabbit.name}` : ''} no está asignado a una jaula.`);
                continue;
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
                            `El conejo ${rabbit.code}${rabbit.name ? ` — ${rabbit.name}` : ''} no puede recibir la vacuna "${vaccine}" aún. ` +
                            `Última aplicación: ${lastDate.toLocaleDateString('es-EC')}. ` +
                            `Faltan ${daysRemaining} días para cumplir el período de revacunación.`
                        );
                    }
                }
            }
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
                galponId
            });
            createdVaccinations.push(vaccination);
        }

        return createdVaccinations;
    }

    async getVaccinations(galponId, profileId, page = 1, limit = 10) {
        if (!galponId) return createPaginatedResponse([], page, limit, 0);

        // Verificar que el usuario tiene acceso al galpón
        const membership = await FarmMember.findOne({
            where: { profileId, galponId, status: 'active' }
        });
        if (!membership) throw new AppError('No tienes acceso a este galpón.', 403);

        const { limit: limitValue, offset, page: pageValue } = getPaginationParams(page, limit);
        const vaccinations = await vaccinationRepository.findByGalponId(galponId, { limit: limitValue, offset });
        const total = await vaccinationRepository.countByGalponId(galponId);

        return createPaginatedResponse(vaccinations, pageValue, limitValue, total);
    }

    async getVaccinationsByRabbit(rabbitId) {
        return vaccinationRepository.findByRabbitId(rabbitId);
    }
}

module.exports = new VaccinationService();
