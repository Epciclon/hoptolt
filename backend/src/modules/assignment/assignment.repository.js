const { Assignment } = require('../../domain/models');

class AssignmentRepository {
    async findById(id) {
        return Assignment.findByPk(id);
    }

    async findActiveByRabbitId(rabbitId) {
        return Assignment.findOne({ where: { rabbitId, status: 'asignado' } });
    }

    async findActiveByRabbitCode(rabbitCode) {
        return Assignment.findOne({ where: { rabbitCode, status: 'asignado' } });
    }

    async countActiveByCageNumber(cageNumber) {
        return Assignment.count({ where: { cageNumber, status: 'asignado' } });
    }

    async countActiveByCageId(cageId) {
        return Assignment.count({ where: { cageId, status: 'asignado' } });
    }

    async findActiveByCageId(cageId) {
        return Assignment.findAll({ where: { cageId, status: 'asignado' } });
    }

    async findAllActive() {
        return Assignment.findAll({ where: { status: 'asignado' } });
    }

    async findByGalponId(galponId) {
        return Assignment.findAll({ 
            where: { galponId, status: 'asignado' },
            include: [
                { model: require('../../domain/models').Rabbit, as: 'rabbit' },
                { model: require('../../domain/models').Cage, as: 'cage' }
            ]
        });
    }

    async findAll() {
        return Assignment.findAll();
    }

    async create(data) {
        return Assignment.create(data);
    }

    async update(assignment, data) {
        return assignment.update(data);
    }

    async delete(assignment) {
        return assignment.destroy();
    }
}

module.exports = new AssignmentRepository();
