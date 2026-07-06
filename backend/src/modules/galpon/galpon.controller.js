const catchAsync = require('../../common/middlewares/catchAsync');
const galponService = require('./galpon.service');
const { toGalponDTO } = require('../../common/dtos/galpon.dto');
const { Cage, Rabbit, Race, Assignment, Galpon } = require('../../domain/models');
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
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
    const galponId = parseInt(req.params.id);
    const galpon = await Galpon.findByPk(galponId);
    if (!galpon) throw new AppError('Galpón no encontrado', 404);

    const [totalCages, totalRabbits, totalRaces, totalAssignments] = await Promise.all([
        Cage.count({ where: { galponId } }),
        Rabbit.count({ where: { galponId } }),
        Race.count({ where: { profileId: galpon.profileId } }),
        Assignment.count({ where: { galponId, status: 'asignado' } })
    ]);
    res.status(200).json({
        success: true,
        stats: { totalCages, totalRabbits, totalRaces, totalAssignments }
    });
});
