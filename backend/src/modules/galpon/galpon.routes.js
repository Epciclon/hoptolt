const express = require('express');
const router = express.Router();
const galponController = require('./galpon.controller');
const { validateCreateGalpon, validateEditGalpon } = require('./galpon.validator');
const { authenticate } = require('../../common/middlewares/auth.middleware');
const { tenantFilter } = require('../../common/middlewares/tenant.middleware');

// Todas las rutas de galpón requieren autenticación y tenant filter
router.use('/galpones', authenticate, tenantFilter);

router.post('/galpones',               validateCreateGalpon, galponController.registerGalpon);
router.get('/galpones',                galponController.getAllGalpones);
router.get('/galpones/active',         galponController.getActiveGalpon);
router.get('/galpones/:id/stats',      galponController.getGalponStats);
router.get('/galpones/:id',            galponController.getGalponById);
router.post('/galpones/:id/set-active', galponController.setActiveGalpon);
router.put('/galpones/:id',            validateEditGalpon, galponController.editGalpon);
router.delete('/galpones/:id',         galponController.deleteGalpon);

module.exports = router;
