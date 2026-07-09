const { Op } = require('sequelize');

const parseArrayFilter = (filterValue) => {
    if (!filterValue) return null;
    return Array.isArray(filterValue) ? filterValue : filterValue.split(',');
};

const applyDateFilter = (whereClause, filters, dateFieldName) => {
    if (!dateFieldName) return;
    
    if (filters.startDate && filters.endDate) {
        whereClause[dateFieldName] = { [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)] };
    } else if (filters.startDate) {
        whereClause[dateFieldName] = { [Op.gte]: new Date(filters.startDate) };
    } else if (filters.endDate) {
        whereClause[dateFieldName] = { [Op.lte]: new Date(filters.endDate) };
    }
};

const applyProfileFilter = (whereClause, filters) => {
    const profileIdFilter = filters.profileId || filters.responsibleId;
    if (profileIdFilter) {
        whereClause.profileId = { [Op.in]: parseArrayFilter(profileIdFilter) };
    }
};

const buildCommonFilters = (filters, dateFieldName = null) => {
    const whereClause = {};
    applyDateFilter(whereClause, filters, dateFieldName);
    applyProfileFilter(whereClause, filters);

    const rabbitWhere = {};
    if (filters.races) {
        rabbitWhere.race = { [Op.in]: parseArrayFilter(filters.races) };
    }

    const cageWhere = {};
    if (filters.cageType) {
        cageWhere.type = { [Op.in]: parseArrayFilter(filters.cageType) };
    }

    return { whereClause, rabbitWhere, cageWhere };
};

const buildRabbitProfileIncludes = (rabbitWhere) => {
    const { Rabbit, Assignment, Cage, Profile } = require('../../domain/models');
    return [
        { 
            model: Rabbit, 
            as: 'rabbit',
            where: Object.keys(rabbitWhere).length > 0 ? rabbitWhere : undefined,
            required: true,
            include: [{
                model: Assignment,
                as: 'assignments',
                where: { status: 'asignado' },
                required: true,
                include: [{
                    model: Cage,
                    as: 'cage',
                    attributes: ['id', 'number']
                }]
            }]
        },
        { model: Profile, as: 'profile', attributes: ['username', 'fullName', 'email'] }
    ];
};

const buildRabbitCountInclude = (rabbitWhere) => {
    const { Rabbit } = require('../../domain/models');
    return [{
        model: Rabbit,
        as: 'rabbit',
        where: rabbitWhere,
        required: true
    }];
};

module.exports = { buildCommonFilters, buildRabbitProfileIncludes, buildRabbitCountInclude };
