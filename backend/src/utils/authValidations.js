const { body, param, query } = require('express-validator');

// Validaciones para registro
const validateRegister = [
    body('username')
        .isLength({ min: 3, max: 30 })
        .withMessage('El nombre de usuario debe tener entre 3 y 30 caracteres')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('El nombre de usuario solo puede contener letras, números y guiones bajos')
        .trim()
        .toLowerCase(),
    
    body('email')
        .isEmail()
        .withMessage('Formato de email inválido')
        .normalizeEmail()
        .isLength({ max: 100 })
        .withMessage('El email no puede superar los 100 caracteres'),
    
    body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('La contraseña debe tener entre 8 y 128 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&)'),
    
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Las contraseñas no coinciden');
            }
            return true;
        }),
    
    body('firstName')
        .isLength({ min: 1, max: 50 })
        .withMessage('El nombre debe tener entre 1 y 50 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('El nombre solo puede contener letras y espacios')
        .trim(),
    
    body('lastName')
        .isLength({ min: 1, max: 50 })
        .withMessage('El apellido debe tener entre 1 y 50 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('El apellido solo puede contener letras y espacios')
        .trim(),
    
    body('role')
        .optional()
        .isIn(['admin', 'manager', 'employee'])
        .withMessage('Rol inválido. Debe ser admin, manager o employee')
];

// Validaciones para login
const validateLogin = [
    body('username')
        .notEmpty()
        .withMessage('Usuario o email requerido')
        .isLength({ min: 3, max: 100 })
        .withMessage('Usuario o email debe tener entre 3 y 100 caracteres')
        .trim(),
    
    body('password')
        .notEmpty()
        .withMessage('Contraseña requerida')
        .isLength({ min: 1, max: 128 })
        .withMessage('Contraseña inválida')
];

// Validaciones para actualizar perfil
const validateUpdateProfile = [
    body('firstName')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('El nombre debe tener entre 1 y 50 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('El nombre solo puede contener letras y espacios')
        .trim(),
    
    body('lastName')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('El apellido debe tener entre 1 y 50 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('El apellido solo puede contener letras y espacios')
        .trim(),
    
    body('email')
        .optional()
        .isEmail()
        .withMessage('Formato de email inválido')
        .normalizeEmail()
        .isLength({ max: 100 })
        .withMessage('El email no puede superar los 100 caracteres')
];

// Validaciones para cambio de contraseña
const validateChangePassword = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Contraseña actual requerida'),
    
    body('newPassword')
        .isLength({ min: 8, max: 128 })
        .withMessage('La nueva contraseña debe tener entre 8 y 128 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('La nueva contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&)'),
    
    body('confirmNewPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Las contraseñas no coinciden');
            }
            return true;
        })
];

// Validaciones para parámetros de ID
const validateUserId = [
    param('id')
        .isMongoId()
        .withMessage('ID de usuario inválido')
];

// Validaciones para paginación
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('La página debe ser un número entero mayor a 0'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('El límite debe ser un número entero entre 1 y 100')
];

// Validaciones para forgot password
const validateForgotPassword = [
    body('email')
        .isEmail()
        .withMessage('Formato de email inválido')
        .normalizeEmail()
];

// Validaciones para reset password
const validateResetPassword = [
    body('token')
        .notEmpty()
        .withMessage('Token requerido')
        .isLength({ min: 20, max: 200 })
        .withMessage('Token inválido'),
    
    body('newPassword')
        .isLength({ min: 8, max: 128 })
        .withMessage('La contraseña debe tener entre 8 y 128 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&)'),
    
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Las contraseñas no coinciden');
            }
            return true;
        })
];

// Middleware personalizado para sanitización adicional
const sanitizeAuthInput = (req, res, next) => {
    // Sanitizar campos específicos de autenticación
    if (req.body.username) {
        req.body.username = req.body.username.trim().toLowerCase();
    }
    
    if (req.body.email) {
        req.body.email = req.body.email.trim().toLowerCase();
    }
    
    if (req.body.firstName) {
        req.body.firstName = req.body.firstName.trim();
    }
    
    if (req.body.lastName) {
        req.body.lastName = req.body.lastName.trim();
    }
    
    next();
};

module.exports = {
    validateRegister,
    validateLogin,
    validateUpdateProfile,
    validateChangePassword,
    validateUserId,
    validatePagination,
    validateForgotPassword,
    validateResetPassword,
    sanitizeAuthInput
};
