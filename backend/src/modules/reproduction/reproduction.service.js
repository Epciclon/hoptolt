const reproductionRepository = require('./reproduction.repository');
const { Rabbit, Assignment, Cage, FarmMember } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { getPaginationParams, createPaginatedResponse } = require('../../common/helpers/pagination.helper');

class ReproductionService {
    calculateEstimatedBirthDate(mountDate) {
        // mountDate es un string "YYYY-MM-DD"
        const date = new Date(mountDate + 'T00:00:00-05:00');
        date.setDate(date.getDate() + 30);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    async registerReproduction(data, galponId) {
        const { femaleId, maleId, mountDate } = data;

        const female = await Rabbit.findByPk(femaleId);
        if (!female) throw new AppError(`La coneja con ID ${femaleId} no existe.`, 404);
        if (female.galponId !== galponId) throw new AppError(`La coneja ${female.code}${female.name ? ` — ${female.name}` : ''} no pertenece al galpón activo.`, 400);

        if (female.sex !== 'hembra') {
            throw new AppError(`El ID ${femaleId} no corresponde a una hembra.`, 400);
        }

        const assignment = await Assignment.findOne({
            where: { rabbitId: femaleId, status: 'asignado' }
        });
        if (!assignment) {
            throw new AppError(`La coneja ${female.code}${female.name ? ` — ${female.name}` : ''} no tiene jaula asignada.`, 400);
        }

        const cage = await Cage.findByPk(assignment.cageId);
        if (!cage) {
            throw new AppError('Jaula no encontrada.', 404);
        }
        if (cage.type !== 'reproducción') {
            throw new AppError(`La coneja ${female.code}${female.name ? ` — ${female.name}` : ''} está en una jaula de ${cage.type}, no de reproducción.`, 400);
        }

        const activeMount = await reproductionRepository.findActiveMountByFemaleId(femaleId);
        if (activeMount) {
            const ed = activeMount.estimatedBirthDate;
            const formattedDate = typeof ed === 'string' && ed.includes('-') 
                ? ed.split('-').reverse().join('/') 
                : new Date(ed).toLocaleDateString('es-EC');
            throw new AppError(`La coneja ${female.code}${female.name ? ` — ${female.name}` : ''} ya tiene una monta activa con fecha estimada de parto: ${formattedDate}.`, 400);
        }

        const mountDateObj = new Date(mountDate);
        const currentDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
        // Normalizar a medianoche para comparar solo días
        currentDate.setHours(0, 0, 0, 0);
        if (mountDateObj > currentDate) {
            throw new AppError('La fecha de monta no puede ser futura. Solo se permite registrar montas del día actual o anteriores.', 400);
        }

        const birthDate = new Date(female.birthDate);
        if (mountDateObj < birthDate) {
            throw new AppError('La fecha de monta no puede ser anterior a la fecha de nacimiento de la coneja.', 400);
        }

        const femaleAge = (currentDate - birthDate) / (1000 * 60 * 60 * 24 * 30.44);
        if (femaleAge < 4) {
            throw new AppError('La hembra debe tener al menos 4 meses de edad.', 400);
        }

        const estimatedBirthDate = this.calculateEstimatedBirthDate(mountDate);

        const reproduction = await reproductionRepository.create({
            femaleId,
            maleId: maleId || null,
            mountDate,
            estimatedBirthDate,
            galponId
        });

        return reproduction;
    }

    async getReproductionByFemaleId(femaleId) {
        return reproductionRepository.findByFemaleId(femaleId);
    }

    async getAllReproductions(galponId, profileId, page = 1, limit = 10) {
        if (!galponId) return createPaginatedResponse([], page, limit, 0);

        // Verificar que el usuario tiene acceso al galpón
        const membership = await FarmMember.findOne({
            where: { profileId, galponId, status: 'active' }
        });
        if (!membership) throw new AppError('No tienes acceso a este galpón.', 403);

        const { limit: limitValue, offset, page: pageValue } = getPaginationParams(page, limit);
        const reproductions = await reproductionRepository.findByGalponId(galponId, { limit: limitValue, offset });
        const total = await reproductionRepository.countByGalponId(galponId);

        return createPaginatedResponse(reproductions, pageValue, limitValue, total);
    }

    async editReproduction(id, data) {
        const reproduction = await reproductionRepository.findById(id);
        if (!reproduction) throw new AppError('Registro de reproducción no encontrado.', 404);

        if (data.mountDate) {
            const mountDateObj = new Date(data.mountDate);
            const currentDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
            // Normalizar a medianoche para comparar solo días
            currentDate.setHours(0, 0, 0, 0);
            if (mountDateObj > currentDate) {
                throw new AppError('La fecha de monta no puede ser futura. Solo se permite registrar montas del día actual o anteriores.', 400);
            }

            const female = await Rabbit.findByPk(reproduction.femaleId);
            if (female) {
                const birthDate = new Date(female.birthDate);
                if (mountDateObj < birthDate) {
                    throw new AppError('La fecha de monta no puede ser anterior a la fecha de nacimiento de la coneja.', 400);
                }
            }

            data.estimatedBirthDate = this.calculateEstimatedBirthDate(data.mountDate);
        }

        return reproductionRepository.update(reproduction, data);
    }

    async deleteReproduction(id) {
        const reproduction = await reproductionRepository.findById(id);
        if (!reproduction) throw new AppError('Registro de reproducción no encontrado.', 404);
        await reproductionRepository.delete(reproduction);
    }

    async getReproductionCalendar(galponId, year, month, cageIds = null) {
        return reproductionRepository.findByMonthAndGalpon(galponId, year, month, cageIds);
    }

    async getReproductionByDay(galponId, year, month, day, cageIds = null) {
        return reproductionRepository.findByDayAndGalpon(galponId, year, month, day, cageIds);
    }

    async getReproductionById(id) {
        const reproduction = await reproductionRepository.findByIdWithDetails(id);
        if (!reproduction) throw new AppError('Registro de reproducción no encontrado.', 404);
        return reproduction;
    }
}

module.exports = new ReproductionService();
