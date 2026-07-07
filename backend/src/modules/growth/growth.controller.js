const growthService = require('./growth.service');
const AppError = require('../../errors/AppError');

class GrowthController {
    async getHistory(req, res, next) {
        try {
            const { rabbitId } = req.params;
            const history = await growthService.getHistory(rabbitId);
            
            res.status(200).json({
                status: 'success',
                data: history
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new GrowthController();
