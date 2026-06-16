const catchAsync = require('../../common/middlewares/catchAsync');
const authService = require('./auth.service');
const { toProfileDTO } = require('../../common/dtos/profile.dto');

/**
 * POST /api/auth/sync-profile
 * Sincroniza el perfil local con los datos del usuario recién registrado en Supabase.
 * Esta ruta es semi-pública: el frontend la llama inmediatamente tras signUp().
 * No requiere JWT porque el usuario acaba de crearse y aún no tiene sesión activa en el backend.
 */
exports.syncProfile = catchAsync(async (req, res) => {
    const profile = await authService.syncProfile(req.body);
    res.status(201).json({
        success: true,
        message: 'Perfil sincronizado correctamente.',
        user: toProfileDTO(profile)
    });
});

/**
 * GET /api/auth/me  [Protected]
 * Retorna el perfil del usuario autenticado (req.user viene del middleware authenticate).
 */
exports.getMe = catchAsync(async (req, res) => {
    const profile = await authService.getMe(req.user.id);
    res.status(200).json({
        success: true,
        user: toProfileDTO(profile)
    });
});

/**
 * PATCH /api/auth/active-galpon  [Protected]
 * Actualiza el galpón activo del usuario autenticado.
 */
exports.setActiveGalpon = catchAsync(async (req, res) => {
    const galponId = req.body.galponId || null;
    const profile = await authService.setActiveGalpon(req.user.id, galponId);
    res.status(200).json({
        success: true,
        message: 'Galpón activo actualizado.',
        user: toProfileDTO(profile)
    });
});

/**
 * GET /api/auth/resolve-email?identifier=...
 * Resuelve un username o email a un email registrado.
 * El frontend lo usa para obtener el email antes de llamar a supabase.auth.signInWithPassword().
 */
exports.resolveEmail = catchAsync(async (req, res) => {
    const { identifier } = req.query;
    if (!identifier) {
        return res.status(400).json({ success: false, message: 'Se requiere el parámetro identifier.' });
    }
    const email = await authService.resolveEmail(identifier);
    res.status(200).json({ success: true, email });
});

/**
 * PUT /api/auth/profile  [Protected]
 * Actualiza los datos personales (fullName y username).
 */
exports.updateProfile = catchAsync(async (req, res) => {
    const { fullName, username } = req.body;
    const profile = await authService.updateProfile(req.user.id, { fullName, username });
    res.status(200).json({
        success: true,
        message: 'Perfil actualizado correctamente.',
        user: toProfileDTO(profile)
    });
});

/**
 * POST /api/auth/profile/delete  [Protected]
 * Elimina la cuenta y todos los datos asociados de forma permanente.
 */
exports.deleteAccount = catchAsync(async (req, res) => {
    const { currentPassword } = req.body;
    if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Se requiere la contraseña para confirmar la eliminación.' });
    }
    await authService.deleteAccount(req.user.id, currentPassword);
    res.status(200).json({
        success: true,
        message: 'Cuenta eliminada permanentemente.'
    });
});
