const { Vaccination } = require('../../domain/models');
const { Op } = require('sequelize');

class VaccinationRepository {
    async findByGalponId(galponId, options = {}) {
        return Vaccination.findAll({
            where: { galponId },
            ...options
        });
    }

    async countByGalponId(galponId) {
        return Vaccination.count({ where: { galponId } });
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
