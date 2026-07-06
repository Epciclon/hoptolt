const express = require('express');
const router = express.Router();
const farmMemberController = require('./farmMember.controller');
const { authenticate } = require('../../common/middlewares/auth.middleware');

// Todos los endpoints requieren autenticación
router.use('/farm-members', authenticate);
router.use('/galpones', authenticate);

// Mis membresías (galpones donde participo)
router.get('/farm-members/me', farmMemberController.getMembershipsForMe);

// Trabajadores de un galpón específico (solo propietario)
router.get('/galpones/:galponId/workers', farmMemberController.getWorkersByGalpon);

// Todos los miembros de un galpón (propietario + trabajadores)
router.get('/galpones/:galponId/members', farmMemberController.getAllMembersByGalpon);

// Obtener trabajador por ID con permisos y jaulas (solo propietario)
router.get('/farm-members/:id', farmMemberController.getWorkerById);

// Editar trabajador (permisos y jaulas)
router.put('/farm-members/:id', farmMemberController.updateWorker);

// Desvincular trabajador del galpón
router.delete('/farm-members/:id', farmMemberController.removeWorker);

module.exports = router;
