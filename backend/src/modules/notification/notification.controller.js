const notificationService = require('./notification.service');
const { createNotificationSchema } = require('./notification.validator');
const catchAsync = require('../../common/middlewares/catchAsync');
const AppError = require('../../errors/AppError');

class NotificationController {
    // Crear notificación (solo para uso interno del sistema)
    createNotification = catchAsync(async (req, res) => {
        const { error } = createNotificationSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const notification = await notificationService.createNotification(
            req.user.id,
            req.body
        );

        res.status(201).json(notification);
    });

    // Obtener notificaciones del usuario actual
    getMyNotifications = catchAsync(async (req, res) => {
        const { limit = 20, offset = 0, unreadOnly } = req.query;
        
        const notifications = await notificationService.getNotificationsByProfile(
            req.user.id,
            {
                limit: Number.parseInt(limit),
                offset: Number.parseInt(offset),
                unreadOnly: unreadOnly === 'true'
            }
        );

        res.json(notifications);
    });

    // Obtener contador de notificaciones no leídas
    getUnreadCount = catchAsync(async (req, res) => {
        const count = await notificationService.getUnreadCount(req.user.id);
        res.json({ count });
    });

    // Marcar notificación como leída
    markAsRead = catchAsync(async (req, res) => {
        const { id } = req.params;
        const notification = await notificationService.markAsRead(id);
        
        if (!notification) {
            throw new AppError('Notificación no encontrada', 404);
        }

        res.json(notification);
    });

    // Marcar todas las notificaciones como leídas
    markAllAsRead = catchAsync(async (req, res) => {
        const result = await notificationService.markAllAsRead(req.user.id);
        res.json(result);
    });

    // Eliminar notificación
    deleteNotification = catchAsync(async (req, res) => {
        const { id } = req.params;
        const deleted = await notificationService.deleteNotification(id);
        
        if (!deleted) {
            throw new AppError('Notificación no encontrada', 404);
        }

        res.json({ success: true });
    });
}

module.exports = new NotificationController();
