const raceRepository = require('./race.repository');
const { Rabbit } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { getPaginationParams, createPaginatedResponse } = require('../../common/helpers/pagination.helper');
const { recordWorkerChange } = require('../../common/helpers/audit.helper');

class RaceService {
    async registerRace(data, profileId, galponId = null, workerProfileId = null) {
        const existing = await raceRepository.findByNameAndProfile(data.name.trim(), profileId);
        if (existing) throw new AppError('El nombre de la raza ya está en uso.', 400);
        const created = await raceRepository.create({
            name: data.name.trim(),
            description: data.description.trim(),
            imageUrl: data.imageUrl || null,
            profileId,
            galponId
        });

        if (galponId) {
            recordWorkerChange({
                galponId,
                profileId: workerProfileId || profileId,
                action: 'crear',
                entity: 'races',
                entityId: created.id,
                itemName: `Raza ${created.name}`,
                summary: `Registró la nueva raza ${created.name}`,
                after: { name: created.name, description: created.description, imageUrl: created.imageUrl || null }
            }).catch(err => console.error('Error recording worker change on registerRace:', err));
        }

        return created;
    }

    async getRaceById(id) {
        const race = await raceRepository.findById(id);
        if (!race) throw new AppError('Raza no encontrada.', 404);
        return race;
    }

    async getAllRaces(profileId, filters = {}, page = 1, limit = 10) {
        if (!profileId) return createPaginatedResponse([], page, limit, 0);

        const { limit: limitValue, offset, page: pageValue } = getPaginationParams(page, limit);
        
        const { Op } = require('sequelize');
        const where = {};
        
        if (filters.search) {
            where.name = { [Op.iLike]: `%${filters.search}%` };
        }

        const options = {
            limit: limitValue,
            offset,
            where,
            order: [['createdAt', 'DESC']]
        };

        const [races, total] = await Promise.all([
            raceRepository.findByProfile(profileId, options),
            raceRepository.countByProfile(profileId, { where })
        ]);

        return createPaginatedResponse(races, pageValue, limitValue, total);
    }

    async editRaceDescription(id, data, profileId = null, galponId = null) {
        const race = await raceRepository.findById(id);
        if (!race) throw new AppError('Raza no encontrada.', 404);
        const before = { name: race.name, description: race.description, imageUrl: race.imageUrl || null };
        const updated = await raceRepository.update(race, data);

        if (galponId && profileId) {
            recordWorkerChange({
                galponId,
                profileId,
                action: 'modificar',
                entity: 'races',
                entityId: race.id,
                itemName: `Raza ${race.name}`,
                summary: `Modificó la información de la raza ${race.name}`,
                before,
                after: { name: updated.name, description: updated.description, imageUrl: updated.imageUrl || null }
            }).catch(err => console.error('Error recording worker change on editRace:', err));
        }

        return updated;
    }

    async deleteRace(id, profileId = null, galponId = null) {
        const race = await raceRepository.findById(id);
        if (!race) throw new AppError('Raza no encontrada.', 404);

        const rabbitCount = await Rabbit.count({ where: { race: race.name } });
        if (rabbitCount > 0) {
            throw new AppError('No se puede eliminar la raza porque tiene conejos asociados. Primero debe reasignar o eliminar los conejos de esa raza.', 400);
        }

        const before = { name: race.name, description: race.description, imageUrl: race.imageUrl || null };
        await raceRepository.delete(race);

        if (galponId && profileId) {
            recordWorkerChange({
                galponId,
                profileId,
                action: 'eliminar',
                entity: 'races',
                entityId: race.id,
                itemName: `Raza ${race.name}`,
                summary: `Eliminó la raza ${race.name} del catálogo`,
                before
            }).catch(err => console.error('Error recording worker change on deleteRace:', err));
        }
    }
}

module.exports = new RaceService();
