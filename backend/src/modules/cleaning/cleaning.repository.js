const { Cleaning, Profile } = require('../../domain/models');
const { buildCommonFilters } = require('../../common/helpers/repository.helper');

class CleaningRepository {
    async findByGalponId(galponId, options = {}, cageIds = null, filters = {}) {
        const { Op } = require('sequelize');
        const { Cage, Assignment, Rabbit } = require('../../domain/models');
        const { whereClause: filtersWhere, cageWhere } = buildCommonFilters(filters, 'cleaningDate');
        const where = { galponId, ...filtersWhere };
        
        if (cageIds !== null) {
            where.cageId = { [Op.in]: cageIds };
        }

        return Cleaning.findAll({
            where,
            order: [['cleaningDate', 'DESC']],
            limit: options.limit,
            offset: options.offset,
            include: [
                {
                    model: Profile,
                    as: 'profile',
                    attributes: ['username', 'fullName', 'email']
                },
                {
                    model: Cage,
                    attributes: ['id', 'number', 'type'],
                    where: Object.keys(cageWhere).length > 0 ? cageWhere : undefined,
                    required: Object.keys(cageWhere).length > 0,
                    include: [{
                        model: Assignment,
                        as: 'assignments',
                        where: { status: 'asignado' },
                        required: false,
                        include: [{
                            model: Rabbit,
                            as: 'rabbit',
                            attributes: ['id', 'code', 'name', 'race', 'imageUrl']
                        }]
                    }]
                }
            ],
            ...options
        });
    }

    async countByGalponId(galponId, cageIds = null, filters = {}) {
        const { Op } = require('sequelize');
        const { whereClause: filtersWhere, cageWhere } = buildCommonFilters(filters, 'cleaningDate');
        const where = { galponId, ...filtersWhere };

        if (cageIds !== null) {
            where.cageId = { [Op.in]: cageIds };
        }

        if (filters.cageType) {
            const { Cage } = require('../../domain/models');
            return Cleaning.count({
                where,
                include: [
                    {
                        model: Cage,
                        where: cageWhere,
                        required: true
                    }
                ]
            });
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
