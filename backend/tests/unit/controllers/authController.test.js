const authController = require('../../../src/controllers/authController');
const User = require('../../../src/models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { validationResult } = require('express-validator');

// Mock all dependencies
jest.mock('../../../src/models/user', () => ({
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn()
}));
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');
jest.mock('crypto');
jest.mock('express-validator');

describe('Auth Controller', () => {
    let req, res;

    // Mock helper functions
    const mockRequest = (body = {}, user = {}, headers = {}) => ({
        body,
        user,
        headers,
        ip: '127.0.0.1'
    });

    const mockResponse = () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        res.cookie = jest.fn().mockReturnValue(res);
        res.clearCookie = jest.fn().mockReturnValue(res);
        return res;
    };

    beforeEach(() => {
        req = mockRequest();
        res = mockResponse();
        jest.clearAllMocks();
        
        // Mock environment variables
        process.env.JWT_SECRET = 'test-secret';
        process.env.JWT_EXPIRE = '24h';
        
        // Default successful validation
        validationResult.mockReturnValue({
            isEmpty: () => true,
            array: () => []
        });
        
        // Mock console to avoid noise
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('register', () => {
        test('should register user successfully', async () => {
            req.body = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                firstName: 'Test',
                lastName: 'User',
                role: 'employee'
            };

            User.findOne.mockResolvedValue(null);
            const mockUser = {
                _id: 'userId',
                username: 'testuser',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                role: 'employee',
                save: jest.fn().mockResolvedValue(),
                toPublicJSON: jest.fn().mockReturnValue({
                    username: 'testuser',
                    email: 'test@example.com',
                    firstName: 'Test',
                    lastName: 'User',
                    role: 'employee'
                })
            };
            
            // Mock User constructor
            User.mockImplementation(() => mockUser);
            jwt.sign.mockReturnValue('mock-token');

            await authController.register(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Usuario registrado exitosamente',
                data: {
                    user: expect.objectContaining({
                        username: 'testuser',
                        email: 'test@example.com'
                    }),
                    token: 'mock-token'
                }
            });
        });

        test('should return validation errors', async () => {
            validationResult.mockReturnValue({
                isEmpty: () => false,
                array: () => [{ msg: 'Username is required' }]
            });

            await authController.register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Datos de entrada inválidos',
                errors: [{ msg: 'Username is required' }]
            });
        });

        test('should return error if email already exists', async () => {
            req.body = {
                username: 'testuser',
                email: 'existing@example.com',
                password: 'password123',
                firstName: 'Test',
                lastName: 'User',
                role: 'employee'
            };

            User.findOne.mockResolvedValue({
                email: 'existing@example.com'
            });

            await authController.register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Ya existe un usuario con este email'
            });
        });

        test('should return error if username already exists', async () => {
            req.body = {
                username: 'existinguser',
                email: 'test@example.com',
                password: 'password123',
                firstName: 'Test',
                lastName: 'User',
                role: 'employee'
            };

            User.findOne.mockResolvedValue({
                username: 'existinguser'
            });

            await authController.register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Ya existe un usuario con este nombre de usuario'
            });
        });

        test('should handle database errors', async () => {
            req.body = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                firstName: 'Test',
                lastName: 'User',
                role: 'employee'
            };

            User.findOne.mockRejectedValue(new Error('Database error'));

            await authController.register(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor'
            });
        });

        test('should handle MongoDB duplicate key error', async () => {
            req.body = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                firstName: 'Test',
                lastName: 'User',
                role: 'employee'
            };

            User.findOne.mockResolvedValue(null);
            const mockUser = {
                save: jest.fn().mockRejectedValue({
                    code: 11000,
                    keyPattern: { email: 1 }
                })
            };
            User.mockImplementation(() => mockUser);

            await authController.register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Ya existe un usuario con este email'
            });
        });

        test('should handle validation errors', async () => {
            req.body = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                firstName: 'Test',
                lastName: 'User',
                role: 'employee'
            };

            User.findOne.mockResolvedValue(null);
            const mockUser = {
                save: jest.fn().mockRejectedValue({
                    name: 'ValidationError',
                    errors: {
                        email: { message: 'Email is required' },
                        username: { message: 'Username is required' }
                    }
                })
            };
            User.mockImplementation(() => mockUser);

            await authController.register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Errores de validación',
                errors: ['Email is required', 'Username is required']
            });
        });
    });

    describe('login', () => {
        test('should login user successfully with username', async () => {
            req.body = {
                username: 'testuser',
                password: 'password123'
            };

            const mockUser = {
                _id: 'userId',
                username: 'testuser',
                email: 'test@example.com',
                isActive: true,
                failedLoginAttempts: 0,
                isLocked: false,
                comparePassword: jest.fn().mockResolvedValue(true),
                incLoginAttempts: jest.fn(),
                resetLoginAttempts: jest.fn(),
                toPublicJSON: jest.fn().mockReturnValue({
                    username: 'testuser',
                    email: 'test@example.com'
                })
            };

            User.findOne.mockResolvedValue(mockUser);
            jwt.sign.mockReturnValue('mock-token');

            await authController.login(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Login exitoso',
                data: {
                    user: expect.objectContaining({
                        username: 'testuser',
                        email: 'test@example.com'
                    }),
                    token: 'mock-token'
                }
            });
        });

        test('should return validation errors for login', async () => {
            validationResult.mockReturnValue({
                isEmpty: () => false,
                array: () => [{ msg: 'Username is required' }]
            });

            await authController.login(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Datos de entrada inválidos',
                errors: [{ msg: 'Username is required' }]
            });
        });

        test('should return error for invalid credentials', async () => {
            req.body = {
                username: 'nonexistent',
                password: 'password123'
            };

            User.findOne.mockResolvedValue(null);

            await authController.login(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Credenciales inválidas'
            });
        });

        test('should return error for wrong password', async () => {
            req.body = {
                username: 'testuser',
                password: 'wrongpassword'
            };

            const mockUser = {
                _id: 'userId',
                username: 'testuser',
                isActive: true,
                failedLoginAttempts: 0,
                isLocked: false,
                comparePassword: jest.fn().mockResolvedValue(false),
                incLoginAttempts: jest.fn()
            };

            User.findOne.mockResolvedValue(mockUser);

            await authController.login(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Credenciales inválidas'
            });
        });

        test('should handle locked account', async () => {
            req.body = {
                username: 'testuser',
                password: 'password123'
            };

            const mockUser = {
                _id: 'userId',
                username: 'testuser',
                isActive: true,
                failedLoginAttempts: 5,
                isLocked: true,
                lockUntil: new Date(Date.now() + 3600000) // 1 hour from now
            };

            User.findOne.mockResolvedValue(mockUser);

            await authController.login(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Cuenta temporalmente bloqueada por múltiples intentos fallidos'
            });
        });

        test('should handle inactive user', async () => {
            req.body = {
                username: 'testuser',
                password: 'password123'
            };

            const mockUser = {
                _id: 'userId',
                username: 'testuser',
                isActive: false,
                failedLoginAttempts: 0,
                isLocked: false
            };

            User.findOne.mockResolvedValue(mockUser);

            await authController.login(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Cuenta desactivada. Contacte al administrador.'
            });
        });

        test('should handle password comparison error with blocking message', async () => {
            req.body = {
                username: 'testuser',
                password: 'password123'
            };

            const mockUser = {
                _id: 'userId',
                username: 'testuser',
                isActive: true,
                failedLoginAttempts: 4,
                isLocked: false,
                comparePassword: jest.fn().mockRejectedValue(new Error('Cuenta temporalmente bloqueada por múltiples intentos fallidos'))
            };

            User.findOne.mockResolvedValue(mockUser);

            await authController.login(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Cuenta temporalmente bloqueada por múltiples intentos fallidos'
            });
        });

        test('should handle unexpected errors during login', async () => {
            req.body = {
                username: 'testuser',
                password: 'password123'
            };

            User.findOne.mockRejectedValue(new Error('Database error'));

            await authController.login(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor'
            });
        });
    });

    describe('getProfile', () => {
        test('should get user profile successfully', async () => {
            req.user = {
                _id: 'userId',
                username: 'testuser',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                toPublicJSON: jest.fn().mockReturnValue({
                    username: 'testuser',
                    email: 'test@example.com',
                    firstName: 'Test',
                    lastName: 'User'
                })
            };

            await authController.getProfile(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    user: expect.objectContaining({
                        username: 'testuser',
                        email: 'test@example.com'
                    })
                }
            });
        });

        test('should handle error during profile retrieval', async () => {
            req.user = {
                toPublicJSON: jest.fn().mockImplementation(() => {
                    throw new Error('Profile error');
                })
            };

            await authController.getProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor'
            });
        });
    });

    describe('updateProfile', () => {
        test('should update profile successfully', async () => {
            req.user = { _id: 'userId' };
            req.body = {
                email: 'newemail@example.com',
                firstName: 'New',
                lastName: 'Name'
            };

            const mockUpdatedUser = {
                _id: 'userId',
                email: 'newemail@example.com',
                firstName: 'New',
                lastName: 'Name',
                toPublicJSON: jest.fn().mockReturnValue({
                    email: 'newemail@example.com',
                    firstName: 'New',
                    lastName: 'Name'
                })
            };

            User.findOne.mockResolvedValue(null); // No existing email
            User.findByIdAndUpdate.mockResolvedValue(mockUpdatedUser);

            await authController.updateProfile(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Perfil actualizado exitosamente',
                data: {
                    user: expect.objectContaining({
                        email: 'newemail@example.com'
                    })
                }
            });
        });

        test('should return validation errors for profile update', async () => {
            validationResult.mockReturnValue({
                isEmpty: () => false,
                array: () => [{ msg: 'Email is required' }]
            });

            await authController.updateProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Datos de entrada inválidos',
                errors: [{ msg: 'Email is required' }]
            });
        });

        test('should return error if email already exists', async () => {
            req.user = { _id: 'userId', email: 'current@example.com' };
            req.body = {
                email: 'existing@example.com',
                firstName: 'New',
                lastName: 'Name'
            };

            User.findOne.mockResolvedValue({
                _id: 'anotherId',
                email: 'existing@example.com'
            });

            await authController.updateProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Este email ya está en uso por otro usuario'
            });
        });

        test('should handle validation errors during update', async () => {
            req.user = { _id: 'userId' };
            req.body = {
                email: 'newemail@example.com',
                firstName: 'New',
                lastName: 'Name'
            };

            User.findOne.mockResolvedValue(null);
            User.findByIdAndUpdate.mockRejectedValue({
                name: 'ValidationError',
                errors: {
                    email: { message: 'Invalid email format' }
                }
            });

            await authController.updateProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Errores de validación',
                errors: ['Invalid email format']
            });
        });

        test('should handle database errors during update', async () => {
            req.user = { _id: 'userId' };
            req.body = {
                email: 'newemail@example.com',
                firstName: 'New',
                lastName: 'Name'
            };

            User.findOne.mockResolvedValue(null);
            User.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

            await authController.updateProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor'
            });
        });
    });

    describe('changePassword', () => {
        test('should change password successfully', async () => {
            req.user = { _id: 'userId' };
            req.body = {
                currentPassword: 'oldpassword',
                newPassword: 'newpassword'
            };

            const mockUser = {
                _id: 'userId',
                password: 'hashedOldPassword',
                save: jest.fn().mockResolvedValue()
            };

            User.findById.mockResolvedValue(mockUser);
            bcrypt.compare
                .mockResolvedValueOnce(true)  // Current password is correct
                .mockResolvedValueOnce(false); // New password is different

            await authController.changePassword(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Contraseña actualizada exitosamente'
            });
        });

        test('should return validation errors for password change', async () => {
            validationResult.mockReturnValue({
                isEmpty: () => false,
                array: () => [{ msg: 'Current password is required' }]
            });

            await authController.changePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Datos de entrada inválidos',
                errors: [{ msg: 'Current password is required' }]
            });
        });

        test('should return error for wrong current password', async () => {
            req.user = { _id: 'userId' };
            req.body = {
                currentPassword: 'wrongpassword',
                newPassword: 'newpassword'
            };

            const mockUser = {
                _id: 'userId',
                password: 'hashedOldPassword'
            };

            User.findById.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false); // Current password is wrong

            await authController.changePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'La contraseña actual es incorrecta'
            });
        });

        test('should return error if new password is same as current', async () => {
            req.user = { _id: 'userId' };
            req.body = {
                currentPassword: 'samepassword',
                newPassword: 'samepassword'
            };

            const mockUser = {
                _id: 'userId',
                password: 'hashedPassword'
            };

            User.findById.mockResolvedValue(mockUser);
            bcrypt.compare
                .mockResolvedValueOnce(true)  // Current password is correct
                .mockResolvedValueOnce(true); // New password is same

            await authController.changePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'La nueva contraseña debe ser diferente a la actual'
            });
        });

        test('should handle validation errors during password change', async () => {
            req.user = { _id: 'userId' };
            req.body = {
                currentPassword: 'oldpassword',
                newPassword: 'newpassword'
            };

            const mockUser = {
                _id: 'userId',
                password: 'hashedOldPassword',
                save: jest.fn().mockRejectedValue({
                    name: 'ValidationError',
                    errors: {
                        password: { message: 'Password too weak' }
                    }
                })
            };

            User.findById.mockResolvedValue(mockUser);
            bcrypt.compare
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);

            await authController.changePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Errores de validación',
                errors: ['Password too weak']
            });
        });

        test('should handle database errors during password change', async () => {
            req.user = { _id: 'userId' };
            req.body = {
                currentPassword: 'oldpassword',
                newPassword: 'newpassword'
            };

            User.findById.mockRejectedValue(new Error('Database error'));

            await authController.changePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor'
            });
        });
    });

    describe('logout', () => {
        test('should logout user successfully', async () => {
            await authController.logout(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Logout exitoso'
            });
        });

        test('should handle error during logout', async () => {
            // Mock console.error to throw
            const originalConsole = console.error;
            console.error = jest.fn().mockImplementation(() => {
                throw new Error('Console error');
            });

            // Mock res.json to throw error
            res.json = jest.fn().mockImplementation(() => {
                throw new Error('Logout error');
            });

            await authController.logout(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            
            // Restore console
            console.error = originalConsole;
        });
    });

    describe('verifyToken', () => {
        test('should verify token successfully', async () => {
            req.user = {
                _id: 'userId',
                username: 'testuser',
                toPublicJSON: jest.fn().mockReturnValue({
                    username: 'testuser'
                })
            };

            await authController.verifyToken(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    user: expect.objectContaining({
                        username: 'testuser'
                    })
                }
            });
        });

        test('should handle error during token verification', async () => {
            req.user = {
                toPublicJSON: jest.fn().mockImplementation(() => {
                    throw new Error('Token verification error');
                })
            };

            await authController.verifyToken(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor'
            });
        });
    });

    describe('getAllUsers', () => {
        test('should get all users successfully', async () => {
            const mockUsers = [
                { 
                    username: 'user1', 
                    email: 'user1@example.com',
                    toPublicJSON: jest.fn().mockReturnValue({
                        username: 'user1',
                        email: 'user1@example.com'
                    })
                },
                { 
                    username: 'user2', 
                    email: 'user2@example.com',
                    toPublicJSON: jest.fn().mockReturnValue({
                        username: 'user2',
                        email: 'user2@example.com'
                    })
                }
            ];

            User.find.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    sort: jest.fn().mockReturnValue({
                        skip: jest.fn().mockReturnValue({
                            limit: jest.fn().mockResolvedValue(mockUsers)
                        })
                    })
                })
            });

            User.countDocuments = jest.fn().mockResolvedValue(2);

            await authController.getAllUsers(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    users: expect.arrayContaining([
                        expect.objectContaining({
                            username: 'user1',
                            email: 'user1@example.com'
                        }),
                        expect.objectContaining({
                            username: 'user2',
                            email: 'user2@example.com'
                        })
                    ]),
                    pagination: {
                        page: 1,
                        limit: 10,
                        total: 2,
                        pages: 1
                    }
                }
            });
        });

        test('should handle query parameters for pagination', async () => {
            req.query = { page: '2', limit: '5' };
            
            const mockUsers = [];
            User.find.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    sort: jest.fn().mockReturnValue({
                        skip: jest.fn().mockReturnValue({
                            limit: jest.fn().mockResolvedValue(mockUsers)
                        })
                    })
                })
            });

            User.countDocuments = jest.fn().mockResolvedValue(15);

            await authController.getAllUsers(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    users: [],
                    pagination: {
                        page: 2,
                        limit: 5,
                        total: 15,
                        pages: 3
                    }
                }
            });
        });

        test('should handle database errors', async () => {
            User.find.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    sort: jest.fn().mockReturnValue({
                        skip: jest.fn().mockReturnValue({
                            limit: jest.fn().mockRejectedValue(new Error('Database error'))
                        })
                    })
                })
            });

            await authController.getAllUsers(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor'
            });
        });
    });
});
