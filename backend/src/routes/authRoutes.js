const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { loginLimiter, strictLimiter } = require('../middleware/security');
const {
    validateRegister,
    validateLogin,
    validateUpdateProfile,
    validateChangePassword,
    validatePagination,
    sanitizeAuthInput
} = require('../utils/authValidations');

// Rutas públicas (no requieren autenticación)

// Login de usuario
router.post('/login', 
    loginLimiter,
    sanitizeAuthInput,
    validateLogin,
    authController.login
);

// Verificar token
router.get('/verify-token',
    authenticateToken,
    authController.verifyToken
);

// Rutas protegidas (requieren autenticación)

// Obtener perfil del usuario autenticado
router.get('/profile',
    authenticateToken,
    authController.getProfile
);

// Actualizar perfil del usuario autenticado
router.put('/profile',
    authenticateToken,
    sanitizeAuthInput,
    validateUpdateProfile,
    authController.updateProfile
);

// Cambiar contraseña
router.put('/change-password',
    authenticateToken,
    strictLimiter,
    validateChangePassword,
    authController.changePassword
);

// Logout
router.post('/logout',
    authenticateToken,
    authController.logout
);

// Rutas de administración (solo admin)

// Registrar nuevo usuario (solo admin)
router.post('/register',
    authenticateToken,
    authorizeRoles('admin'),
    strictLimiter,
    sanitizeAuthInput,
    validateRegister,
    authController.register
);

// Obtener todos los usuarios (solo admin)
router.get('/users',
    authenticateToken,
    authorizeRoles('admin'),
    validatePagination,
    authController.getAllUsers
);

module.exports = router;
