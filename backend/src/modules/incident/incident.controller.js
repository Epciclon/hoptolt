const catchAsync = require('../../common/middlewares/catchAsync');
const incidentService = require('./incident.service');

exports.createIncident = catchAsync(async (req, res) => {
    const incident = await incidentService.createIncident(req.user, req.galponId, req.body);
    res.status(201).json({
        success: true,
        message: 'Novedad registrada exitosamente.',
        incident
    });
});

exports.getIncidents = catchAsync(async (req, res) => {
    const result = await incidentService.getIncidents(req.user, req.galponId, req.query);
    res.status(200).json({
        success: true,
        incidents: result.incidents,
        pagination: result.pagination,
        userRole: result.userRole
    });
});

exports.getCounts = catchAsync(async (req, res) => {
    const counts = await incidentService.getCounts(req.user, req.galponId);
    res.status(200).json({
        success: true,
        counts
    });
});

exports.getIncidentById = catchAsync(async (req, res) => {
    const incident = await incidentService.getById(req.user, req.galponId, req.params.id);
    res.status(200).json({
        success: true,
        incident
    });
});

exports.respondToIncident = catchAsync(async (req, res) => {
    const incident = await incidentService.respondToIncident(req.user, req.galponId, req.params.id, req.body);
    res.status(200).json({
        success: true,
        message: 'Respuesta guardada exitosamente.',
        incident
    });
});

exports.markAsRead = catchAsync(async (req, res) => {
    const result = await incidentService.markAsRead(req.user, req.galponId, req.params.id);
    res.status(200).json({
        success: true,
        result
    });
});

exports.deleteIncident = catchAsync(async (req, res) => {
    const result = await incidentService.deleteIncident(req.user, req.galponId, req.params.id);
    res.status(200).json({
        success: true,
        message: 'Novedad eliminada exitosamente.',
        result
    });
});
