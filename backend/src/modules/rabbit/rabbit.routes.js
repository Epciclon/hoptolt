const express = require('express');
const router = express.Router();
const rabbitController = require('./rabbit.controller');
const { validateCreateRabbit, validateEditRabbit } = require('./rabbit.validator');
const { galponContext } = require('../../common/middlewares/galponContext');
const { requirePermission } = require('../../common/middlewares/authorization.middleware');
const { authenticate } = require('../../common/middlewares/auth.middleware');
const { tenantFilter } = require('../../common/middlewares/tenant.middleware');

router.use('/rabbits', authenticate, tenantFilter); // Protect all routes in this router

router.post('/rabbits', requirePermission('rabbits', 'canCreate'), galponContext, validateCreateRabbit, rabbitController.registerRabbit);
router.get('/rabbits', requirePermission('rabbits', 'canRead'), galponContext, rabbitController.getAllRabbits);
router.get('/rabbits/suggest-name', requirePermission('rabbits', 'canRead'), rabbitController.suggestName);
router.get('/rabbits/potential-fathers', requirePermission('rabbits', 'canRead'), galponContext, rabbitController.getPotentialFathers);
router.get('/rabbits/potential-mothers', requirePermission('rabbits', 'canRead'), galponContext, rabbitController.getPotentialMothers);
router.get('/rabbits/races/:race', requirePermission('rabbits', 'canRead'), rabbitController.getRabbitsByRace);
router.get('/rabbits/:id', requirePermission('rabbits', 'canRead'), rabbitController.getRabbit);
router.put('/rabbits/:id', requirePermission('rabbits', 'canUpdate'), validateEditRabbit, rabbitController.editRabbit);
router.delete('/rabbits/:id', requirePermission('rabbits', 'canDelete'), rabbitController.deleteRabbit);

module.exports = router;
