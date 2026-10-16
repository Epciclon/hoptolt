const cron = require('node-cron');
const notificationService = require('../../modules/notification/notification.service');

/**
 * Cron Job para Recordatorios de Alimentación.
 * Se ejecuta de manera asíncrona en el servidor en segundo plano.
 * Evalúa las ventanas de corte del turno (mañana y tarde) y refresca
 * las alertas cada intervalo (10 minutos en pruebas / 1 hora habitual)
 * emitiendo eventos en tiempo real hacia los usuarios.
 */
const startFeedingCron = () => {
    // Ejecutar cada minuto ('* * * * *') para detectar de inmediato la apertura de turnos y cumplimiento de intervalos
    cron.schedule('* * * * *', async () => {
        try {
            await notificationService.checkAllProfilesFeedingNotifications();
        } catch (error) {
            console.error('Error en el cron de recordatorios de alimentación:', error.message);
        }
    });

    // Ejecutar una verificación inicial al levantar el servidor
    notificationService.checkAllProfilesFeedingNotifications().catch(err => {
        console.error('Error en verificación inicial de recordatorios de alimentación:', err.message);
    });
};

module.exports = startFeedingCron;
