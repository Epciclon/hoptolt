const { Deworming, Rabbit } = require('../../domain/models');
const { Op } = require('sequelize');
const { buildCommonFilters } = require('../../common/helpers/repository.helper');

class DewormingRepository {
    async findByGalponId(galponId, options = {}, filters = {}) {
        const { whereClause: filtersWhere, rabbitWhere } = buildCommonFilters(filters, 'dewormingDate');
        const whereClause = { galponId, ...filtersWhere };

        return Deworming.findAll({
            where: whereClause,
            include: [
                { 
                    model: Rabbit, 
                    as: 'rabbit',
                    where: Object.keys(rabbitWhere).length > 0 ? rabbitWhere : undefined,
                    required: true,
                    include: [{
                        model: require('../../domain/models').Assignment,
                        as: 'assignments',
                        where: { status: 'asignado' },
                        required: true,
                        include: [{
                            model: require('../../domain/models').Cage,
                            as: 'cage',
                            attributes: ['id', 'number']
                        }]
                    }]
                },
                { model: require('../../domain/models').Profile, as: 'profile', attributes: ['username', 'fullName', 'email'] }
            ],
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
                include: [{
                    model: Rabbit,
                    as: 'rabbit',
                    where: rabbitWhere,
                    required: true
                }]
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
