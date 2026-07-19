const catchAsync = require('../../common/middlewares/catchAsync');
const assignmentService = require('./assignment.service');
const { toAssignmentDTO } = require('../../common/dtos/assignment.dto');
const { toRabbitDTO } = require('../../common/dtos/rabbit.dto');
const { toCageDTO } = require('../../common/dtos/cage.dto');

exports.assignRabbits = catchAsync(async (req, res) => {
    const galponId = req.galponId;
    const result = await assignmentService.assignRabbits(req.body, galponId);
    res.status(201).json({
        success: true,
        message: 'Asignación registrada exitosamente.',
        assignments: result.assignments.map(toAssignmentDTO),
        warnings: result.warnings || []
    });
});

exports.moveRabbit = catchAsync(async (req, res) => {
    const galponId = req.galponId;
    const profileId = req.user.id;
    const { rabbitId, currentCageId, targetCageId } = req.body;
    const result = await assignmentService.moveRabbit(rabbitId, currentCageId, targetCageId, galponId, profileId);
    res.status(200).json({
        success: true,
        message: result.message || 'Conejo movido exitosamente.',
        warnings: result.warnings || []
    });
});

exports.getAssignments = catchAsync(async (req, res) => {
    const galponId = req.galponId;
    const assignments = await assignmentService.getAssignments(galponId);
    res.status(200).json({ success: true, assignments: assignments.map(toAssignmentDTO) });
});

exports.getAssignedRabbits = catchAsync(async (req, res) => {
    const rabbits = await assignmentService.getAssignedRabbits(req.galponId);
    res.status(200).json({ success: true, rabbits });
});

exports.getAvailableRabbits = catchAsync(async (req, res) => {
    const galponId = req.galponId;
    const rabbits = await assignmentService.getAvailableRabbits(galponId);
    res.status(200).json({ success: true, rabbits: rabbits.map(toRabbitDTO) });
});

exports.getOperativeCages = catchAsync(async (req, res) => {
    const galponId = req.galponId;
    const cages = await assignmentService.getOperativeCages(galponId);
    res.status(200).json({ success: true, cages: cages.map(toCageDTO) });
});

exports.unassignRabbit = catchAsync(async (req, res) => {
    await assignmentService.unassignRabbit(req.params.id);
    res.status(200).json({ success: true, message: 'Conejo desasignado exitosamente.' });
});
