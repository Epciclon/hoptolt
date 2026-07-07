const rabbitRepository = require('./rabbit.repository');
const raceRepository = require('../race/race.repository');
const { Assignment, FarmMember, Growth } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { getPaginationParams, createPaginatedResponse } = require('../../common/helpers/pagination.helper');
const { generateRandomName } = require('../../common/helpers/names.helper');
const { Op } = require('sequelize');

class RabbitService {
    async generateCode(raceName, galponId) {
        // Find if this race already has a rabbit in this galpon
        const existingRabbits = await rabbitRepository.findByGalpon(galponId, {
            where: { race: raceName.trim() },
            limit: 1
        });
        
        let prefix = '';
        if (existingRabbits && existingRabbits.length > 0) {
            // Reutilizar el prefijo de la misma raza
            prefix = existingRabbits[0].code.replace(/[0-9]+$/, '').toUpperCase();
        } else {
            // Generar nuevo prefijo verificando colisiones en el galpón
            const allRabbits = await rabbitRepository.findByGalpon(galponId, { attributes: ['code'] });
            const takenPrefixes = new Set(allRabbits.map(r => r.code.replace(/[0-9]+$/, '').toUpperCase()));
            
            const words = raceName.trim().split(/\s+/);
            if (words.length > 1) {
                let initialPrefix = words.map(w => w.charAt(0)).join('').toUpperCase();
                let extraLen = 1;
                prefix = initialPrefix;
                while (takenPrefixes.has(prefix) && extraLen < words[0].length) {
                    prefix = (words[0].substring(0, extraLen + 1) + words.slice(1).map(w => w.charAt(0)).join('')).toUpperCase();
                    extraLen++;
                }
            } else {
                let extraLen = 1;
                prefix = raceName.trim().substring(0, extraLen).toUpperCase();
                while (takenPrefixes.has(prefix) && extraLen < raceName.trim().length) {
                    extraLen++;
                    prefix = raceName.trim().substring(0, extraLen).toUpperCase();
                }
            }
        }

        // Generar código numérico garantizando unicidad en el galpón
        let code = '';
        let codeExists = true;
        while (codeExists) {
            const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            code = `${prefix}${randomNum}`;
            const exists = await rabbitRepository.findByGalpon(galponId, { where: { code } });
            codeExists = exists.length > 0;
        }
        return code;
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
        const { name, race, sex, birthDate, weight, purpose, imageUrl } = data;

        // Verificar que el usuario tiene acceso al galpón
        await this._assertGalponAccess(galponId, profileId);

        const raceExists = await raceRepository.findByName(race.trim());
        if (!raceExists) throw new AppError('La raza especificada no existe.', 400);

        let code = await this.generateCode(race, galponId);

        const age = this.calculateAge(birthDate);

        const rabbit = await rabbitRepository.create({
            code,
            name: name.trim(),
            race: race.trim(),
            sex,
            birthDate,
            age,
            weight,
            purpose,
            imageUrl: imageUrl || null,
            galponId,
            profileId
        });

        await Growth.create({
            rabbitId: rabbit.id,
            weight: rabbit.weight,
            recordDate: new Date()
        });

        return rabbit;
    }

    async getRabbit(id, profileId) {
        const rabbit = await rabbitRepository.findById(id);
        if (!rabbit) throw new AppError('Conejo no encontrado.', 404);

        // Verificar que el usuario tiene acceso al galpón
        await this._assertGalponAccess(rabbit.galponId, profileId);

        return rabbit;
    }

    async getAllRabbits(galponId, profileId, filters = {}, page = 1, limit = 12) {
        if (!galponId) return createPaginatedResponse([], page, limit, 0);

        // Verificar que el usuario tiene acceso al galpón
        await this._assertGalponAccess(galponId, profileId);

        const { limit: limitValue, offset, page: pageValue } = getPaginationParams(page, limit);
        const { Op } = require('sequelize');
        
        const where = {};
        
        if (filters.search) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${filters.search}%` } },
                { code: { [Op.iLike]: `%${filters.search}%` } }
            ];
        }
        
        if (filters.race) where.race = filters.race;
        if (filters.sex) where.sex = filters.sex;
        if (filters.purpose) where.purpose = filters.purpose;

        const options = {
            limit: limitValue,
            offset,
            where,
            order: [['createdAt', 'DESC']]
        };

        const rabbits = await rabbitRepository.findByGalpon(galponId, options);
        const total = await rabbitRepository.countByGalpon(galponId, { where });

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

        const oldWeight = parseFloat(rabbit.weight);
        const newWeight = data.weight !== undefined ? parseFloat(data.weight) : oldWeight;

        const updatedRabbit = await rabbitRepository.update(rabbit, data);

        if (newWeight !== oldWeight) {
            // Find the most recent growth record
            const latestGrowth = await Growth.findOne({
                where: { rabbitId: rabbit.id },
                order: [['recordDate', 'DESC']]
            });

            if (latestGrowth) {
                // Determine if the latest growth record was made this current month
                const today = new Date();
                const latestDate = new Date(latestGrowth.recordDate);
                if (today.getMonth() === latestDate.getMonth() && today.getFullYear() === latestDate.getFullYear()) {
                    // Update the existing record instead of duplicating
                    await latestGrowth.update({ weight: newWeight, recordDate: new Date() });
                } else {
                    // It's a new month (or first edit in a long time), create a new one
                    await Growth.create({
                        rabbitId: rabbit.id,
                        weight: newWeight,
                        recordDate: new Date()
                    });
                }
            } else {
                // If somehow no baseline existed, create one
                await Growth.create({
                    rabbitId: rabbit.id,
                    weight: newWeight,
                    recordDate: new Date()
                });
            }
        }

        return updatedRabbit;
    }

    async deleteRabbit(id, profileId) {
        const rabbit = await rabbitRepository.findById(id);
        if (!rabbit) throw new AppError('Conejo no encontrado.', 404);

        // Verificar que el usuario tiene acceso al galpón
        await this._assertGalponAccess(rabbit.galponId, profileId);

        const assignmentCount = await Assignment.count({ where: { rabbitId: rabbit.id, status: 'asignado' } });
        if (assignmentCount > 0) {
            throw new AppError('No se puede eliminar un conejo asignado a una jaula. Debe desasignarse primero.', 400);
        }

        await rabbitRepository.delete(rabbit);
    }

    async getAvailableRaces() {
        return raceRepository.findAll();
    }

    suggestName(sex) {
        if (!['macho', 'hembra'].includes(sex)) {
            sex = 'macho'; // fallback por defecto
        }
        return generateRandomName(sex);
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
