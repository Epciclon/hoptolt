const express = require('express');
const router = express.Router();
const raceController = require('./race.controller');
const { validateCreateRace, validateEditRace } = require('./race.validator');
const { requirePermission } = require('../../common/middlewares/authorization.middleware');
const { authenticate } = require('../../common/middlewares/auth.middleware');

router.use('/races', authenticate); // Protect all routes in this router

router.post('/races', requirePermission('races', 'canCreate'), validateCreateRace, raceController.registerRace);
router.get('/races', requirePermission('races', 'canRead'), raceController.getAllRaces);
router.get('/races/:id', requirePermission('races', 'canRead'), raceController.getRaceById);
router.put('/races/:id', requirePermission('races', 'canUpdate'), validateEditRace, raceController.editRace);
router.delete('/races/:id', requirePermission('races', 'canDelete'), raceController.deleteRace);

module.exports = router;
