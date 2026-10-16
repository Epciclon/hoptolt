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
        }

        if (filter === 'feeding') {
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

        return { [Op.and]: andClauses };
    }

    async findByProfileId(profileId, options = {}) {
        const { limit = 12, offset = 0 } = options;
        const where = this._buildWhereClause(profileId, options);

        return await this.Notification.findAll({
            where,
            order: [
                [
                    Sequelize.literal(`CASE 
                        WHEN "type" = 'warning' AND ("data"->>'type') = 'feeding_reminder' THEN 0 
                        WHEN "type" = 'warning' THEN 1 
                        ELSE 2 
                    END`),
                    'ASC'
                ],
                ['createdAt', 'DESC']
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
        if (notification.type === 'warning') return notification;
        
        await notification.update({ read: true });
        return notification;
    }

    async markAllAsRead(profileId) {
        const { Op } = require('sequelize');
        return await this.Notification.update(
            { read: true },
            { 
                where: { 
                    profileId, 
                    read: false,
                    type: { [Op.ne]: 'warning' }
                } 
            }
        );
    }

    async delete(id) {
        const notification = await this.findById(id);
        if (!notification) return false;
        
        await notification.destroy();
        return true;
    }

    async countUnread(profileId) {
        return await this.Notification.count({
            where: { profileId, read: false }
        });
    }
}

module.exports = new NotificationRepository();
