const catchAsync = require('../../common/middlewares/catchAsync');
const feedingService = require('./feeding.service');
const { toFeedingDTO } = require('../../common/dtos/feeding.dto');

exports.getFoodTypes = catchAsync(async (req, res) => {
    const foodTypes = await feedingService.getFoodTypes(req.galponId);
    res.status(200).json({ success: true, foodTypes });
});

exports.registerFeeding = catchAsync(async (req, res) => {
    const galponId = req.galponId;
    const profileId = req.user.id;
    const feedings = await feedingService.registerFeeding(req.body, galponId, profileId);
    res.status(201).json({ success: true, message: 'Alimentación registrada exitosamente.', feedings: feedings.map(toFeedingDTO) });
});

exports.getFeedings = catchAsync(async (req, res) => {
    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 10;
    const { startDate, endDate, races, profileId, cageType, all } = req.query;
    
    const filters = { startDate, endDate, races, profileId, cageType, all: all === 'true' };
    
    const result = await feedingService.getFeedings(req.galponId, req.user.id, page, limit, filters);
    res.status(200).json({
        success: true,
        feedings: result.data.map(toFeedingDTO),
        pagination: result.pagination
    });
});
