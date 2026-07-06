const { Mortality, Rabbit, Profile } = require('../../domain/models');
const { Op } = require('sequelize');

class MortalityRepository {
    async findByGalponId(galponId, options = {}, filterProfileId = null, isKits = null, filters = {}) {
        const where = { galponId };
        if (filterProfileId) {
            where.profileId = filterProfileId;
        }
        if (isKits !== null) {
            where.isKits = isKits;
        }

        if (filters.startDate && filters.endDate) {
            where.deathDate = {
                [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
            };
        } else if (filters.startDate) {
            where.deathDate = { [Op.gte]: new Date(filters.startDate) };
        } else if (filters.endDate) {
            where.deathDate = { [Op.lte]: new Date(filters.endDate) };
        }


        if (filters.profileId) {
            const profileIds = Array.isArray(filters.profileId) ? filters.profileId : filters.profileId.split(',');
            where.profileId = { [Op.in]: profileIds };
        }

        const rabbitWhere = {};
        if (filters.races) {
            const racesArray = Array.isArray(filters.races) ? filters.races : filters.races.split(',');
            rabbitWhere.race = { [Op.in]: racesArray };
        }

        return Mortality.findAll({
            where,
            include: [
                {
                    model: Rabbit,
                    as: 'rabbit',
                    attributes: ['code', 'name', 'race', 'imageUrl'],
                    paranoid: false,
                    where: Object.keys(rabbitWhere).length > 0 ? rabbitWhere : undefined,
                    required: Object.keys(rabbitWhere).length > 0
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

    async countByGalponId(galponId, filterProfileId = null, isKits = null, filters = {}) {
        const where = { galponId };
        if (filterProfileId) {
            where.profileId = filterProfileId;
        }
        if (isKits !== null) {
            where.isKits = isKits;
        }

        if (filters.startDate && filters.endDate) {
            where.deathDate = {
                [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
            };
        } else if (filters.startDate) {
            where.deathDate = { [Op.gte]: new Date(filters.startDate) };
        } else if (filters.endDate) {
            where.deathDate = { [Op.lte]: new Date(filters.endDate) };
        }


        if (filters.profileId) {
            const profileIds = Array.isArray(filters.profileId) ? filters.profileId : filters.profileId.split(',');
            where.profileId = { [Op.in]: profileIds };
        }

        if (filters.races) {
            const racesArray = Array.isArray(filters.races) ? filters.races : filters.races.split(',');
            return Mortality.count({
                where,
                include: [{
                    model: Rabbit,
                    as: 'rabbit',
                    where: { race: { [Op.in]: racesArray } },
                    paranoid: false,
                    required: true
                }]
            });
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
