const express = require('express');
const router = express.Router();
const assignRabbitController = require('../controllers/assignRabbitController');


// Asignar conejo a jaula
router.post('/assign-rabbit', assignRabbitController.assignRabbit);

// Listar asignaciones jaula-conejo
router.get('/assignments', assignRabbitController.getAssignments);

// Quitar asignación de conejo a jaula (POST - cambia estado a liberado)
router.post('/unassign', assignRabbitController.unassignRabbit);

// Eliminar asignación completamente (DELETE - elimina el registro)
router.delete('/assignments/:rabbitCode', assignRabbitController.deleteAssignmentByRabbitCode);

module.exports = router;
