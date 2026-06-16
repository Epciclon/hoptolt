const express = require('express');
const router = express.Router();
const mortalityController = require('./mortality.controller');
const { validateCreateMortality } = require('./mortality.validator');
const { galponContext } = require('../../common/middlewares/galponContext');
const { requirePermission } = require('../../common/middlewares/authorization.middleware');
const { authenticate } = require('../../common/middlewares/auth.middleware');

router.use('/mortalities', authenticate); // Protect all routes in this router

router.post('/mortalities', requirePermission('mortality', 'canCreate'), galponContext, validateCreateMortality, mortalityController.registerMortality);
router.get('/mortalities', requirePermission('mortality', 'canRead'), galponContext, mortalityController.getMortalities);

module.exports = router;
