const rabbitRepository = require('./rabbit.repository');
const raceRepository = require('../race/race.repository');
const { Assignment, FarmMember } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { getPaginationParams, createPaginatedResponse } = require('../../common/helpers/pagination.helper');

class RabbitService {
    generateCode(raceName) {
        const initial = raceName.charAt(0).toUpperCase();
        const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${initial}${randomNum}`;
    }

    calculateAge(birthDate) {
        const bd = new Date(birthDate);
        const today = new Date();
        // Establecer la hora a medianoche para cálculos consistentes
        bd.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        const ageMonths = Math.floor((today - bd) / (1000 * 60 * 60 * 24 * 30.44));
        return Math.max(0, ageMonths);
    }

    async registerRabbit(data, galponId, profileId) {
        const { name, race, sex, birthDate, weight, purpose } = data;

        // Verificar que el usuario tiene acceso al galpón
        await this._assertGalponAccess(galponId, profileId);

        const raceExists = await raceRepository.findByName(race.trim());
        if (!raceExists) throw new AppError('La raza especificada no existe.', 400);

        let code = this.generateCode(race);
        let codeExists = await rabbitRepository.findByCode(code);
        while (codeExists) {
            code = this.generateCode(race);
            codeExists = await rabbitRepository.findByCode(code);
        }

        const age = this.calculateAge(birthDate);

        return rabbitRepository.create({
            code,
            name: name.trim(),
            race: race.trim(),
            sex,
            birthDate,
            age,
            weight,
            purpose,
            galponId,
            profileId
        });
    }

    async getRabbit(id, profileId) {
        const rabbit = await rabbitRepository.findById(id);
        if (!rabbit) throw new AppError('Conejo no encontrado.', 404);

        // Verificar que el usuario tiene acceso al galpón
        await this._assertGalponAccess(rabbit.galponId, profileId);

        return rabbit;
    }

    async getAllRabbits(galponId, profileId, page = 1, limit = 10) {
        if (!galponId) return createPaginatedResponse([], page, limit, 0);

        // Verificar que el usuario tiene acceso al galpón
        await this._assertGalponAccess(galponId, profileId);

        const { limit: limitValue, offset, page: pageValue } = getPaginationParams(page, limit);
        const rabbits = await rabbitRepository.findByGalpon(galponId, { limit: limitValue, offset });
        const total = await rabbitRepository.countByGalpon(galponId);

        return createPaginatedResponse(rabbits, pageValue, limitValue, total);
    }

    async getRabbitsByRace(raceName, galponId, profileId) {
        if (galponId) {
            // Verificar que el usuario tiene acceso al galpón
            await this._assertGalponAccess(galponId, profileId);
            return rabbitRepository.findByRaceAndGalpon(raceName.trim(), galponId);
        }
        return rabbitRepository.findByRace(raceName.trim());
    }

    async editRabbit(id, data, profileId) {
        const rabbit = await rabbitRepository.findById(id);
        if (!rabbit) throw new AppError('Conejo no encontrado.', 404);

        // Verificar que el usuario tiene acceso al galpón
        await this._assertGalponAccess(rabbit.galponId, profileId);

        // Si se actualiza birthDate, recalcular edad
        if (data.birthDate) {
            data.age = this.calculateAge(data.birthDate);
        }

        return rabbitRepository.update(rabbit, data);
    }

    async deleteRabbit(id, profileId) {
        const rabbit = await rabbitRepository.findById(id);
        if (!rabbit) throw new AppError('Conejo no encontrado.', 404);

        // Verificar que el usuario tiene acceso al galpón
        await this._assertGalponAccess(rabbit.galponId, profileId);

        const assignmentCount = await Assignment.count({ where: { rabbitCode: rabbit.code, status: 'asignado' } });
        if (assignmentCount > 0) {
            throw new AppError('No se puede eliminar un conejo asignado a una jaula. Debe desasignarse primero.', 400);
        }

        await rabbitRepository.delete(rabbit);
    }

    async getAvailableRaces() {
        return raceRepository.findAll();
    }

    async getPotentialFathers(galponId, profileId) {
        if (!galponId) return [];

        // Verificar que el usuario tiene acceso al galpón
        await this._assertGalponAccess(galponId, profileId);

        return rabbitRepository.findByGalponAndSexAndMinAge(galponId, 'macho', 4);
    }

    async getPotentialMothers(galponId, profileId) {
        if (!galponId) return [];

        // Verificar que el usuario tiene acceso al galpón
        await this._assertGalponAccess(galponId, profileId);

        return rabbitRepository.findByGalponAndSexAndMinAge(galponId, 'hembra', 4);
    }

    async _assertGalponAccess(galponId, profileId) {
        const membership = await FarmMember.findOne({
            where: { profileId, galponId, status: 'active' }
        });
        if (!membership) throw new AppError('No tienes acceso a este galpón.', 403);
    }
}

module.exports = new RabbitService();
