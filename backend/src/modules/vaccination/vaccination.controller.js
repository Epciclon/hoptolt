const catchAsync = require('../../common/middlewares/catchAsync');
const vaccinationService = require('./vaccination.service');
const galponRepository = require('../galpon/galpon.repository');

exports.registerVaccination = catchAsync(async (req, res) => {
    const galponId = req.galponId;
    const vaccinations = await vaccinationService.registerVaccination(req.body, galponId, req.user.id);
    res.status(201).json({ success: true, message: 'Vacunación registrada exitosamente.', vaccinations });
});

exports.getVaccinations = catchAsync(async (req, res) => {
    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 10;
    const { startDate, endDate, races, profileId, all } = req.query;
    
    const filters = { startDate, endDate, races, profileId, all: all === 'true' };
    
    const result = await vaccinationService.getVaccinations(req.galponId, req.user.id, page, limit, filters);
    res.status(200).json({
        success: true,
        vaccinations: result.data,
        pagination: result.pagination
    });
});

exports.getGalponVaccines = catchAsync(async (req, res) => {
    const galpon = await galponRepository.findById(req.galponId);
    if (!galpon) {
        return res.status(404).json({ success: false, message: 'Galpón no encontrado.' });
    }
    res.status(200).json({ success: true, vaccines: galpon.vaccines || [] });
});
