const express = require('express');
const router = express.Router();
const raceController = require('./race.controller');
const { validateCreateRace, validateEditRace } = require('./race.validator');
const { requirePermission } = require('../../common/middlewares/authorization.middleware');
const { authenticate } = require('../../common/middlewares/auth.middleware');
const { galponContext } = require('../../common/middlewares/galponContext');

router.use('/races', authenticate); // Protect all routes in this router

router.post('/races', galponContext, requirePermission('races', 'canCreate'), validateCreateRace, raceController.registerRace);
router.get('/races', galponContext, requirePermission('races', 'canRead'), raceController.getAllRaces);
router.get('/races/:id', galponContext, requirePermission('races', 'canRead'), raceController.getRaceById);
router.put('/races/:id', galponContext, requirePermission('races', 'canUpdate'), validateEditRace, raceController.editRace);
router.delete('/races/:id', galponContext, requirePermission('races', 'canDelete'), raceController.deleteRace);

module.exports = router;
