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

router.get('/reproductions/males-for-mating', requirePermission('reproduction', 'canRead'), galponContext, reproductionController.getAvailableMalesForMating);
router.get('/reproductions/females-for-mating/:maleId', requirePermission('reproduction', 'canRead'), galponContext, reproductionController.getAvailableFemalesForMating);
router.post('/reproductions/start-mating', requirePermission('reproduction', 'canCreate'), galponContext, reproductionController.startMating);
router.post('/reproductions/:id/finish-mating', requirePermission('reproduction', 'canUpdate'), galponContext, reproductionController.finishMating);
router.post('/reproductions/:id/register-birth', requirePermission('reproduction', 'canUpdate'), galponContext, reproductionController.registerBirth);
router.post('/reproductions/:id/cancel', requirePermission('reproduction', 'canDelete'), galponContext, reproductionController.cancelReproduction);
router.post('/reproductions/:id/finish-lactation', requirePermission('reproduction', 'canUpdate'), galponContext, reproductionController.finishLactation);
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
