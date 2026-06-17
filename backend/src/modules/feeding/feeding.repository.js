const { Feeding } = require('../../domain/models');
const { Op } = require('sequelize');

class FeedingRepository {
    async findByCageIdAndDate(cageId, date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return Feeding.findAll({
            where: {
                cageId,
                feedingDate: {
                    [Op.between]: [startOfDay, endOfDay]
                }
            }
        });
    }

    async findByGalponId(galponId, options = {}) {
        return Feeding.findAll({
            where: { galponId },
            order: [['feedingDate', 'DESC']],
            ...options
        });
    }

    async countByGalponId(galponId) {
        return Feeding.count({ where: { galponId } });
    }

    async findAll() {
        return Feeding.findAll();
    }

    async create(data) {
        return Feeding.create(data);
    }
}

module.exports = new FeedingRepository();
