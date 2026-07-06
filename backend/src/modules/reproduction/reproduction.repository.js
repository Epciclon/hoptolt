const { Reproduction, Rabbit, Assignment, Cage, Profile } = require('../../domain/models');
const { Op } = require('sequelize');

class ReproductionRepository {
    async findByFemaleId(femaleId) {
        return Reproduction.findAll({ where: { femaleId } });
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
        const whereClause = { galponId };
        if (options.status) {
            whereClause.status = options.status.includes(',') ? { [Op.in]: options.status.split(',') } : options.status;
        }

        if (filters.startDate && filters.endDate) {
            whereClause.createdAt = {
                [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
            };
        } else if (filters.startDate) {
            whereClause.createdAt = { [Op.gte]: new Date(filters.startDate) };
        } else if (filters.endDate) {
            whereClause.createdAt = { [Op.lte]: new Date(filters.endDate) };
        }

        if (filters.profileId) {
            const profileIds = Array.isArray(filters.profileId) ? filters.profileId : filters.profileId.split(',');
            whereClause.profileId = { [Op.in]: profileIds };
        }

        const rabbitWhere = {};
        if (filters.races) {
            const racesArray = Array.isArray(filters.races) ? filters.races : filters.races.split(',');
            rabbitWhere.race = { [Op.in]: racesArray };
        }

        const includeFemale = {
            model: Rabbit,
            as: 'female',
            attributes: ['id', 'code', 'name', 'race', 'imageUrl', 'age', 'weight'],
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

        if (options.search) {
            const search = `%${options.search}%`;
            // Búsqueda por nombre o código de la hembra
            includeFemale.where = {
                ...rabbitWhere,
                [Op.or]: [
                    { name: { [Op.iLike]: search } },
                    { code: { [Op.iLike]: search } }
                ]
            };
        } else if (Object.keys(rabbitWhere).length > 0) {
            includeFemale.where = rabbitWhere;
            includeFemale.required = true;
        }

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
        const whereClause = { galponId };
        if (options.status) {
            whereClause.status = options.status.includes(',') ? { [Op.in]: options.status.split(',') } : options.status;
        }
        
        if (filters.startDate && filters.endDate) {
            whereClause.createdAt = {
                [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
            };
        } else if (filters.startDate) {
            whereClause.createdAt = { [Op.gte]: new Date(filters.startDate) };
        } else if (filters.endDate) {
            whereClause.createdAt = { [Op.lte]: new Date(filters.endDate) };
        }

        if (filters.profileId) {
            const profileIds = Array.isArray(filters.profileId) ? filters.profileId : filters.profileId.split(',');
            whereClause.profileId = { [Op.in]: profileIds };
        }

        const countOptions = { where: whereClause };

        const rabbitWhere = {};
        if (filters.races) {
            const racesArray = Array.isArray(filters.races) ? filters.races : filters.races.split(',');
            rabbitWhere.race = { [Op.in]: racesArray };
        }
        
        if (options.search) {
            const search = `%${options.search}%`;
            countOptions.include = [{
                model: Rabbit,
                as: 'female',
                attributes: [],
                where: {
                    ...rabbitWhere,
                    [Op.or]: [
                        { name: { [Op.iLike]: search } },
                        { code: { [Op.iLike]: search } }
                    ]
                }
            }];
        } else if (Object.keys(rabbitWhere).length > 0) {
            countOptions.include = [{
                model: Rabbit,
                as: 'female',
                attributes: [],
                where: rabbitWhere,
                required: true
            }];
        }
        
        return Reproduction.count(countOptions);
    }

    async findById(id) {
        return Reproduction.findByPk(id);
    }

    async findAll() {
        return Reproduction.findAll();
    }

    async findByMonthAndGalpon(galponId, year, month, cageIds = null) {
        const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const endStr = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;

        const whereClause = {
            galponId,
            estimatedBirthDate: {
                [Op.between]: [startStr, endStr]
            }
        };

        const includeOptions = [
            {
                model: Rabbit,
                as: 'female',
                attributes: ['id', 'code', 'name', 'imageUrl'],
                include: [
                    {
                        model: Assignment,
                        as: 'assignments',
                        where: { status: 'asignado' },
                        required: true,
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
                required: false
            }
        ];

        // Si se proporcionan cageIds, filtrar por jaulas (para trabajadores)
        if (cageIds !== null) {
            includeOptions[0].include[0].include[0].where = {
                id: { [Op.in]: cageIds }
            };
            includeOptions[0].include[0].include[0].required = true;
        }

        return Reproduction.findAll({
            where: whereClause,
            include: includeOptions,
            order: [['estimatedBirthDate', 'ASC']]
        });
    }

    async findByDayAndGalpon(galponId, year, month, day, cageIds = null) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const whereClause = {
            galponId,
            estimatedBirthDate: dateStr
        };

        const includeOptions = [
            {
                model: Rabbit,
                as: 'female',
                attributes: ['id', 'code', 'name', 'imageUrl'],
                paranoid: false,
                include: [
                    {
                        model: Assignment,
                        as: 'assignments',
                        where: { status: 'asignado' },
                        required: true,
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

        return Reproduction.findAll({
            where: whereClause,
            include: includeOptions,
            order: [['estimatedBirthDate', 'ASC']]
        });
    }

    async findByIdWithDetails(id) {
        return Reproduction.findByPk(id, {
            include: [
                {
                    model: Rabbit,
                    as: 'female',
                    attributes: ['id', 'code', 'name', 'sex', 'birthDate', 'weight', 'purpose', 'imageUrl'],
                    include: [
                        {
                            model: Assignment,
                            as: 'assignments',
                            where: { status: 'asignado' },
                            required: true,
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
