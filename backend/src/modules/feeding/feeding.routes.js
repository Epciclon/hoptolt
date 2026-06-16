const express = require('express');
const router = express.Router();
const feedingController = require('./feeding.controller');
const { validateCreateFeeding } = require('./feeding.validator');
const { galponContext } = require('../../common/middlewares/galponContext');
const { requirePermission } = require('../../common/middlewares/authorization.middleware');
const { authenticate } = require('../../common/middlewares/auth.middleware');

router.use('/feedings', authenticate); // Protect all routes in this router

router.get('/feedings/food-types', requirePermission('feeding', 'canRead'), galponContext, feedingController.getFoodTypes);
router.post('/feedings', requirePermission('feeding', 'canCreate'), galponContext, validateCreateFeeding, feedingController.registerFeeding);
router.get('/feedings', requirePermission('feeding', 'canRead'), galponContext, feedingController.getFeedings);

module.exports = router;
