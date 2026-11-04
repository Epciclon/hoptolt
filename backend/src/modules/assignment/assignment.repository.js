const { Assignment, Rabbit, Cage } = require('../../domain/models');
const { Op } = require('sequelize');

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

    async countActiveByCageIds(cageIds) {
        if (!Array.isArray(cageIds) || cageIds.length === 0) return new Map();
        const rows = await Assignment.findAll({
            where: { cageId: { [Op.in]: cageIds }, status: 'asignado' },
            attributes: ['cageId']
        });
        const counts = new Map();
        for (const r of rows) {
            const cid = Number(r.cageId);
            counts.set(cid, (counts.get(cid) || 0) + 1);
        }
        return counts;
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
                { model: Rabbit, as: 'rabbit' },
                { model: Cage, as: 'cage' }
            ]
        });
    }

    async findAll(options = {}) {
        return Assignment.findAll(options);
    }

    async create(data) {
        return Assignment.create(data);
    }

    async bulkCreate(dataArray) {
        return Assignment.bulkCreate(dataArray);
    }

    async update(assignment, data) {
        return assignment.update(data);
    }

    async delete(assignment) {
        return assignment.destroy();
    }
}

module.exports = new AssignmentRepository();
