const catchAsync = require('../../common/middlewares/catchAsync');
const dewormingService = require('./deworming.service');
const { Galpon } = require('../../domain/models');
const { toDewormingDTO } = require('../../common/dtos/deworming.dto');

exports.registerDeworming = catchAsync(async (req, res) => {
    const galponId = req.galponId;
    const dewormings = await dewormingService.registerDeworming(req.body, galponId, req.user.id);
    res.status(201).json({ success: true, message: 'Desparasitación registrada exitosamente.', dewormings: dewormings.map(toDewormingDTO) });
});

exports.getDewormings = catchAsync(async (req, res) => {
    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 10;
    const { startDate, endDate, races, profileId, all } = req.query;
    
    const filters = { startDate, endDate, races, profileId, all: all === 'true' };
    
    const result = await dewormingService.getDewormings(req.galponId, req.user.id, page, limit, filters);
    res.status(200).json({
        success: true,
        dewormings: result.data.map(toDewormingDTO),
        pagination: result.pagination
    });
});

exports.getGalponDewormingPeriod = catchAsync(async (req, res) => {
    const galpon = await Galpon.findByPk(req.galponId);
    if (!galpon) {
        return res.status(404).json({ success: false, message: 'Galpón no encontrado.' });
    }
    res.status(200).json({ success: true, dewormingPeriod: galpon.dewormingPeriod || 30 });
});
