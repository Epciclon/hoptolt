const { Op } = require('sequelize');

const buildCommonFilters = (filters, dateFieldName = null) => {
    const whereClause = {};

    if (dateFieldName) {
        if (filters.startDate && filters.endDate) {
            whereClause[dateFieldName] = {
                [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
            };
        } else if (filters.startDate) {
            whereClause[dateFieldName] = { [Op.gte]: new Date(filters.startDate) };
        } else if (filters.endDate) {
            whereClause[dateFieldName] = { [Op.lte]: new Date(filters.endDate) };
        }
    }

    if (filters.profileId) {
        const profileIds = Array.isArray(filters.profileId) ? filters.profileId : filters.profileId.split(',');
        whereClause.profileId = { [Op.in]: profileIds };
    } else if (filters.responsibleId) {
        const responsibleIds = Array.isArray(filters.responsibleId) ? filters.responsibleId : filters.responsibleId.split(',');
        whereClause.profileId = { [Op.in]: responsibleIds };
    }

    const rabbitWhere = {};
    if (filters.races) {
        const racesArray = Array.isArray(filters.races) ? filters.races : filters.races.split(',');
        rabbitWhere.race = { [Op.in]: racesArray };
    }

    const cageWhere = {};
    if (filters.cageType) {
        const cageTypes = Array.isArray(filters.cageType) ? filters.cageType : filters.cageType.split(',');
        cageWhere.type = { [Op.in]: cageTypes };
    }

    return { whereClause, rabbitWhere, cageWhere };
};

module.exports = { buildCommonFilters };
