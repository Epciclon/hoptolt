const { Deworming } = require('../../domain/models');
const { findRecordsByGalponId, countRecordsByGalponId } = require('../../common/helpers/repository.helper');

class DewormingRepository {
    async findByGalponId(galponId, options = {}, filters = {}) {
        return findRecordsByGalponId(Deworming, 'dewormingDate', galponId, options, filters);
    }

    async countByGalponId(galponId, filters = {}) {
        return countRecordsByGalponId(Deworming, 'dewormingDate', galponId, filters);
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
