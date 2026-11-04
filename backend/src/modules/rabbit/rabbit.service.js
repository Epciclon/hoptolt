const rabbitRepository = require('./rabbit.repository');
const raceRepository = require('../race/race.repository');
const { Assignment, FarmMember } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { getPaginationParams, createPaginatedResponse } = require('../../common/helpers/pagination.helper');
const { generateRandomName } = require('../../common/helpers/names.helper');
const { recordWorkerChange } = require('../../common/helpers/audit.helper');
const { Op } = require('sequelize');
const crypto = require('node:crypto');

class RabbitService {
    async generateCode(raceName, galponId) {
        // Find if this race already has a rabbit in this galpon
        const existingRabbits = await rabbitRepository.findByGalpon(galponId, {
            where: { race: raceName.trim() },
            limit: 1
        });
        
        const stripTrailingDigits = (str) => {
            let i = str.length - 1;
            while (i >= 0 && str[i] >= '0' && str[i] <= '9') i--;
            return str.substring(0, i + 1);
        };

        let prefix = '';
        if (existingRabbits && existingRabbits.length > 0) {
            // Reutilizar el prefijo de la misma raza
            prefix = stripTrailingDigits(existingRabbits[0].code).toUpperCase();
        } else {
            // Generar nuevo prefijo verificando colisiones en el galpón
            const allRabbits = await rabbitRepository.findByGalpon(galponId, { attributes: ['code'] });
            const takenPrefixes = new Set(allRabbits.map(r => stripTrailingDigits(r.code).toUpperCase()));
            
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
            const randomNum = crypto.randomInt(1000).toString().padStart(3, '0');
            code = `${prefix}${randomNum}`;
            const exists = await rabbitRepository.findByGalpon(galponId, { where: { code } });
            codeExists = exists.length > 0;
        }
        return code;
    }

    calculateAge(birthDate) {
        const bd = new Date(birthDate);
        const today = new Date();
        const diffTime = today.getTime() - bd.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const ageMonths = Math.floor(diffDays / 30);
        return Math.max(0, ageMonths);
    }

    async registerRabbit(data, galponId, profileId) {
        const { name, race, sex, birthDate, weight, purpose, imageUrl } = data;

        // Verificar acceso al galpón y existencia de la raza en paralelo
        const [, raceExists] = await Promise.all([
            this._assertGalponAccess(galponId, profileId),
            raceRepository.findByName(race.trim())
        ]);
        if (!raceExists) throw new AppError('La raza especificada no existe.', 400);

        const code = await this.generateCode(race, galponId);
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

        const growthService = require('../growth/growth.service');
        await growthService.rebuildGrowthHistory(rabbit, { isNew: true });

        const rabbitLabel = rabbit.name ? `${rabbit.name} - ${rabbit.code}` : rabbit.code;
        const isFemale = rabbit.sex === 'hembra';
        const prefix = isFemale ? 'Coneja' : 'Conejo';
        const article = isFemale ? 'a la coneja' : 'al conejo';

        recordWorkerChange({
            galponId,
            profileId,
            action: 'crear',
            entity: 'rabbits',
            entityId: rabbit.id,
            itemName: `${prefix} ${rabbitLabel}`,
            summary: `Registró ${article} ${rabbitLabel} de raza ${rabbit.race}`,
            after: {
                code: rabbit.code,
                name: rabbit.name,
                race: rabbit.race,
                sex: rabbit.sex,
                purpose: rabbit.purpose,
                weight: rabbit.weight != null ? Number(rabbit.weight) : null,
                imageUrl: rabbit.imageUrl || null
            }
        }).catch(err => console.error('Error recording worker change on registerRabbit:', err));

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

        const reproductionRepo = require('../reproduction/reproduction.repository');
        const [rawRabbits, lactatingIds, total] = await Promise.all([
            rabbitRepository.findByGalpon(galponId, options),
            reproductionRepo.findLactatingFemaleIds(galponId),
            rabbitRepository.countByGalpon(galponId, { where })
        ]);

        const rabbits = rawRabbits.map(rabbit => {
            const rabbitData = rabbit.toJSON();
            rabbitData.isLactating = lactatingIds.has(rabbit.id);
            return rabbitData;
        });

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

        const normalize = str => (str || '').toString().trim().toLowerCase();
        const sexChanged = data.sex !== undefined && normalize(data.sex) !== normalize(rabbit.sex);
        const purposeChanged = data.purpose !== undefined && normalize(data.purpose) !== normalize(rabbit.purpose);
        let birthDateChanged = false;
        if (data.birthDate) {
            const oldTime = new Date(rabbit.birthDate).getTime();
            const newTime = new Date(data.birthDate).getTime();
            if (Math.abs(oldTime - newTime) > 24 * 60 * 60 * 1000) {
                birthDateChanged = true;
            }
        }

        // Validar si el conejo está asignado y el cambio rompería las reglas
        if (birthDateChanged || sexChanged || purposeChanged) {
            const assignmentRepository = require('../assignment/assignment.repository');
            const cageRepository = require('../cage/cage.repository');
            const assignmentService = require('../assignment/assignment.service');
            
            const activeAssignment = await assignmentRepository.findActiveByRabbitId(id);
            if (activeAssignment) {
                const [cage, activeAssignments] = await Promise.all([
                    cageRepository.findById(activeAssignment.cageId),
                    assignmentRepository.findActiveByCageId(activeAssignment.cageId)
                ]);
                
                const otherRabbitIds = activeAssignments.filter(a => a.rabbitId !== id).map(a => a.rabbitId);
                const otherRabbits = otherRabbitIds.length > 0 
                    ? await rabbitRepository.findAll({ where: { id: { [Op.in]: otherRabbitIds } } })
                    : [];
                
                // Simular el conejo actualizado
                const simulatedRabbit = { 
                    ...(typeof rabbit.get === 'function' ? rabbit.get({ plain: true }) : rabbit), 
                    ...data 
                };
                
                if (cage.type === 'reproducción' && simulatedRabbit.purpose === 'Engorde') {
                    throw new AppError('No puedes cambiar el propósito a Engorde porque este conejo está en una jaula de reproducción. Desasígnalo primero.', 400);
                }
                
                // Validate against other rabbits in the same cage
                assignmentService.validateCompatibility(cage, [simulatedRabbit], otherRabbits);
            }
        }

        const before = {
            name: rabbit.name,
            race: rabbit.race,
            sex: rabbit.sex,
            purpose: rabbit.purpose,
            weight: rabbit.weight != null ? Number(rabbit.weight) : null,
            birthDate: rabbit.birthDate,
            imageUrl: rabbit.imageUrl || null
        };

        const updatedRabbit = await rabbitRepository.update(rabbit, data);

        // Si el usuario cambia la fecha de nacimiento o el propósito, la curva estimada antigua se rompe.
        if (birthDateChanged || purposeChanged) {
            const growthService = require('../growth/growth.service');
            await growthService.rebuildGrowthHistory(updatedRabbit || rabbit.id);
        }

        const updatedName = updatedRabbit.name || rabbit.name;
        const rabbitLabel = updatedName ? `${updatedName} - ${rabbit.code}` : rabbit.code;
        const currentSex = updatedRabbit.sex || rabbit.sex;
        const isFemale = currentSex === 'hembra';
        const prefix = isFemale ? 'Coneja' : 'Conejo';
        const article = isFemale ? 'de la coneja' : 'del conejo';

        recordWorkerChange({
            galponId: rabbit.galponId,
            profileId,
            action: 'modificar',
            entity: 'rabbits',
            entityId: rabbit.id,
            itemName: `${prefix} ${rabbitLabel}`,
            summary: `Modificó los datos ${article} ${rabbitLabel}`,
            before,
            after: {
                name: updatedRabbit.name,
                race: updatedRabbit.race,
                sex: updatedRabbit.sex,
                purpose: updatedRabbit.purpose,
                weight: updatedRabbit.weight != null ? Number(updatedRabbit.weight) : null,
                birthDate: updatedRabbit.birthDate,
                imageUrl: updatedRabbit.imageUrl || null
            }
        }).catch(err => console.error('Error recording worker change on editRabbit:', err));

        return updatedRabbit;
    }

    async deleteRabbit(id, profileId) {
        const rabbit = await rabbitRepository.findById(id);
        if (!rabbit) throw new AppError('Conejo no encontrado.', 404);

        // Verificar acceso y asignaciones activas en paralelo
        const [, assignmentCount] = await Promise.all([
            this._assertGalponAccess(rabbit.galponId, profileId),
            Assignment.count({ where: { rabbitId: rabbit.id, status: 'asignado' } })
        ]);

        if (assignmentCount > 0) {
            throw new AppError('No se puede eliminar un conejo asignado a una jaula. Debe desasignarse primero.', 400);
        }

        const before = {
            code: rabbit.code,
            name: rabbit.name,
            race: rabbit.race,
            sex: rabbit.sex,
            purpose: rabbit.purpose,
            imageUrl: rabbit.imageUrl || null
        };

        await rabbitRepository.delete(rabbit);

        const rabbitLabel = rabbit.name ? `${rabbit.name} - ${rabbit.code}` : rabbit.code;
        const isFemale = rabbit.sex === 'hembra';
        const deletePrefix = isFemale ? 'Coneja' : 'Conejo';
        const deleteArticle = isFemale ? 'a la coneja' : 'al conejo';

        recordWorkerChange({
            galponId: rabbit.galponId,
            profileId,
            action: 'eliminar',
            entity: 'rabbits',
            entityId: rabbit.id,
            itemName: `${deletePrefix} ${rabbitLabel}`,
            summary: `Eliminó ${deleteArticle} ${rabbitLabel} del galpón`,
            before
        }).catch(err => console.error('Error recording worker change on deleteRabbit:', err));
    }

    async getAvailableRaces() {
        return raceRepository.findAll();
    }

    async suggestName(sex, galponId) {
        if (!['macho', 'hembra'].includes(sex)) {
            sex = 'macho'; // fallback por defecto
        }
        
        let attempts = 0;
        let suggestedName = '';
        let isUnique = false;
        
        while (!isUnique && attempts < 10) {
            suggestedName = generateRandomName(sex);
            if (galponId) {
                const existing = await rabbitRepository.findByNameAndGalpon(suggestedName, galponId);
                if (!existing) {
                    isUnique = true;
                }
            } else {
                isUnique = true;
            }
            attempts++;
        }
        
        if (!isUnique) {
            const num = Math.floor(Math.random() * 900) + 100;
            suggestedName = `${suggestedName} ${num}`;
        }
        
        return suggestedName;
    }

    async getPotentialFathers(galponId, profileId) {
        if (!galponId) return [];

        await this._assertGalponAccess(galponId, profileId);

        return rabbitRepository.findByGalponAndSexAndMinAge(galponId, 'macho', 4);
    }

    async getPotentialMothers(galponId, profileId) {
        if (!galponId) return [];

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
