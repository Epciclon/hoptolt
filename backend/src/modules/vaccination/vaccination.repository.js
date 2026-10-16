const { Vaccination } = require('../../domain/models');
const { Op } = require('sequelize');
const { buildCommonFilters, buildRabbitProfileIncludes, buildRabbitCountInclude } = require('../../common/helpers/repository.helper');

class VaccinationRepository {
    async findByGalponId(galponId, options = {}, filters = {}) {
        const { whereClause: filtersWhere, rabbitWhere, cageWhere } = buildCommonFilters(filters, 'vaccinationDate');
        const whereClause = { galponId, ...filtersWhere };

        return Vaccination.findAll({
            where: whereClause,
            include: buildRabbitProfileIncludes(rabbitWhere, cageWhere),
            order: [['vaccinationDate', 'DESC']],
            ...options
        });
    }

    async countByGalponId(galponId, filters = {}) {
        const { whereClause: filtersWhere, rabbitWhere, cageWhere } = buildCommonFilters(filters, 'vaccinationDate');
        const whereClause = { galponId, ...filtersWhere };

        const hasCageFilter = cageWhere && Object.keys(cageWhere).length > 0;
        const hasRabbitFilter = rabbitWhere && Object.keys(rabbitWhere).length > 0;

        if (hasCageFilter || hasRabbitFilter) {
            return Vaccination.count({
                where: whereClause,
                include: buildRabbitProfileIncludes(rabbitWhere, cageWhere),
                distinct: true
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
