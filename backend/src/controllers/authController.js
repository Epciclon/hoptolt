const User = require('../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { validationResult } = require('express-validator');

// Generar JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { 
            expiresIn: process.env.JWT_EXPIRE || '24h',
            issuer: 'rabbit-management-system',
            audience: 'rabbit-management-users'
        }
    );
};

// Registrar nuevo usuario (solo admin puede crear usuarios)
exports.register = async (req, res) => {
    try {
        // Verificar errores de validación
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Datos de entrada inválidos',
                errors: errors.array()
            });
        }

        const { username, email, password, firstName, lastName, role } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({
            $or: [
                { email: email.toLowerCase() },
                { username: username.toLowerCase() }
            ]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: existingUser.email === email.toLowerCase() 
                    ? 'Ya existe un usuario con este email'
                    : 'Ya existe un usuario con este nombre de usuario'
            });
        }

        // Crear nuevo usuario
        const user = new User({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password,
            firstName,
            lastName,
            role: role || 'employee' // rol por defecto
        });

        await user.save();

        // Generar token
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            data: {
                user: user.toPublicJSON(),
                token
            }
        });

    } catch (error) {
        console.error('Error en registro:', error);
        
        // Manejar errores de MongoDB (duplicados, etc.)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                success: false,
                message: `Ya existe un usuario con este ${field}`
            });
        }

        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Errores de validación',
                errors: validationErrors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Login de usuario
exports.login = async (req, res) => {
    try {
        // Verificar errores de validación
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Datos de entrada inválidos',
                errors: errors.array()
            });
        }

        const { username, password } = req.body;

        // Buscar usuario por username o email
        const user = await User.findOne({
            $or: [
                { username: username.toLowerCase() },
                { email: username.toLowerCase() }
            ]
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Verificar si la cuenta está activa
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Cuenta desactivada. Contacte al administrador.'
            });
        }

        // Verificar si la cuenta está bloqueada
        if (user.isLocked) {
            return res.status(401).json({
                success: false,
                message: 'Cuenta temporalmente bloqueada por múltiples intentos fallidos'
            });
        }

        try {
            // Verificar contraseña
            const isPasswordValid = await user.comparePassword(password);

            if (!isPasswordValid) {
                // Incrementar intentos fallidos
                await user.incLoginAttempts();
                
                return res.status(401).json({
                    success: false,
                    message: 'Credenciales inválidas'
                });
            }

            // Login exitoso - resetear intentos
            await user.resetLoginAttempts();

            // Generar token
            const token = generateToken(user._id);

            // Log de login exitoso
            console.log(`[LOGIN SUCCESS] Usuario: ${user.username} - IP: ${req.ip} - ${new Date().toISOString()}`);

            res.json({
                success: true,
                message: 'Login exitoso',
                data: {
                    user: user.toPublicJSON(),
                    token
                }
            });

        } catch (error) {
            if (error.message.includes('bloqueada')) {
                return res.status(401).json({
                    success: false,
                    message: error.message
                });
            }
            throw error;
        }

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Obtener perfil del usuario autenticado
exports.getProfile = async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                user: req.user.toPublicJSON()
            }
        });
    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Actualizar perfil del usuario
exports.updateProfile = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Datos de entrada inválidos',
                errors: errors.array()
            });
        }

        const { firstName, lastName, email } = req.body;
        const userId = req.user._id;

        // Verificar si el email ya está en uso por otro usuario
        if (email && email !== req.user.email) {
            const existingUser = await User.findOne({
                email: email.toLowerCase(),
                _id: { $ne: userId }
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Este email ya está en uso por otro usuario'
                });
            }
        }

        // Actualizar usuario
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                firstName,
                lastName,
                email: email?.toLowerCase(),
                updatedAt: Date.now()
            },
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: 'Perfil actualizado exitosamente',
            data: {
                user: updatedUser.toPublicJSON()
            }
        });

    } catch (error) {
        console.error('Error actualizando perfil:', error);
        
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Errores de validación',
                errors: validationErrors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Cambiar contraseña
exports.changePassword = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Datos de entrada inválidos',
                errors: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);

        // Verificar contraseña actual
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña actual es incorrecta'
            });
        }

        // Verificar que la nueva contraseña sea diferente
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({
                success: false,
                message: 'La nueva contraseña debe ser diferente a la actual'
            });
        }

        // Actualizar contraseña
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });

    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Errores de validación',
                errors: validationErrors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Logout (invalidar token - se maneja en el frontend)
exports.logout = async (req, res) => {
    try {
        // En este caso simple, el logout se maneja en el frontend eliminando el token
        // En implementaciones más avanzadas, podrías mantener una blacklist de tokens
        
        res.json({
            success: true,
            message: 'Logout exitoso'
        });
    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Verificar token (para validación en frontend)
exports.verifyToken = async (req, res) => {
    try {
        // Si llegamos aquí, el middleware de auth ya validó el token
        res.json({
            success: true,
            data: {
                user: req.user.toPublicJSON()
            }
        });
    } catch (error) {
        console.error('Error verificando token:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Obtener todos los usuarios (solo admin)
exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments();

        res.json({
            success: true,
            data: {
                users: users.map(user => user.toPublicJSON()),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
