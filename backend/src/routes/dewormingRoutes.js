const express = require('express');
const router = express.Router();
const dewormingController = require('../controllers/dewormingController');

router.post('/register-deworming', dewormingController.registerDeworming);
router.post('/check-deworming-validations', dewormingController.checkDewormingValidations);
router.post('/deworming-status', dewormingController.getDewormingStatus);

module.exports = router;
