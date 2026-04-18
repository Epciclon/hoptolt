const express = require('express');
const router = express.Router();
const raceController = require('../controllers/raceController');

router.post('/races', raceController.registerRace);
router.get('/races/search', raceController.getRaceByName);
router.get('/races', raceController.getAllRaces);
router.put('/races/:name', raceController.editRaceDescription);
router.delete('/races/:name', raceController.deleteRace);

module.exports = router;
