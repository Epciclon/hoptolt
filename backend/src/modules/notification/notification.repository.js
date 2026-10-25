const { Notification } = require('../../domain/models');
const { Sequelize } = require('sequelize');

class NotificationRepository {
    constructor() {
        this.Notification = Notification;
    }

    async create(notificationData) {
        return await this.Notification.create(notificationData);
    }

    _buildWhereClause(profileId, options = {}) {
        const { Op } = require('sequelize');
        const { unreadOnly = false, filter = 'all', search } = options;

        const andClauses = [{ profileId }];

        if (unreadOnly || filter === 'unread') {
            andClauses.push({ read: false });
        } else if (filter === 'read') {
            andClauses.push({ read: true });
        }

        if (filter === 'alerts' || filter === 'warning') {
            andClauses.push({
                [Op.or]: [
                    { type: 'warning' },
                    Sequelize.literal(`("data"->>'type') IN ('feeding_reminder', 'cleaning_warning', 'birth_warning', 'weaning_alert')`)
                ]
            });
        } else if (filter === 'notices') {
            andClauses.push({
                [Op.and]: [
                    { type: { [Op.ne]: 'warning' } },
                    Sequelize.literal(`COALESCE(("data"->>'type'), '') NOT IN ('feeding_reminder', 'cleaning_warning', 'birth_warning', 'weaning_alert')`)
                ]
            });
        } else if (filter === 'feeding') {
            andClauses.push(Sequelize.literal(`("data"->>'type') = 'feeding_reminder'`));
        } else if (filter === 'cleaning') {
            andClauses.push(Sequelize.literal(`("data"->>'type') = 'cleaning_warning'`));
        } else if (filter === 'growth') {
            andClauses.push(Sequelize.literal(`("data"->>'type') IN ('growth_summary', 'weight_estimation', 'weight_estimations', 'age_update')`));
        } else if (filter === 'reproduction') {
            andClauses.push(Sequelize.literal(`("data"->>'type') IN ('birth_warning', 'weaning_alert', 'reproduction_manual', 'reproduction_automated')`));
        } else if (filter === 'activity') {
            andClauses.push(Sequelize.literal(`("data"->>'type') = 'worker_action'`));
        } else if (filter === 'invitation') {
            andClauses.push({
                [Op.or]: [
                    { type: 'invitation' },
                    { title: { [Op.iLike]: '%trabajador en tu galpón%' } },
                    { title: { [Op.iLike]: '%unido al galpón%' } }
                ]
            });
        }

        if (search && search.trim()) {
            const term = `%${search.trim()}%`;
            andClauses.push({
                [Op.or]: [
                    { title: { [Op.iLike]: term } },
                    { message: { [Op.iLike]: term } }
                ]
            });
        }

        // Las novedades operativas corresponden a su propio módulo y widget flotante
        andClauses.push(
            Sequelize.literal(`COALESCE(("data"->>'type'), '') NOT IN ('incident', 'incident_response')`),
            {
                title: { [Op.notILike]: '%novedad%' }
            }
        );

        return { [Op.and]: andClauses };
    }

    async findByProfileId(profileId, options = {}) {
        const { limit = 12, offset = 0 } = options;
        const where = this._buildWhereClause(profileId, options);

        return await this.Notification.findAll({
            where,
            order: [
                ['updatedAt', 'DESC']
            ],
            limit,
            offset
        });
    }

    async countByProfileId(profileId, options = {}) {
        const where = this._buildWhereClause(profileId, options);
        return await this.Notification.count({ where });
    }

    async findById(id) {
        return await this.Notification.findByPk(id);
    }

    async markAsRead(id) {
        const notification = await this.findById(id);
        if (!notification) return null;
        
        // Las advertencias operativas (alimentación, limpieza, destete, parto) se marcan cuando se realiza la labor en el módulo
        const d = notification.data || {};
        const isTaskReminder = !d.isContract && (
            notification.type === 'warning' ||
            d.type === 'feeding_reminder' ||
            d.type === 'cleaning_warning' ||
            d.type === 'birth_warning' ||
            d.type === 'weaning_alert'
        );
        if (isTaskReminder) return notification;

        await notification.update({ read: true });
        return notification;
    }

    async markAllAsRead(profileId) {
        const { Op } = require('sequelize');
        const unreadNotifications = await this.Notification.findAll({
            where: { profileId, read: false }
        });

        const idsToMark = unreadNotifications
            .filter(n => {
                const d = n.data || {};
                const isTaskReminder = !d.isContract && (
                    n.type === 'warning' ||
                    d.type === 'feeding_reminder' ||
                    d.type === 'cleaning_warning' ||
                    d.type === 'birth_warning' ||
                    d.type === 'weaning_alert'
                );
                return !isTaskReminder;
            })
            .map(n => n.id);

        if (idsToMark.length > 0) {
            await this.Notification.update(
                { read: true },
                { where: { id: { [Op.in]: idsToMark } } }
            );
        }
        return true;
    }

    async delete(id) {
        const notification = await this.findById(id);
        if (!notification) return false;
        
        await notification.destroy();
        return true;
    }

    async countUnread(profileId, filter) {
        const where = this._buildWhereClause(profileId, { unreadOnly: true, filter });
        return await this.Notification.count({ where });
    }
}

module.exports = new NotificationRepository();
