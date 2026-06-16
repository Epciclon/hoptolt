const express = require('express');
const router = express.Router();
const cageController = require('./cage.controller');
const { validateCreateCage, validateEditCage } = require('./cage.validator');
const { galponContext } = require('../../common/middlewares/galponContext');
const { requirePermission } = require('../../common/middlewares/authorization.middleware');
const { authenticate } = require('../../common/middlewares/auth.middleware');
const { tenantFilter } = require('../../common/middlewares/tenant.middleware');

router.use('/cages', authenticate, tenantFilter); // Protect all routes in this router

router.post('/cages', requirePermission('cages', 'canCreate'), validateCreateCage, cageController.registerCage);
router.get('/cages', requirePermission('cages', 'canRead'), galponContext, cageController.getAllCages);
router.get('/cages/:id', requirePermission('cages', 'canRead'), galponContext, cageController.getCage);
router.put('/cages/:id', requirePermission('cages', 'canUpdate'), validateEditCage, cageController.editCage);
router.delete('/cages/:id', requirePermission('cages', 'canDelete'), cageController.deleteCage);

module.exports = router;
