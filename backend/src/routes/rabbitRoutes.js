const express = require('express');
const router = express.Router();
const rabbitController = require('../controllers/rabbitController');

// Ruta para obtener todas las razas disponibles
router.get('/rabbits/races', rabbitController.getAvailableRaces);

// Ruta para registrar un nuevo conejo
router.post('/rabbits', rabbitController.registerRabbit);

// Ruta para obtener todos los conejos
router.get('/rabbits', rabbitController.getAllRabbits);

// Ruta para obtener un conejo por código
router.get('/rabbits/:code', rabbitController.getRabbit);

// Ruta para editar un conejo por código
router.put('/rabbits/:code', rabbitController.editRabbit);

// Ruta para eliminar un conejo por código
router.delete('/rabbits/:code', rabbitController.deleteRabbit);

module.exports = router;