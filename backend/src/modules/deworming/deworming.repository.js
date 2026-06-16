const { Deworming } = require('../../domain/models');
const { Op } = require('sequelize');

class DewormingRepository {
    async findByGalponId(galponId, options = {}) {
        return Deworming.findAll({
            where: { galponId },
            ...options
        });
    }

    async countByGalponId(galponId) {
        return Deworming.count({ where: { galponId } });
    }

    async findByRabbitId(rabbitId) {
        return Deworming.findAll({ where: { rabbitId } });
    }

    async findLastDewormingByRabbit(rabbitId) {
        return Deworming.findOne({
            where: { rabbitId },
            order: [['dewormingDate', 'DESC']]
        });
    }

    async findAll() {
        return Deworming.findAll();
    }

    async create(data) {
        return Deworming.create(data);
    }
}

module.exports = new DewormingRepository();
