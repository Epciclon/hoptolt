const { Growth } = require('../../domain/models');
const { Op } = require('sequelize');

class GrowthRepository {
    async findByRabbitCodes(rabbitCodes) {
        return Growth.findAll({
            where: {
                rabbitCode: {
                    [Op.in]: rabbitCodes
                }
            }
        });
    }

    async findAll() {
        return Growth.findAll();
    }

    async create(data) {
        return Growth.create(data);
    }
}

module.exports = new GrowthRepository();
