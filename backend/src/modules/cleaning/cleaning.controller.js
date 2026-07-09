const catchAsync = require('../../common/middlewares/catchAsync');
const cleaningService = require('./cleaning.service');
const { toCleaningDTO } = require('../../common/dtos/cleaning.dto');

exports.registerCleaning = catchAsync(async (req, res) => {
    const galponId = req.galponId;
    const cleanings = await cleaningService.registerCleaning(req.body, galponId, req.user.id);
    res.status(201).json({ success: true, message: 'Limpieza registrada exitosamente.', cleanings: cleanings.map(toCleaningDTO) });
});

exports.getCleanings = catchAsync(async (req, res) => {
    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 10;
    const { startDate, endDate, profileId, cageType, all } = req.query;
    
    const filters = { startDate, endDate, responsibleId: profileId, cageType, all: all === 'true' };
    
    const result = await cleaningService.getCleanings(req.galponId, req.user.id, page, limit, filters);
    const cleaningsData = result.data || result.cleanings || result;
    res.status(200).json({
        success: true,
        cleanings: Array.isArray(cleaningsData) ? cleaningsData.map(toCleaningDTO) : [],
        pagination: result.pagination
    });
});
