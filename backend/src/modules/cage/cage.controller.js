const catchAsync = require('../../common/middlewares/catchAsync');
const cageService = require('./cage.service');
const { toCageDTO } = require('../../common/dtos/cage.dto');

exports.registerCage = catchAsync(async (req, res) => {
    const cage = await cageService.registerCage(req.body, req.user.id);
    res.status(201).json({ success: true, message: 'Jaula registrada con éxito', cage: toCageDTO(cage) });
});

exports.getCage = catchAsync(async (req, res) => {
    const cage = await cageService.getCageById(req.params.id, req.galponId, req.user.id);
    res.status(200).json({ success: true, cage: toCageDTO(cage) });
});

exports.getAllCages = catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filters = {
        search: req.query.search,
        type: req.query.type,
        status: req.query.status
    };
    const result = await cageService.getAllCages(req.galponId, req.user.id, filters, page, limit);
    res.status(200).json({
        success: true,
        cages: result.data.map(toCageDTO),
        pagination: result.pagination
    });
});

exports.editCage = catchAsync(async (req, res) => {
    const cage = await cageService.editCage(req.params.id, req.body, req.user.id);
    res.status(200).json({ success: true, message: 'Jaula editada con éxito', cage: toCageDTO(cage) });
});

exports.deleteCage = catchAsync(async (req, res) => {
    await cageService.deleteCage(req.params.id, req.user.id);
    res.status(200).json({ success: true, message: 'Jaula eliminada correctamente.' });
});
