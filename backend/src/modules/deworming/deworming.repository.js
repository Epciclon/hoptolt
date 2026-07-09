const { Deworming } = require('../../domain/models');
const { Op } = require('sequelize');
const { buildCommonFilters, buildRabbitProfileIncludes, buildRabbitCountInclude } = require('../../common/helpers/repository.helper');

class DewormingRepository {
    async findByGalponId(galponId, options = {}, filters = {}) {
        const { whereClause: filtersWhere, rabbitWhere } = buildCommonFilters(filters, 'dewormingDate');
        const whereClause = { galponId, ...filtersWhere };

        return Deworming.findAll({
            where: whereClause,
            include: buildRabbitProfileIncludes(rabbitWhere),
            order: [['dewormingDate', 'DESC']],
            ...options
        });
    }

    async countByGalponId(galponId, filters = {}) {
        const { whereClause: filtersWhere, rabbitWhere } = buildCommonFilters(filters, 'dewormingDate');
        const whereClause = { galponId, ...filtersWhere };

        if (filters.races) {
            return Deworming.count({
                where: whereClause,
                include: buildRabbitCountInclude(rabbitWhere)
            });
        }

        return Deworming.count({ where: whereClause });
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
