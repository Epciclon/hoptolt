const express = require('express');
const router = express.Router();
const reproductionController = require('./reproduction.controller');
const { validateCreateReproduction, validateEditReproduction } = require('./reproduction.validator');
const { galponContext } = require('../../common/middlewares/galponContext');
const { requirePermission } = require('../../common/middlewares/authorization.middleware');
const { authenticate } = require('../../common/middlewares/auth.middleware');

// Protect all routes starting with these path prefixes in this router
router.use('/reproductions', authenticate);
router.use('/reproduction-females', authenticate);
router.use('/reproduction-males', authenticate);

router.post('/reproductions', requirePermission('reproduction', 'canCreate'), galponContext, validateCreateReproduction, reproductionController.registerReproduction);
router.get('/reproductions', requirePermission('reproduction', 'canRead'), galponContext, reproductionController.getAllReproductions);
router.get('/reproductions/calendar', requirePermission('reproduction', 'canRead'), galponContext, reproductionController.getReproductionCalendar);
router.get('/reproductions/by-day', requirePermission('reproduction', 'canRead'), galponContext, reproductionController.getReproductionByDay);
router.get('/reproductions/:id', requirePermission('reproduction', 'canRead'), reproductionController.getReproductionById);
router.get('/reproductions/female/:femaleId', requirePermission('reproduction', 'canRead'), reproductionController.getReproductionByFemaleId);
router.get('/reproduction-females', requirePermission('reproduction', 'canRead'), galponContext, reproductionController.getReproductionFemales);
router.get('/reproduction-males', requirePermission('reproduction', 'canRead'), galponContext, reproductionController.getReproductionMales);
router.put('/reproductions/:id', requirePermission('reproduction', 'canUpdate'), validateEditReproduction, reproductionController.editReproduction);
router.delete('/reproductions/:id', requirePermission('reproduction', 'canDelete'), reproductionController.deleteReproduction);

module.exports = router;
