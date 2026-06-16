const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');
const { authenticate } = require('../../common/middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Crear notificación (solo para uso interno del sistema)
router.post('/', notificationController.createNotification);

// Obtener notificaciones del usuario actual
router.get('/', notificationController.getMyNotifications);

// Obtener contador de notificaciones no leídas
router.get('/unread-count', notificationController.getUnreadCount);

// Marcar notificación como leída
router.patch('/:id/read', notificationController.markAsRead);

// Marcar todas las notificaciones como leídas
router.patch('/mark-all-read', notificationController.markAllAsRead);

// Eliminar notificación
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
