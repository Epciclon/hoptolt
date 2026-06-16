const { Galpon } = require('../../domain/models');

class GalponRepository {
    async findById(id) {
        return Galpon.findByPk(id);
    }

    async findByName(name) {
        return Galpon.findOne({ where: { name } });
    }

    async findByNameAndProfileId(name, profileId) {
        return Galpon.findOne({ where: { name, profileId } });
    }

    async findAll() {
        return Galpon.findAll();
    }

    async findByProfileId(profileId, options = {}) {
        return Galpon.findAll({
            where: { profileId },
            ...options
        });
    }

    async countByProfileId(profileId) {
        return Galpon.count({ where: { profileId } });
    }

    async create(data) {
        return Galpon.create(data);
    }

    async update(galpon, data) {
        return galpon.update(data);
    }

    async delete(galpon) {
        return galpon.destroy();
    }

    async findActive() {
        return Galpon.findOne({ where: { isActive: true } });
    }

    async setActive(id) {
        await Galpon.update({ isActive: false }, { where: { isActive: true } });
        const galpon = await Galpon.findByPk(id);
        await galpon.update({ isActive: true });
        return galpon;
    }
}

module.exports = new GalponRepository();
