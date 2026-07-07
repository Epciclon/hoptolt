const express = require('express');
const router = express.Router();
const growthController = require('./growth.controller');
const { authenticate } = require('../../common/middlewares/auth.middleware');

router.use('/growth', authenticate);

// GET /api/growth/history/:rabbitId
router.get('/growth/history/:rabbitId', growthController.getHistory);

module.exports = router;
