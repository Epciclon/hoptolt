const express = require('express');
const growthController = require('../controllers/growthController');

const router = express.Router();

// Ruta para actualizar edades automáticamente y obtener lista de conejos
router.get('/growth/update-age-and-list', growthController.updateAgeAndGetRabbits);

// Ruta para actualizar peso de conejos seleccionados
router.post('/growth/update-weight', growthController.updateWeight);

module.exports = router;
