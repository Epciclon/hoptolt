const { Cleaning, Profile } = require('../../domain/models');

class CleaningRepository {
    async findByGalponId(galponId, options = {}, cageIds = null, filters = {}) {
        const { Op } = require('sequelize');
        const { Cage, Assignment, Rabbit } = require('../../domain/models');
        const where = { galponId };
        
        if (cageIds !== null) {
            where.cageId = { [Op.in]: cageIds };
        }

        if (filters.startDate && filters.endDate) {
            where.cleaningDate = {
                [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
            };
        } else if (filters.startDate) {
            where.cleaningDate = { [Op.gte]: new Date(filters.startDate) };
        } else if (filters.endDate) {
            where.cleaningDate = { [Op.lte]: new Date(filters.endDate) };
        }

        if (filters.profileId) {
            const profileIds = Array.isArray(filters.profileId) ? filters.profileId : filters.profileId.split(',');
            where.profileId = { [Op.in]: profileIds };
        } else if (filters.responsibleId) {
            const responsibleIds = Array.isArray(filters.responsibleId) ? filters.responsibleId : filters.responsibleId.split(',');
            where.profileId = { [Op.in]: responsibleIds };
        }

        const cageWhere = {};
        if (filters.cageType) {
            const cageTypes = Array.isArray(filters.cageType) ? filters.cageType : filters.cageType.split(',');
            cageWhere.type = { [Op.in]: cageTypes };
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
        const where = { galponId };
        if (cageIds !== null) {
            where.cageId = { [Op.in]: cageIds };
        }

        if (filters.startDate && filters.endDate) {
            where.cleaningDate = {
                [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
            };
        } else if (filters.startDate) {
            where.cleaningDate = { [Op.gte]: new Date(filters.startDate) };
        } else if (filters.endDate) {
            where.cleaningDate = { [Op.lte]: new Date(filters.endDate) };
        }

        if (filters.profileId) {
            const profileIds = Array.isArray(filters.profileId) ? filters.profileId : filters.profileId.split(',');
            where.profileId = { [Op.in]: profileIds };
        } else if (filters.responsibleId) {
            const responsibleIds = Array.isArray(filters.responsibleId) ? filters.responsibleId : filters.responsibleId.split(',');
            where.profileId = { [Op.in]: responsibleIds };
        }

        const cageWhere = {};
        if (filters.cageType) {
            const cageTypes = Array.isArray(filters.cageType) ? filters.cageType : filters.cageType.split(',');
            cageWhere.type = { [Op.in]: cageTypes };
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
