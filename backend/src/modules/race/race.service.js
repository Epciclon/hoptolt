const raceRepository = require('./race.repository');
const { Rabbit } = require('../../domain/models');
const AppError = require('../../errors/AppError');

class RaceService {
    async registerRace(data, profileId) {
        const existing = await raceRepository.findByNameAndProfile(data.name.trim(), profileId);
        if (existing) throw new AppError('El nombre de la raza ya está en uso.', 400);
        return raceRepository.create({
            name: data.name.trim(),
            description: data.description.trim(),
            imageUrl: data.imageUrl || null,
            profileId
        });
    }

    async getRaceById(id) {
        const race = await raceRepository.findById(id);
        if (!race) throw new AppError('Raza no encontrada.', 404);
        return race;
    }

    async getAllRaces(profileId) {
        if (!profileId) return [];
        return raceRepository.findByProfile(profileId);
    }

    async editRaceDescription(id, data) {
        const race = await raceRepository.findById(id);
        if (!race) throw new AppError('Raza no encontrada.', 404);
        return raceRepository.update(race, data);
    }

    async deleteRace(id) {
        const race = await raceRepository.findById(id);
        if (!race) throw new AppError('Raza no encontrada.', 404);

        const rabbitCount = await Rabbit.count({ where: { race: race.name } });
        if (rabbitCount > 0) {
            throw new AppError('No se puede eliminar la raza porque tiene conejos asociados. Primero debe reasignar o eliminar los conejos de esa raza.', 400);
        }

        await raceRepository.delete(race);
    }
}

module.exports = new RaceService();
