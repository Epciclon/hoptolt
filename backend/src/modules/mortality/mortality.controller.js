const catchAsync = require('../../common/middlewares/catchAsync');
const mortalityService = require('./mortality.service');
const { toMortalityDTO } = require('../../common/dtos/mortality.dto');

exports.registerMortality = catchAsync(async (req, res) => {
    const galponId = req.galponId;
    const mortality = await mortalityService.registerMortality(req.body, galponId, req.user.id);
    res.status(201).json({ success: true, message: 'Mortalidad registrada exitosamente.', mortality: toMortalityDTO(mortality) });
});

exports.getMortalities = catchAsync(async (req, res) => {
    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 10;
    const isKits = req.query.isKits !== undefined ? req.query.isKits === 'true' : null;
    const { startDate, endDate, races, causes, profileId, all } = req.query;

    const filters = { startDate, endDate, races, causes, profileId, all: all === 'true' };

    const result = await mortalityService.getMortalities(req.galponId, req.user.id, page, limit, isKits, filters);
    
    const formatted = result.data.map(toMortalityDTO);

    res.status(200).json({
        success: true,
        mortalities: formatted,
        pagination: result.pagination
    });
});
