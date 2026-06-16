const express = require('express');
const router = express.Router();
const vaccinationController = require('./vaccination.controller');
const { validateCreateVaccination } = require('./vaccination.validator');
const { galponContext } = require('../../common/middlewares/galponContext');
const { requirePermission } = require('../../common/middlewares/authorization.middleware');
const { authenticate } = require('../../common/middlewares/auth.middleware');

router.use('/vaccinations', authenticate); // Protect all routes in this router
router.use('/vaccines', authenticate); // Protect vaccines route

router.post('/vaccinations', requirePermission('vaccination', 'canCreate'), galponContext, validateCreateVaccination, vaccinationController.registerVaccination);
router.get('/vaccinations', requirePermission('vaccination', 'canRead'), galponContext, vaccinationController.getVaccinations);
router.get('/vaccines', requirePermission('vaccination', 'canRead'), galponContext, vaccinationController.getGalponVaccines);

module.exports = router;
