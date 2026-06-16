const { Cage } = require('../../domain/models');

class CageRepository {
    async findById(id, galponId) {
        const where = { id };
        if (galponId) {
            where.galponId = galponId;
        }
        return Cage.findOne({ where });
    }

    async findByNumberAndGalpon(number, galponId) {
        return Cage.findOne({ where: { number, galponId } });
    }

    async findByGalponId(galponId, options = {}) {
        return Cage.findAll({
            where: { galponId },
            ...options
        });
    }

    async countByGalponId(galponId) {
        return Cage.count({ where: { galponId } });
    }

    async findAll() {
        return Cage.findAll();
    }

    async findByStatus(status) {
        return Cage.findAll({ where: { status } });
    }

    async create(data) {
        return Cage.create(data);
    }

    async update(cage, data) {
        return cage.update(data);
    }

    async delete(cage) {
        return cage.destroy();
    }
}

module.exports = new CageRepository();
