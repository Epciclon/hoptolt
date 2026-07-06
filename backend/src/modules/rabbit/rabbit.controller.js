const catchAsync = require('../../common/middlewares/catchAsync');
const rabbitService = require('./rabbit.service');
const { toRabbitDTO } = require('../../common/dtos/rabbit.dto');

exports.registerRabbit = catchAsync(async (req, res) => {
    const rabbit = await rabbitService.registerRabbit(req.body, req.galponId, req.user.id);
    res.status(201).json({ success: true, message: 'Conejo registrado exitosamente', rabbit: toRabbitDTO(rabbit) });
});

exports.getRabbit = catchAsync(async (req, res) => {
    const rabbit = await rabbitService.getRabbit(req.params.id, req.user.id);
    res.status(200).json({ success: true, rabbit: toRabbitDTO(rabbit) });
});

exports.getAllRabbits = catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const filters = {
        search: req.query.search,
        race: req.query.race,
        sex: req.query.sex,
        purpose: req.query.purpose
    };
    const result = await rabbitService.getAllRabbits(req.galponId, req.user.id, filters, page, limit);
    res.status(200).json({
        success: true,
        rabbits: result.data.map(toRabbitDTO),
        pagination: result.pagination
    });
});

exports.getRabbitsByRace = catchAsync(async (req, res) => {
    const rabbits = await rabbitService.getRabbitsByRace(req.params.race, req.galponId, req.user.id);
    res.status(200).json({ success: true, rabbits: rabbits.map(toRabbitDTO) });
});

exports.editRabbit = catchAsync(async (req, res) => {
    const rabbit = await rabbitService.editRabbit(req.params.id, req.body, req.user.id);
    res.status(200).json({ success: true, message: 'Conejo actualizado exitosamente', rabbit: toRabbitDTO(rabbit) });
});

exports.deleteRabbit = catchAsync(async (req, res) => {
    await rabbitService.deleteRabbit(req.params.id, req.user.id);
    res.status(200).json({ success: true, message: 'Conejo eliminado exitosamente' });
});

exports.getAvailableRaces = catchAsync(async (req, res) => {
    const races = await rabbitService.getAvailableRaces();
    res.status(200).json({ success: true, races });
});

exports.getPotentialFathers = catchAsync(async (req, res) => {
    const fathers = await rabbitService.getPotentialFathers(req.galponId, req.user.id);
    res.status(200).json({ success: true, fathers: fathers.map(toRabbitDTO) });
});

exports.getPotentialMothers = catchAsync(async (req, res) => {
    const mothers = await rabbitService.getPotentialMothers(req.galponId, req.user.id);
    res.status(200).json({ success: true, mothers: mothers.map(toRabbitDTO) });
});

exports.suggestName = catchAsync(async (req, res) => {
    const name = rabbitService.suggestName(req.query.sex);
    res.status(200).json({ success: true, name });
});
