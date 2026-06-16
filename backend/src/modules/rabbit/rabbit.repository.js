const { Rabbit } = require('../../domain/models');
const { Op } = require('sequelize');

class RabbitRepository {
    async findById(id) {
        return Rabbit.findByPk(id);
    }

    async findByCode(code) {
        return Rabbit.findOne({ where: { code } });
    }

    async findByRace(race) {
        return Rabbit.findAll({ where: { race } });
    }

    async findByGalpon(galponId, options = {}) {
        return Rabbit.findAll({
            where: { galponId },
            ...options
        });
    }

    async countByGalpon(galponId) {
        return Rabbit.count({ where: { galponId } });
    }

    async findByRaceAndGalpon(race, galponId) {
        return Rabbit.findAll({ where: { race, galponId } });
    }

    async findByGalponAndSexAndMinAge(galponId, sex, minAge) {
        return Rabbit.findAll({ 
            where: { 
                galponId, 
                sex,
                age: { [Op.gte]: minAge }
            } 
        });
    }

    async findAll() {
        return Rabbit.findAll();
    }

    async create(data) {
        return Rabbit.create(data);
    }

    async update(rabbit, data) {
        return rabbit.update(data);
    }

    async delete(rabbit) {
        return rabbit.destroy();
    }
}

module.exports = new RabbitRepository();
