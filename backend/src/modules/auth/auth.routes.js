const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authenticate } = require('../../common/middlewares/auth.middleware');

// ─── Rutas públicas ───────────────────────────────────────────────────────────

/**
 * POST /api/auth/sync-profile
 * El frontend llama a esta ruta tras un signUp exitoso en Supabase para
 * garantizar que el perfil local existe en la base de datos.
 */
router.post('/auth/sync-profile', authController.syncProfile);

/**
 * GET /api/auth/resolve-email?identifier=username_o_email
 * Traduce un username a su email para poder hacer signIn en Supabase.
 */
router.get('/auth/resolve-email', authController.resolveEmail);

// ─── Rutas protegidas (requieren JWT de Supabase) ─────────────────────────────

/** GET /api/auth/me — Perfil del usuario autenticado */
router.get('/auth/me', authenticate, authController.getMe);

/** PATCH /api/auth/active-galpon — Actualizar galpón activo */
router.patch('/auth/active-galpon', authenticate, authController.setActiveGalpon);

/** PUT /api/auth/profile — Actualizar datos personales */
router.put('/auth/profile', authenticate, authController.updateProfile);

/** POST /api/auth/profile/delete — Eliminar cuenta definitivamente */
router.post('/auth/profile/delete', authenticate, authController.deleteAccount);

module.exports = router;
