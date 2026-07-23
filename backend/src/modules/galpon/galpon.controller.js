const catchAsync = require('../../common/middlewares/catchAsync');
const galponService = require('./galpon.service');
const { toGalponDTO } = require('../../common/dtos/galpon.dto');
const AppError = require('../../errors/AppError');

exports.registerGalpon = catchAsync(async (req, res) => {
    const galpon = await galponService.registerGalpon(req.body, req.user.id);
    res.status(201).json({ success: true, message: 'Galpón registrado exitosamente.', galpon: toGalponDTO(galpon) });
});

exports.getGalponById = catchAsync(async (req, res) => {
    const galpon = await galponService.getGalponById(req.params.id);
    res.status(200).json({ success: true, galpon: toGalponDTO(galpon) });
});

exports.getGalponByName = catchAsync(async (req, res) => {
    const galpon = await galponService.getGalponByName(req.params.name);
    res.status(200).json({ success: true, galpon: toGalponDTO(galpon) });
});

exports.getAllGalpones = catchAsync(async (req, res) => {
    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 10;
    const result = await galponService.getAllGalpones(req.user.id, page, limit);
    // Cada item ya tiene memberRole adjunto
    res.status(200).json({
        success: true,
        galpones: result.data.map(g => ({ ...toGalponDTO(g), memberRole: g.memberRole })),
        pagination: result.pagination
    });
});

exports.editGalpon = catchAsync(async (req, res) => {
    const galpon = await galponService.editGalpon(req.params.id, req.body, req.user.id);
    res.status(200).json({ success: true, message: 'Galpón actualizado exitosamente.', galpon: toGalponDTO(galpon) });
});

exports.deleteGalpon = catchAsync(async (req, res) => {
    await galponService.deleteGalpon(req.params.id, req.user.id);
    res.status(200).json({ success: true, message: 'Galpón eliminado exitosamente.' });
});

exports.getActiveGalpon = catchAsync(async (req, res) => {
    const galpon = await galponService.getActiveGalpon(req.user.id);
    res.status(200).json({ success: true, galpon: galpon ? toGalponDTO(galpon) : null });
});

exports.setActiveGalpon = catchAsync(async (req, res) => {
    const galpon = await galponService.setActiveGalpon(req.params.id, req.user.id);
    res.status(200).json({ success: true, message: 'Galpón seleccionado como activo.', galpon: toGalponDTO(galpon) });
});

exports.getGalponStats = catchAsync(async (req, res) => {
    const galponId = Number.parseInt(req.params.id);
    const stats = await galponService.getGalponStats(galponId);
    
    res.status(200).json({
        success: true,
        stats
    });
});
