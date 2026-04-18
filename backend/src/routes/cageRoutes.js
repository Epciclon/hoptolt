const express = require('express');
const router = express.Router();
const cageController = require('../controllers/cageController');

router.post('/cages', cageController.registerCage);
router.get('/cages/:number', cageController.getCage);
router.get('/cages', cageController.getAllCages);
router.put('/cages/:number', cageController.editCage);
router.delete('/cages/:number', cageController.deleteCage);

module.exports = router;