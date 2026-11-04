const { Incident, Profile, Cage, Rabbit } = require('../../domain/models');

class IncidentRepository {
    _getBaseIncludes() {
        return [
            {
                model: Profile,
                as: 'reporter',
                attributes: ['id', 'fullName', 'username', 'email'],
                required: false
            },
            {
                model: Profile,
                as: 'reviewer',
                attributes: ['id', 'fullName', 'username', 'email'],
                required: false
            },
            {
                model: Cage,
                as: 'cage',
                attributes: ['id', 'number', 'type'],
                required: false
            },
            {
                model: Rabbit,
                as: 'rabbit',
                attributes: ['id', 'code', 'sex'],
                required: false
            }
        ];
    }

    async create(data) {
        return await Incident.create(data);
    }

    async findAndCountAll({ where = {}, limit = 12, offset = 0, order = [['createdAt', 'DESC'], ['id', 'DESC']] }) {
        return await Incident.findAndCountAll({
            where,
            limit,
            offset,
            order,
            distinct: true,
            subQuery: false,
            include: this._getBaseIncludes()
        });
    }

    async findById(id, galponId) {
        return await Incident.findOne({
            where: { id, galponId },
            include: this._getBaseIncludes()
        });
    }

    async update(id, galponId, data) {
        const incident = await Incident.findOne({ where: { id, galponId } });
        if (!incident) return null;
        return await incident.update(data);
    }

    async count(where = {}) {
        return await Incident.count({ where });
    }

    async markAllAsReadForOwner(galponId) {
        return await Incident.update(
            { ownerRead: true },
            { where: { galponId, ownerRead: false } }
        );
    }

    async markAllAsReadForWorker(profileId, galponId) {
        return await Incident.update(
            { workerRead: true },
            { where: { profileId, galponId, workerRead: false } }
        );
    }

    async delete(id, galponId) {
        return await Incident.destroy({ where: { id, galponId } });
    }
}

module.exports = new IncidentRepository();
