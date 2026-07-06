const { Deworming, Rabbit } = require('../../domain/models');
const { Op } = require('sequelize');

class DewormingRepository {
    async findByGalponId(galponId, options = {}, filters = {}) {
        const whereClause = { galponId };

        if (filters.startDate && filters.endDate) {
            whereClause.dewormingDate = {
                [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
            };
        } else if (filters.startDate) {
            whereClause.dewormingDate = { [Op.gte]: new Date(filters.startDate) };
        } else if (filters.endDate) {
            whereClause.dewormingDate = { [Op.lte]: new Date(filters.endDate) };
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
        const whereClause = { galponId };

        if (filters.startDate && filters.endDate) {
            whereClause.dewormingDate = {
                [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
            };
        } else if (filters.startDate) {
            whereClause.dewormingDate = { [Op.gte]: new Date(filters.startDate) };
        } else if (filters.endDate) {
            whereClause.dewormingDate = { [Op.lte]: new Date(filters.endDate) };
        }

        if (filters.profileId) {
            const profileIds = Array.isArray(filters.profileId) ? filters.profileId : filters.profileId.split(',');
            whereClause.profileId = { [Op.in]: profileIds };
        }

        if (filters.races) {
            const racesArray = Array.isArray(filters.races) ? filters.races : filters.races.split(',');
            return Deworming.count({
                where: whereClause,
                include: [{
                    model: Rabbit,
                    as: 'rabbit',
                    where: { race: { [Op.in]: racesArray } },
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
