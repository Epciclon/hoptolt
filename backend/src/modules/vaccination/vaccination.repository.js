const { Vaccination, Rabbit } = require('../../domain/models');
const { Op } = require('sequelize');

class VaccinationRepository {
    async findByGalponId(galponId, options = {}, filters = {}) {
        const whereClause = { galponId };

        if (filters.startDate && filters.endDate) {
            whereClause.vaccinationDate = {
                [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
            };
        } else if (filters.startDate) {
            whereClause.vaccinationDate = { [Op.gte]: new Date(filters.startDate) };
        } else if (filters.endDate) {
            whereClause.vaccinationDate = { [Op.lte]: new Date(filters.endDate) };
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

        return Vaccination.findAll({
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
            order: [['vaccinationDate', 'DESC']],
            ...options
        });
    }

    async countByGalponId(galponId, filters = {}) {
        const whereClause = { galponId };

        if (filters.startDate && filters.endDate) {
            whereClause.vaccinationDate = {
                [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
            };
        } else if (filters.startDate) {
            whereClause.vaccinationDate = { [Op.gte]: new Date(filters.startDate) };
        } else if (filters.endDate) {
            whereClause.vaccinationDate = { [Op.lte]: new Date(filters.endDate) };
        }

        if (filters.profileId) {
            const profileIds = Array.isArray(filters.profileId) ? filters.profileId : filters.profileId.split(',');
            whereClause.profileId = { [Op.in]: profileIds };
        }

        if (filters.races) {
            const racesArray = Array.isArray(filters.races) ? filters.races : filters.races.split(',');
            return Vaccination.count({
                where: whereClause,
                include: [{
                    model: Rabbit,
                    as: 'rabbit',
                    where: { race: { [Op.in]: racesArray } },
                    required: true
                }]
            });
        }

        return Vaccination.count({ where: whereClause });
    }

    async findByRabbitId(rabbitId) {
        return Vaccination.findAll({ where: { rabbitId } });
    }

    async findLastVaccinationByRabbitAndVaccine(rabbitId, vaccineName) {
        const vaccinations = await Vaccination.findAll({
            where: { rabbitId },
            order: [['vaccinationDate', 'DESC']]
        });
        
        for (const vaccination of vaccinations) {
            if (Array.isArray(vaccination.vaccines) && vaccination.vaccines.includes(vaccineName)) {
                return vaccination;
            }
        }
        
        return null;
    }

    async findAll() {
        return Vaccination.findAll();
    }

    async create(data) {
        return Vaccination.create(data);
    }
}

module.exports = new VaccinationRepository();
