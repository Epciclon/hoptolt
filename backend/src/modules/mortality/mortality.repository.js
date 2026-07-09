const { Mortality, Rabbit, Profile } = require('../../domain/models');
const { Op } = require('sequelize');
const { buildCommonFilters } = require('../../common/helpers/repository.helper');

class MortalityRepository {
    async findByGalponId(galponId, options = {}, filterProfileId = null, isKits = null, filters = {}) {
        const { whereClause: filtersWhere, rabbitWhere } = buildCommonFilters(filters, 'deathDate');
        const where = { galponId, ...filtersWhere };

        if (filterProfileId) {
            where.profileId = filterProfileId;
        }
        if (isKits !== null) {
            where.isKits = isKits;
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
        const { whereClause: filtersWhere, rabbitWhere } = buildCommonFilters(filters, 'deathDate');
        const where = { galponId, ...filtersWhere };

        if (filterProfileId) {
            where.profileId = filterProfileId;
        }
        if (isKits !== null) {
            where.isKits = isKits;
        }

        if (filters.races) {
            const racesArray = Array.isArray(filters.races) ? filters.races : filters.races.split(',');
            return Mortality.count({
                where,
                include: [{
                    model: Rabbit,
                    as: 'rabbit',
                    where: rabbitWhere,
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
