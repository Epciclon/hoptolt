const express = require('express');
const router = express.Router();
const cleaningController = require('./cleaning.controller');
const { validateCreateCleaning } = require('./cleaning.validator');
const { galponContext } = require('../../common/middlewares/galponContext');
const { requirePermission } = require('../../common/middlewares/authorization.middleware');
const { authenticate } = require('../../common/middlewares/auth.middleware');

router.use('/cleanings', authenticate); // Protect all routes in this router

router.post('/cleanings', requirePermission('cleaning', 'canCreate'), galponContext, validateCreateCleaning, cleaningController.registerCleaning);
router.get('/cleanings', requirePermission('cleaning', 'canRead'), galponContext, cleaningController.getCleanings);

module.exports = router;
