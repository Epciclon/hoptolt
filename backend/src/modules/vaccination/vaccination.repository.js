const { Vaccination } = require('../../domain/models');
const { findRecordsByGalponId, countRecordsByGalponId } = require('../../common/helpers/repository.helper');

class VaccinationRepository {
    async findByGalponId(galponId, options = {}, filters = {}) {
        return findRecordsByGalponId(Vaccination, 'vaccinationDate', galponId, options, filters);
    }

    async countByGalponId(galponId, filters = {}) {
        return countRecordsByGalponId(Vaccination, 'vaccinationDate', galponId, filters);
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
