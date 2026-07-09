const { Vaccination, Rabbit } = require('../../domain/models');
const { Op } = require('sequelize');
const { buildCommonFilters } = require('../../common/helpers/repository.helper');

class VaccinationRepository {
    async findByGalponId(galponId, options = {}, filters = {}) {
        const { whereClause: filtersWhere, rabbitWhere } = buildCommonFilters(filters, 'vaccinationDate');
        const whereClause = { galponId, ...filtersWhere };

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
        const { whereClause: filtersWhere, rabbitWhere } = buildCommonFilters(filters, 'vaccinationDate');
        const whereClause = { galponId, ...filtersWhere };

        if (filters.races) {
            return Vaccination.count({
                where: whereClause,
                include: [{
                    model: Rabbit,
                    as: 'rabbit',
                    where: rabbitWhere,
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
