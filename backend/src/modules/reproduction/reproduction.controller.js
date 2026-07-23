const catchAsync = require('../../common/middlewares/catchAsync');
const reproductionService = require('./reproduction.service');
const { toReproductionDTO, toAvailableRabbitDTO } = require('../../common/dtos/reproduction.dto');

exports.registerReproduction = catchAsync(async (req, res) => {
    const galponId = req.galponId;
    const reproduction = await reproductionService.registerReproduction(req.body, galponId);
    res.status(201).json({ success: true, message: 'Monta registrada exitosamente.', reproduction: toReproductionDTO(reproduction) });
});

exports.getAvailableMalesForMating = catchAsync(async (req, res) => {
    const males = await reproductionService.getAvailableMalesForMating(req.galponId);
    res.status(200).json({ success: true, males: males.map(toAvailableRabbitDTO) });
});

exports.getAvailableFemalesForMating = catchAsync(async (req, res) => {
    const females = await reproductionService.getAvailableFemalesForMating(req.galponId, req.params.maleId);
    res.status(200).json({ success: true, females: females.map(toAvailableRabbitDTO) });
});

exports.startMating = catchAsync(async (req, res) => {
    const reproduction = await reproductionService.startMating(req.body, req.galponId, req.user.id);
    res.status(201).json({ success: true, message: 'Monta iniciada exitosamente.', reproduction: toReproductionDTO(reproduction) });
});

exports.finishMating = catchAsync(async (req, res) => {
    const reproduction = await reproductionService.finishMating(req.params.id, req.galponId, req.user.id);
    res.status(200).json({ success: true, message: 'Monta finalizada. La hembra ha regresado a gestación.', reproduction: toReproductionDTO(reproduction) });
});

exports.getReproductionByFemaleId = catchAsync(async (req, res) => {
    const reproductions = await reproductionService.getReproductionByFemaleId(req.params.femaleId);
    res.status(200).json({ success: true, reproductions: reproductions.map(toReproductionDTO) });
});

// formatReproduction movido a reproduction.dto.js

exports.getAllReproductions = catchAsync(async (req, res) => {
    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 10;
    const { startDate, endDate, races, status, profileId, all } = req.query;

    const filters = { startDate, endDate, races, status, profileId, all: all === 'true' };

    try {
        const result = await reproductionService.getAllReproductions(req.galponId, req.user.id, page, limit, filters);
        
        const enrichedReproductions = result.data.map(toReproductionDTO);
        
        res.status(200).json({
            success: true,
            reproductions: enrichedReproductions,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Error en getAllReproductions:', error);
        throw error;
    }
});

exports.getReproductionFemales = catchAsync(async (req, res) => {
    const females = await reproductionService.getReproductionFemales(req.galponId);
    res.status(200).json({ success: true, females });
});

exports.getReproductionMales = catchAsync(async (req, res) => {
    const males = await reproductionService.getReproductionMales(req.galponId);
    res.status(200).json({ success: true, males });
});

exports.editReproduction = catchAsync(async (req, res) => {
    const reproduction = await reproductionService.editReproduction(req.params.id, req.body, req.user.id);
    res.status(200).json({ success: true, message: 'Monta actualizada exitosamente.', reproduction: toReproductionDTO(reproduction) });
});

exports.deleteReproduction = catchAsync(async (req, res) => {
    await reproductionService.deleteReproduction(req.params.id);
    res.status(200).json({ success: true, message: 'Monta eliminada exitosamente.' });
});

exports.getReproductionCalendar = catchAsync(async (req, res) => {
    const galponId = req.galponId;
    const year  = Number.parseInt(req.query.year)  || new Date().getFullYear();
    const month = Number.parseInt(req.query.month) || (new Date().getMonth() + 1);
    const type  = req.query.type || 'births';

    const grouped = await reproductionService.getReproductionCalendar(galponId, req.user.id, year, month, type);
    res.status(200).json({ success: true, calendar: grouped });
});

exports.getReproductionByDay = catchAsync(async (req, res) => {
    const galponId = req.galponId;
    const year  = Number.parseInt(req.query.year)  || new Date().getFullYear();
    const month = Number.parseInt(req.query.month) || (new Date().getMonth() + 1);
    const day   = Number.parseInt(req.query.day)   || new Date().getDate();

    const records = await reproductionService.getReproductionByDay(galponId, req.user.id, year, month, day);
    res.status(200).json({ success: true, reproductions: records.map(toReproductionDTO) });
});

exports.getReproductionById = catchAsync(async (req, res) => {
    const reproduction = await reproductionService.getReproductionById(req.params.id);
    res.status(200).json({ success: true, reproduction: toReproductionDTO(reproduction) });
});

exports.registerBirth = catchAsync(async (req, res) => {
    const reproduction = await reproductionService.registerBirth(req.params.id, req.galponId, req.body, req.user.id);
    res.status(200).json({ success: true, message: 'Parto registrado exitosamente.', reproduction: toReproductionDTO(reproduction) });
});

exports.cancelReproduction = catchAsync(async (req, res) => {
    const result = await reproductionService.cancelReproduction(req.params.id, req.galponId, req.body, req.user.id);
    res.status(200).json({ success: true, result });
});

exports.finishLactation = catchAsync(async (req, res) => {
    const reproduction = await reproductionService.finishLactation(req.params.id, req.galponId, req.user.id);
    res.status(200).json({ success: true, message: 'Lactancia finalizada. Los gazapos han sido destetados.', reproduction: toReproductionDTO(reproduction) });
});
