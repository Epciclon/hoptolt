const { Mortality, Rabbit, Profile } = require('../../domain/models');
const { Op } = require('sequelize');

class MortalityRepository {
    async findByGalponId(galponId, options = {}, filterProfileId = null) {
        const where = { galponId };
        if (filterProfileId) {
            where.profileId = filterProfileId;
        }
        return Mortality.findAll({
            where,
            include: [
                {
                    model: Rabbit,
                    attributes: ['code', 'name'],
                    paranoid: false
                },
                {
                    model: Profile,
                    as: 'profile',
                    attributes: ['id', 'username', 'fullName', 'email']
                }
              ],
            order: [['deathDate', 'DESC'], ['createdAt', 'DESC']],
            ...options
        });
    }

    async countByGalponId(galponId, filterProfileId = null) {
        const where = { galponId };
        if (filterProfileId) {
            where.profileId = filterProfileId;
        }
        return Mortality.count({ where });
    }

    async findAll() {
        return Mortality.findAll();
    }

    async create(data) {
        return Mortality.create(data);
    }
}

module.exports = new MortalityRepository();
