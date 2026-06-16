const catchAsync = require('../../common/middlewares/catchAsync');
const cleaningService = require('./cleaning.service');

exports.registerCleaning = catchAsync(async (req, res) => {
    const galponId = req.galponId;
    const cleanings = await cleaningService.registerCleaning(req.body, galponId, req.user.id);
    res.status(201).json({ success: true, message: 'Limpieza registrada exitosamente.', cleanings });
});

exports.getCleanings = catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await cleaningService.getCleanings(req.galponId, req.user.id, page, limit);
    res.status(200).json({
        success: true,
        cleanings: result.data,
        pagination: result.pagination
    });
});
