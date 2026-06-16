const catchAsync = require('../../common/middlewares/catchAsync');
const raceService = require('./race.service');
const { toRaceDTO } = require('../../common/dtos/race.dto');

exports.registerRace = catchAsync(async (req, res) => {
    const race = await raceService.registerRace(req.body, req.user.id);
    res.status(201).json({ success: true, message: 'Raza registrada exitosamente.', race: toRaceDTO(race) });
});

exports.getRaceById = catchAsync(async (req, res) => {
    const race = await raceService.getRaceById(req.params.id);
    res.status(200).json({ success: true, race: toRaceDTO(race) });
});

exports.getAllRaces = catchAsync(async (req, res) => {
    const races = await raceService.getAllRaces(req.user.id);
    res.status(200).json({ success: true, races: races.map(r => toRaceDTO(r, false)) });
});

exports.editRace = catchAsync(async (req, res) => {
    const race = await raceService.editRaceDescription(req.params.id, req.body);
    res.status(200).json({ success: true, message: 'Raza editada exitosamente.', race: toRaceDTO(race) });
});

exports.deleteRace = catchAsync(async (req, res) => {
    await raceService.deleteRace(req.params.id);
    res.status(200).json({ success: true, message: 'Raza eliminada con éxito.' });
});
