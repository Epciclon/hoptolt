const express = require('express');
const router = express.Router();
const matingController = require('../controllers/matingController');

// Listar conejas disponibles para monta
router.get('/mating/females', matingController.getAvailableFemales);

// Registrar datos de monta
router.post('/mating/register', matingController.registerMating);

// Listar montas activas (para eliminar parto)
router.get('/mating/active', matingController.getActiveMatings);

// Eliminar parto (eliminar monta)
router.delete('/mating/:id', matingController.deleteMating);

module.exports = router;
