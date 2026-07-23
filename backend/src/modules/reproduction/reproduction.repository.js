const { Reproduction, Rabbit, Assignment, Cage, Profile } = require('../../domain/models');
const { Op } = require('sequelize');
const { buildCommonFilters } = require('../../common/helpers/repository.helper');

class ReproductionRepository {
    async findByFemaleId(femaleId) {
        return Reproduction.findAll({ where: { femaleId } });
    }

    async findLactatingFemaleIds(galponId) {
        const reps = await Reproduction.findAll({
            where: { galponId, status: 'lactancia' },
            attributes: ['femaleId']
        });
        return new Set(reps.map(r => r.femaleId));
    }

    async findActiveMountByFemaleId(femaleId) {
        const dateStr = new Date().toLocaleDateString('sv', { timeZone: 'America/Guayaquil' });
        return Reproduction.findOne({
            where: {
                femaleId,
                estimatedBirthDate: {
                    [Op.gte]: dateStr
                }
            },
            order: [['mountDate', 'DESC']]
        });
    }

    async findByGalponId(galponId, options = {}, filters = {}) {
        const { whereClause: filtersWhere, rabbitWhere } = buildCommonFilters(filters, 'createdAt');
        const whereClause = { galponId, ...filtersWhere };
        if (options.status) {
            whereClause.status = options.status.includes(',') ? { [Op.in]: options.status.split(',') } : options.status;
        }

        const includeFemale = {
            model: Rabbit,
            as: 'female',
            attributes: ['id', 'code', 'name', 'race', 'imageUrl', 'age', 'weight', 'deletedAt'],
            paranoid: false,
            include: [
                {
                    model: Assignment,
                    as: 'assignments',
                    where: { status: 'asignado' },
                    required: false,
                    include: [
                        {
                            model: Cage,
                            as: 'cage',
                            attributes: ['id', 'number', 'type']
                        }
                    ]
                }
            ]
        };

        this._applySearchFiltersToIncludeFemale(includeFemale, options, rabbitWhere);

        return Reproduction.findAll({
            where: whereClause,
            include: [
                includeFemale,
                {
                    model: Rabbit,
                    as: 'male',
                    attributes: ['id', 'code', 'name', 'imageUrl', 'race'],
                    required: false,
                    paranoid: false
                },
                {
                    model: Profile,
                    as: 'profile',
                    attributes: ['username', 'fullName', 'email'],
                    required: false
                }
            ],
            limit: options.limit,
            offset: options.offset,
            order: [['createdAt', 'DESC']]
        });
    }

    async countByGalponId(galponId, options = {}, filters = {}) {
        const { whereClause: filtersWhere, rabbitWhere } = buildCommonFilters(filters, 'createdAt');
        const whereClause = { galponId, ...filtersWhere };
        if (options.status) {
            whereClause.status = options.status.includes(',') ? { [Op.in]: options.status.split(',') } : options.status;
        }

        const countOptions = { where: whereClause };

        const includeFemale = {
            model: Rabbit,
            as: 'female',
            attributes: [],
            required: false
        };

        this._applySearchFiltersToIncludeFemale(includeFemale, options, rabbitWhere);

        if (includeFemale.where || includeFemale.required) {
            countOptions.include = [includeFemale];
        }

        return Reproduction.count(countOptions);
    }

    _applySearchFiltersToIncludeFemale(includeFemale, options, rabbitWhere) {
        if (options.search) {
            const search = `%${options.search}%`;
            includeFemale.where = {
                ...rabbitWhere,
                [Op.or]: [
                    { name: { [Op.iLike]: search } },
                    { code: { [Op.iLike]: search } }
                ]
            };
            includeFemale.required = true; // when searching, the join must be required to filter results
        } else if (Object.keys(rabbitWhere).length > 0) {
            includeFemale.where = rabbitWhere;
            includeFemale.required = true;
        }
    }

    async findById(id) {
        return Reproduction.findByPk(id);
    }

    async findAll(options = {}) {
        return Reproduction.findAll(options);
    }

    async findByGalponAndStatuses(galponId, statuses) {
        return Reproduction.findAll({
            where: { galponId, status: { [Op.in]: statuses } }
        });
    }

    async findByMonthAndGalpon(galponId, year, month, cageIds = null) {
        const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const endStr = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;

        const { includeOptions, whereClause } = this._getFindOptionsByDateAndGalpon(galponId, cageIds);
        whereClause.estimatedBirthDate = {
            [Op.between]: [startStr, endStr]
        };

        const results = await Reproduction.findAll({
            where: whereClause,
            include: includeOptions,
            order: [['estimatedBirthDate', 'ASC']]
        });

        // Filter out records that have already given birth (lactancia, completado) or failed
        return results.filter(r => ['monta', 'gestacion'].includes(r.status));
    }

    async findByDayAndGalpon(galponId, year, month, day, cageIds = null) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const { includeOptions, whereClause } = this._getFindOptionsByDateAndGalpon(galponId, cageIds);
        whereClause.estimatedBirthDate = dateStr;

        const results = await Reproduction.findAll({
            where: whereClause,
            include: includeOptions,
            order: [['estimatedBirthDate', 'ASC']]
        });

        return results.filter(r => ['monta', 'gestacion'].includes(r.status));
    }

    _getFindOptionsByDateAndGalpon(galponId, cageIds) {
        const whereClause = { galponId };

        const includeOptions = [
            {
                model: Rabbit,
                as: 'female',
                attributes: ['id', 'code', 'name', 'imageUrl'],
                required: true,
                include: [
                    {
                        model: Assignment,
                        as: 'assignments',
                        where: { status: 'asignado' },
                        required: false,
                        include: [
                            {
                                model: Cage,
                                as: 'cage',
                                attributes: ['id', 'number', 'type']
                            }
                        ]
                    }
                ]
            },
            {
                model: Rabbit,
                as: 'male',
                attributes: ['id', 'code', 'name', 'imageUrl'],
                required: false,
                paranoid: false
            }
        ];

        // Si se proporcionan cageIds, filtrar por jaulas (para trabajadores)
        if (cageIds !== null) {
            includeOptions[0].include[0].include[0].where = {
                id: { [Op.in]: cageIds }
            };
            includeOptions[0].include[0].include[0].required = true;
        }

        return { includeOptions, whereClause };
    }

    async findByIdWithDetails(id) {
        return Reproduction.findByPk(id, {
            include: [
                {
                    model: Rabbit,
                    as: 'female',
                    attributes: ['id', 'code', 'name', 'sex', 'birthDate', 'weight', 'purpose', 'imageUrl', 'deletedAt'],
                    paranoid: false,
                    include: [
                        {
                            model: Assignment,
                            as: 'assignments',
                            where: { status: 'asignado' },
                            required: false,
                            include: [
                                {
                                    model: Cage,
                                    as: 'cage',
                                    attributes: ['id', 'number', 'type']
                                }
                            ]
                        }
                    ]
                },
                {
                    model: Rabbit,
                    as: 'male',
                    attributes: ['id', 'code', 'name', 'sex', 'birthDate', 'weight', 'purpose', 'imageUrl'],
                    required: false,
                    paranoid: false
                }
            ]
        });
    }

    async create(data) {
        return Reproduction.create(data);
    }

    async update(reproduction, data) {
        return reproduction.update(data);
    }

    async delete(reproduction) {
        return reproduction.destroy();
    }
}

module.exports = new ReproductionRepository();
