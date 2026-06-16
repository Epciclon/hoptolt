const express = require('express');
const router = express.Router();
const invitationController = require('./invitation.controller');
const { validateCreateInvitation } = require('./invitation.validator');
const { authenticate } = require('../../common/middlewares/auth.middleware');

router.use('/invitations', authenticate);
router.use('/galpones', authenticate);

// Mis invitaciones pendientes (para trabajadores al iniciar sesión)
router.get('/invitations/me', invitationController.getMyPendingInvitations);

// Invitaciones de un galpón (para propietarios)
router.get('/galpones/:galponId/invitations', invitationController.getInvitationsByGalpon);

// Crear invitación (propietario invita a un email)
router.post('/galpones/:galponId/invitations', validateCreateInvitation, invitationController.createInvitation);

// Aceptar invitación (trabajador acepta por token)
router.post('/invitations/:token/accept', invitationController.acceptInvitation);

// Revocar invitación (propietario cancela)
router.delete('/invitations/:token', invitationController.revokeInvitation);

module.exports = router;
