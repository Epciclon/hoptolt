const { Cleaning, Profile } = require('../../domain/models');

class CleaningRepository {
    async findByGalponId(galponId, options = {}, cageIds = null) {
        const { Op } = require('sequelize');
        const where = { galponId };
        if (cageIds !== null) {
            where.cageId = { [Op.in]: cageIds };
        }
        return Cleaning.findAll({
            where,
            order: [['cleaningDate', 'DESC']],
            include: [{
                model: Profile,
                as: 'profile',
                attributes: ['username', 'fullName', 'email']
            }],
            ...options
        });
    }

    async countByGalponId(galponId, cageIds = null) {
        const { Op } = require('sequelize');
        const where = { galponId };
        if (cageIds !== null) {
            where.cageId = { [Op.in]: cageIds };
        }
        return Cleaning.count({ where });
    }

    async findAll() {
        return Cleaning.findAll();
    }

    async create(data) {
        return Cleaning.create(data);
    }
}

module.exports = new CleaningRepository();
