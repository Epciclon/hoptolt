const express = require('express');
const router = express.Router();
const feedingController = require('../controllers/feedingController');

router.post('/register-feeding', feedingController.registerFeeding);
router.get('/daily-count/:codigo', feedingController.getDailyFeedingCount);
router.post('/check-daily-feedings', feedingController.checkDailyFeedings);
router.post('/daily-counts', feedingController.getDailyFeedingCounts);
router.get('/all-records', feedingController.getAllFeedingRecords);

module.exports = router;
