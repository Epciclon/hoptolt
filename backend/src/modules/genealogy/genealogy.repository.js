const { Genealogy, Rabbit } = require('../../domain/models');
const { Op } = require('sequelize');

class GenealogyRepository {
    async findByRabbitId(rabbitId) {
        return Genealogy.findOne({ 
            where: { rabbitId }, 
            include: [
                { model: Rabbit, as: 'rabbit' },
                { model: Rabbit, as: 'father' },
                { model: Rabbit, as: 'mother' }
            ]
        });
    }

    async findByGalponId(galponId) {
        return Genealogy.findAll({ 
            where: { galponId }, 
            include: [
                { model: Rabbit, as: 'rabbit' },
                { model: Rabbit, as: 'father' },
                { model: Rabbit, as: 'mother' }
            ]
        });
    }

    async findAll() {
        return Genealogy.findAll({ 
            include: [
                { model: Rabbit, as: 'rabbit' },
                { model: Rabbit, as: 'father' },
                { model: Rabbit, as: 'mother' }
            ]
        });
    }

    async create(data) {
        return Genealogy.create(data);
    }

    async update(genealogy, data) {
        return genealogy.update(data);
    }

    async delete(genealogy) {
        return genealogy.destroy();
    }
}

module.exports = new GenealogyRepository();
