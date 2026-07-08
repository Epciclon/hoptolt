const express = require('express');
const router = express.Router();
const genealogyController = require('./genealogy.controller');
const { validateRegisterGenealogy, validateEditGenealogy } = require('./genealogy.validator');
const { galponContext } = require('../../common/middlewares/galponContext');
const { requirePermission } = require('../../common/middlewares/authorization.middleware');
const { authenticate } = require('../../common/middlewares/auth.middleware');

router.use('/genealogies', authenticate); // Protect all routes in this router

router.post('/genealogies', requirePermission('genealogy', 'canCreate'), galponContext, validateRegisterGenealogy, genealogyController.registerGenealogy);
router.get('/genealogies', requirePermission('genealogy', 'canRead'), galponContext, genealogyController.getAllGenealogies);
router.get('/genealogies/check-consanguinity/:id1/:id2', requirePermission('reproduction', 'canCreate'), genealogyController.checkConsanguinity);
router.get('/genealogies/:rabbitId', requirePermission('genealogy', 'canRead'), genealogyController.getGenealogy);
router.get('/genealogies/:rabbitId/tree', requirePermission('genealogy', 'canRead'), genealogyController.getGenealogyTree);
router.put('/genealogies/:rabbitId', requirePermission('genealogy', 'canUpdate'), galponContext, validateEditGenealogy, genealogyController.editGenealogy);

module.exports = router;
