const { Mortality, Rabbit, Profile } = require('../../domain/models');
const { Op } = require('sequelize');
const { buildCommonFilters } = require('../../common/helpers/repository.helper');

class MortalityRepository {
    _buildMortalityQueryParts(galponId, filterProfileId = null, isKits = null, filters = {}, includeAttributes = false) {
        const { whereClause: filtersWhere, rabbitWhere } = buildCommonFilters(filters, 'deathDate');
        const where = { galponId, ...filtersWhere };

        if (filterProfileId) {
            where.profileId = filterProfileId;
        }
        if (isKits !== null) {
            where.isKits = isKits;
        }

        const hasRabbitWhere = Object.keys(rabbitWhere).length > 0;
        const includeRabbit = {
            model: Rabbit,
            as: 'rabbit',
            ...(includeAttributes ? { attributes: ['code', 'name', 'race', 'imageUrl'] } : {}),
            paranoid: false,
            where: hasRabbitWhere ? rabbitWhere : undefined,
            required: hasRabbitWhere
        };

        if (filters.search) {
            const search = `%${filters.search}%`;
            const searchConditions = [
                { cause: { [Op.like]: search } },
                { '$rabbit.code$': { [Op.like]: search } },
                { '$rabbit.name$': { [Op.like]: search } }
            ];
            if (where[Op.or]) {
                where[Op.and] = [{ [Op.or]: searchConditions }];
            } else {
                where[Op.or] = searchConditions;
            }
            includeRabbit.required = true;
        }

        return { where, includeRabbit };
    }

    async findByGalponId(galponId, options = {}, filterProfileId = null, isKits = null, filters = {}) {
        const { where, includeRabbit } = this._buildMortalityQueryParts(galponId, filterProfileId, isKits, filters, true);

        return Mortality.findAll({
            where,
            include: [
                includeRabbit,
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
        const { where, includeRabbit } = this._buildMortalityQueryParts(galponId, filterProfileId, isKits, filters, false);

        if (filters.races || filters.search) {
            return Mortality.count({
                where,
                include: [includeRabbit]
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
