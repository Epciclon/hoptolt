const express = require('express');
const router = express.Router();
const dewormingController = require('./deworming.controller');
const { validateCreateDeworming } = require('./deworming.validator');
const { galponContext } = require('../../common/middlewares/galponContext');
const { requirePermission } = require('../../common/middlewares/authorization.middleware');
const { authenticate } = require('../../common/middlewares/auth.middleware');

router.use('/dewormings', authenticate); // Protect all routes starting with /dewormings
router.use('/deworming-period', authenticate);

router.post('/dewormings', requirePermission('deworming', 'canCreate'), galponContext, validateCreateDeworming, dewormingController.registerDeworming);
router.get('/dewormings', requirePermission('deworming', 'canRead'), galponContext, dewormingController.getDewormings);
router.get('/deworming-period', requirePermission('deworming', 'canRead'), galponContext, dewormingController.getGalponDewormingPeriod);

module.exports = router;
