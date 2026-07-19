const express = require('express');
const router = express.Router();
const assignmentController = require('./assignment.controller');
const { galponContext } = require('../../common/middlewares/galponContext');
const { requirePermission } = require('../../common/middlewares/authorization.middleware');
const { authenticate } = require('../../common/middlewares/auth.middleware');

router.use('/assignments', authenticate); // Protect all routes in this router

router.post('/assignments', requirePermission('assignments', 'canCreate'), galponContext, assignmentController.assignRabbits);
router.put('/assignments/move', requirePermission('assignments', 'canCreate'), galponContext, assignmentController.moveRabbit);
router.get('/assignments', requirePermission('assignments', 'canRead'), galponContext, assignmentController.getAssignments);
router.get('/assignments/assigned-rabbits', requirePermission('assignments', 'canRead'), galponContext, assignmentController.getAssignedRabbits);
router.get('/assignments/available-rabbits', requirePermission('assignments', 'canRead'), galponContext, assignmentController.getAvailableRabbits);
router.get('/assignments/operative-cages', requirePermission('assignments', 'canRead'), galponContext, assignmentController.getOperativeCages);
router.delete('/assignments/:id', requirePermission('assignments', 'canDelete'), assignmentController.unassignRabbit);

module.exports = router;
