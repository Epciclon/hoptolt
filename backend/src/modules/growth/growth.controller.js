const growthService = require('./growth.service');
const AppError = require('../../errors/AppError');

class GrowthController {
    async respondToEstimation(req, res, next) {
        try {
            const { notificationId } = req.params;
            const { action, rabbitId } = req.body; // accept, reject, revert
            const profileId = req.user.id;

            if (!['accept', 'reject', 'revert'].includes(action)) {
                throw new AppError('Acción inválida. Debe ser accept, reject o revert.', 400);
            }

            const result = await growthService.respondToWeightEstimation(notificationId, profileId, action, rabbitId);
            
            res.status(200).json({
                status: 'success',
                message: result.message,
                data: result.notification ? { notification: result.notification } : null
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new GrowthController();
