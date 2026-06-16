const { Race } = require('../../domain/models');

class RaceRepository {
    async findById(id) {
        return Race.findByPk(id);
    }

    async findByName(name) {
        return Race.findOne({ where: { name } });
    }

    async findByNameAndProfile(name, profileId) {
        return Race.findOne({ where: { name, profileId } });
    }

    async findByProfile(profileId) {
        return Race.findAll({ where: { profileId } });
    }

    async findByNameAndGalpon(name, galponId) {
        return Race.findOne({ where: { name, galponId } });
    }

    async findByGalpon(galponId) {
        return Race.findAll({ where: { galponId } });
    }

    async findAll() {
        return Race.findAll();
    }

    async create(data) {
        return Race.create(data);
    }

    async update(race, data) {
        return race.update(data);
    }

    async delete(race) {
        return race.destroy();
    }
}

module.exports = new RaceRepository();
