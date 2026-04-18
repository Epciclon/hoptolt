const express = require('express');
const router = express.Router();
const vaccinationController = require('../controllers/vaccinationController');

router.post('/register-vaccination', vaccinationController.registerVaccination);
router.post('/check-vaccination-validations', vaccinationController.checkVaccinationValidations);
router.post('/vaccination-status', vaccinationController.getVaccinationStatus);

module.exports = router;
