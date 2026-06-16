const express = require('express');
const router = express.Router();
const growthController = require('./growth.controller');
const { authenticate } = require('../../common/middlewares/auth.middleware');

router.use(authenticate);

// PATCH /api/growth/weight/:notificationId/respond
router.patch('/growth/weight/:notificationId/respond', growthController.respondToEstimation);

module.exports = router;
