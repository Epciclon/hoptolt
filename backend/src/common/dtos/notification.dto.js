const toNotificationDTO = (notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data,
    read: notification.read,
    createdAt: notification.createdAt
});

module.exports = { toNotificationDTO };
