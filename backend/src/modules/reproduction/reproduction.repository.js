const { Reproduction, Rabbit, Assignment, Cage } = require('../../domain/models');
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

    async findByGalponId(galponId, options = {}) {
        return Reproduction.findAll({
            where: { galponId },
            include: [
                {
                    model: Rabbit,
                    as: 'female',
                    attributes: ['id', 'code', 'name'],
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
                    attributes: ['id', 'code', 'name'],
                    required: false
                }
            ],
            ...options
        });
    }

    async countByGalponId(galponId) {
        return Reproduction.count({ where: { galponId } });
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
                attributes: ['id', 'code', 'name'],
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
                attributes: ['id', 'code', 'name'],
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
                attributes: ['id', 'code', 'name'],
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
                attributes: ['id', 'code', 'name'],
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

    async findByIdWithDetails(id) {
        return Reproduction.findByPk(id, {
            include: [
                {
                    model: Rabbit,
                    as: 'female',
                    attributes: ['id', 'code', 'name', 'sex', 'birthDate', 'weight', 'purpose'],
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
                    attributes: ['id', 'code', 'name', 'sex', 'birthDate', 'weight', 'purpose'],
                    required: false
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
