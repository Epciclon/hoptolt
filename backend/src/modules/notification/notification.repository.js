const { Notification } = require('../../domain/models');

class NotificationRepository {
    constructor() {
        this.Notification = Notification;
    }

    async create(notificationData) {
        return await this.Notification.create(notificationData);
    }

    async findByProfileId(profileId, options = {}) {
        const { limit = 20, offset = 0, unreadOnly = false } = options;
        
        const where = { profileId };
        if (unreadOnly) {
            where.read = false;
        }

        return await this.Notification.findAll({
            where,
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });
    }

    async findById(id) {
        return await this.Notification.findByPk(id);
    }

    async markAsRead(id) {
        const notification = await this.findById(id);
        if (!notification) return null;
        
        await notification.update({ read: true });
        return notification;
    }

    async markAllAsRead(profileId) {
        return await this.Notification.update(
            { read: true },
            { where: { profileId, read: false } }
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
