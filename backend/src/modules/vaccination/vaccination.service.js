const vaccinationRepository = require('./vaccination.repository');
const { Rabbit, Assignment, Galpon, FarmMember } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { getPaginationParams, createPaginatedResponse } = require('../../common/helpers/pagination.helper');

class VaccinationService {
    _getRabbitNameStr(rabbit) {
        return rabbit.name ? ' — ' + rabbit.name : '';
    }



    async registerVaccination(data, galponId, profileId) {
        const { rabbitIds, vaccines } = data;
        const { Op } = require('sequelize');
        const { Rabbit, Assignment, Reproduction, Vaccination } = require('../../domain/models');

        const galpon = await Galpon.findByPk(galponId);
        if (!galpon) throw new AppError('Galpón no encontrado.', 404);

        const galponVaccines = galpon.vaccines || [];
        const vaccinePeriodMap = new Map();
        galponVaccines.forEach(v => vaccinePeriodMap.set(v.name, v.period));

        const vaccinationErrors = [];

        // Precarga masiva en batch para evitar N+1
        const rabbits = await Rabbit.findAll({ where: { id: { [Op.in]: rabbitIds } } });
        const rabbitMap = new Map();
        rabbits.forEach(r => rabbitMap.set(r.id, r));

        const assignments = await Assignment.findAll({ where: { rabbitId: { [Op.in]: rabbitIds }, status: 'asignado' } });
        const assignmentSet = new Set(assignments.map(a => a.rabbitId));

        const lactatingReps = await Reproduction.findAll({ where: { femaleId: { [Op.in]: rabbitIds }, status: 'lactancia' } });
        const lactatingSet = new Set(lactatingReps.map(r => r.femaleId));

        const previousVaccinations = await Vaccination.findAll({ 
            where: { rabbitId: { [Op.in]: rabbitIds } },
            order: [['vaccinationDate', 'DESC']]
        });
        const prevVacMap = new Map(); // rabbitId -> array of vaccinations
        previousVaccinations.forEach(v => {
            if (!prevVacMap.has(v.rabbitId)) prevVacMap.set(v.rabbitId, []);
            prevVacMap.get(v.rabbitId).push(v);
        });

        const currentDate = new Date();

        // Validación en memoria (0 consultas)
        for (const rabbitId of rabbitIds) {
            const rabbit = rabbitMap.get(rabbitId);
            if (!rabbit) {
                vaccinationErrors.push(`El conejo con ID ${rabbitId} no existe.`);
                continue;
            }
            if (rabbit.galponId !== galponId) {
                vaccinationErrors.push(`El conejo ${rabbit.code}${this._getRabbitNameStr(rabbit)} no pertenece al galpón activo.`);
                continue;
            }
            if (!assignmentSet.has(rabbitId)) {
                vaccinationErrors.push(`El conejo ${rabbit.code}${this._getRabbitNameStr(rabbit)} no está asignado a una jaula.`);
                continue;
            }
            if (lactatingSet.has(rabbitId)) {
                vaccinationErrors.push(`El conejo ${rabbit.code}${this._getRabbitNameStr(rabbit)} está en período de lactancia. No se pueden administrar vacunas hasta que finalice esta etapa.`);
                continue;
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

        if (vaccinationErrors.length > 0) {
            throw new AppError(vaccinationErrors.join('\n'), 400);
        }

        const toCreate = rabbitIds.map(rabbitId => ({
            rabbitId,
            vaccines,
            vaccinationDate: new Date(),
            galponId,
            profileId
        }));

        const createdVaccinations = await Promise.all(toCreate.map(data => vaccinationRepository.create(data)));

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

        const { limit: limitValue, offset } = getPaginationParams(page, limit);
        
        const queryOptions = filters.all ? {} : { limit: limitValue, offset };
        
        const vaccinations = await vaccinationRepository.findByGalponId(galponId, queryOptions, filters);
        const count = filters.all ? vaccinations.length : await vaccinationRepository.countByGalponId(galponId, filters);

        return createPaginatedResponse(vaccinations, page, limit, count);
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
