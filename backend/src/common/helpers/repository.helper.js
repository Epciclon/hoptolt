const { Op } = require('sequelize');
const AppError = require('../../errors/AppError');
const { getPaginationParams, createPaginatedResponse } = require('./pagination.helper');

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

const buildCommonFilters = (filters, dateFieldName = null, hasDirectCageId = false) => {
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
    if (filters.cageId || filters.cageIds) {
        const parsedCageIds = parseArrayFilter(filters.cageId || filters.cageIds);
        if (parsedCageIds && parsedCageIds.length > 0) {
            if (hasDirectCageId) {
                whereClause.cageId = { [Op.in]: parsedCageIds };
            }
            cageWhere.id = { [Op.in]: parsedCageIds };
        } else {
            if (hasDirectCageId) {
                whereClause.cageId = -1;
            }
            cageWhere.id = -1;
        }
    }

    return { whereClause, rabbitWhere, cageWhere };
};

const buildRabbitProfileIncludes = (rabbitWhere = {}, cageWhere = {}) => {
    const { Rabbit, Assignment, Cage, Profile } = require('../../domain/models');
    const hasCageWhere = Boolean(cageWhere && Object.keys(cageWhere).length > 0);
    return [
        { 
            model: Rabbit, 
            as: 'rabbit',
            where: (rabbitWhere && Object.keys(rabbitWhere).length > 0) ? rabbitWhere : undefined,
            required: true,
            include: [{
                model: Assignment,
                as: 'assignments',
                where: { status: 'asignado' },
                required: hasCageWhere,
                include: [{
                    model: Cage,
                    as: 'cage',
                    where: hasCageWhere ? cageWhere : undefined,
                    required: hasCageWhere,
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

const findRecordsByGalponId = (Model, dateFieldName, galponId, options = {}, filters = {}) => {
    const { whereClause: filtersWhere, rabbitWhere, cageWhere } = buildCommonFilters(filters, dateFieldName);
    const whereClause = { galponId, ...filtersWhere };

    return Model.findAll({
        where: whereClause,
        include: buildRabbitProfileIncludes(rabbitWhere, cageWhere),
        order: [[dateFieldName, 'DESC']],
        ...options,
        subQuery: false
    });
};

const countRecordsByGalponId = (Model, dateFieldName, galponId, filters = {}) => {
    const { whereClause: filtersWhere, rabbitWhere, cageWhere } = buildCommonFilters(filters, dateFieldName);
    const whereClause = { galponId, ...filtersWhere };

    const hasCageFilter = cageWhere && Object.keys(cageWhere).length > 0;
    const hasRabbitFilter = rabbitWhere && Object.keys(rabbitWhere).length > 0;

    if (hasCageFilter || hasRabbitFilter) {
        return Model.count({
            where: whereClause,
            include: buildRabbitProfileIncludes(rabbitWhere, cageWhere),
            distinct: true
        });
    }

    return Model.count({ where: whereClause });
};

const validateWorkerAssignedCages = async (membership, assignments, errorMessage) => {
    if (membership.role !== 'worker') return;
    const { WorkerCage } = require('../../domain/models');
    const workerCages = await WorkerCage.findAll({ where: { farmMemberId: membership.id } });
    const assignedCageIds = new Set(workerCages.map(wc => Number(wc.cageId)));
    for (const assignment of assignments) {
        if (!assignedCageIds.has(Number(assignment.cageId))) {
            throw new AppError(errorMessage, 403);
        }
    }
};

const fetchPaginatedGalponRecords = async (repository, galponId, profileId, page = 1, limit = 10, filters = {}) => {
    if (!galponId) return createPaginatedResponse([], page, limit, 0);

    const { FarmMember, WorkerCage } = require('../../domain/models');
    const membership = await FarmMember.findOne({
        where: { profileId, galponId, status: 'active' }
    });
    if (!membership) throw new AppError('No tienes acceso a este galpón.', 403);

    if (membership.role === 'worker' && !filters.rabbitId && Number(limit) < 1000) {
        const workerCages = await WorkerCage.findAll({ where: { farmMemberId: membership.id } });
        filters.cageIds = workerCages.map(wc => Number(wc.cageId));
    }

    const { limit: limitValue, offset } = getPaginationParams(page, limit);
    const queryOptions = filters.all ? {} : { limit: limitValue, offset };

    const [records, count] = await Promise.all([
        repository.findByGalponId(galponId, queryOptions, filters),
        filters.all ? Promise.resolve(0) : repository.countByGalponId(galponId, filters)
    ]);

    return createPaginatedResponse(records, page, limit, filters.all ? records.length : count);
};

module.exports = {
    buildCommonFilters,
    buildRabbitProfileIncludes,
    buildRabbitCountInclude,
    findRecordsByGalponId,
    countRecordsByGalponId,
    validateWorkerAssignedCages,
    fetchPaginatedGalponRecords
};
