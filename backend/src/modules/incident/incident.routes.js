const express = require('express');
const router = express.Router();
const incidentController = require('./incident.controller');
const {
    validateCreateIncident,
    validateRespondIncident,
    validateIncidentId
} = require('./incident.validator');
const { authenticate } = require('../../common/middlewares/auth.middleware');
const { galponContext } = require('../../common/middlewares/galponContext');

router.use(authenticate);
router.use(galponContext);

router.get('/counts', incidentController.getCounts);
router.get('/', incidentController.getIncidents);
router.post('/', validateCreateIncident, incidentController.createIncident);
router.get('/:id', validateIncidentId, incidentController.getIncidentById);
router.put('/:id/respond', validateIncidentId, validateRespondIncident, incidentController.respondToIncident);
router.put('/:id/read', incidentController.markAsRead);
router.delete('/:id', validateIncidentId, incidentController.deleteIncident);

module.exports = router;
