const authController = require('../../../src/controllers/authController');
const User = require('../../../src/models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

jest.mock('../../../src/models/user');
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');
jest.mock('express-validator');

describe('Auth Controller Tests', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            user: {},
            headers: {},
            query: {},
            ip: '127.0.0.1'
        };
        
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        
        jest.clearAllMocks();
        
        // Default validation success
        validationResult.mockReturnValue({
            isEmpty: () => true,
            array: () => []
        });
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
                save: jest.fn().mockResolvedValue(),
                toPublicJSON: jest.fn().mockReturnValue({
                    username: 'testuser',
                    email: 'test@example.com'
                })
            };
            
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
                password: 'password123'
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

        test('should handle database errors', async () => {
            req.body = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
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
                password: 'password123'
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

        test('should handle validation errors from mongoose', async () => {
            req.body = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            };

            User.findOne.mockResolvedValue(null);
            const mockUser = {
                save: jest.fn().mockRejectedValue({
                    name: 'ValidationError',
                    errors: {
                        email: { message: 'Email is required' }
                    }
                })
            };
            User.mockImplementation(() => mockUser);

            await authController.register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Errores de validación',
                errors: ['Email is required']
            });
        });
    });

    describe('login', () => {
        test('should login user successfully', async () => {
            req.body = {
                username: 'testuser',
                password: 'password123'
            };

            const mockUser = {
                isActive: true,
                isLocked: false,
                comparePassword: jest.fn().mockResolvedValue(true),
                resetLoginAttempts: jest.fn(),
                toPublicJSON: jest.fn().mockReturnValue({
                    username: 'testuser'
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
                        username: 'testuser'
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
                username: 'wronguser',
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

        test('should handle inactive user', async () => {
            req.body = {
                username: 'testuser',
                password: 'password123'
            };

            const mockUser = {
                isActive: false,
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

        test('should handle locked account', async () => {
            req.body = {
                username: 'testuser',
                password: 'password123'
            };

            const mockUser = {
                isActive: true,
                isLocked: true
            };

            User.findOne.mockResolvedValue(mockUser);

            await authController.login(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Cuenta temporalmente bloqueada por múltiples intentos fallidos'
            });
        });

        test('should handle wrong password', async () => {
            req.body = {
                username: 'testuser',
                password: 'wrongpassword'
            };

            const mockUser = {
                isActive: true,
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

        test('should handle blocking error during password comparison', async () => {
            req.body = {
                username: 'testuser',
                password: 'password123'
            };

            const mockUser = {
                isActive: true,
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

        test('should handle unexpected login errors', async () => {
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

        test('should handle token generation errors', async () => {
            req.body = {
                username: 'testuser',
                password: 'password123'
            };

            const mockUser = {
                isActive: true,
                isLocked: false,
                comparePassword: jest.fn().mockResolvedValue(true),
                resetLoginAttempts: jest.fn().mockResolvedValue(),
                toPublicJSON: jest.fn().mockReturnValue({ username: 'testuser' }),
                _id: 'userId'
            };

            User.findOne.mockResolvedValue(mockUser);
            
            // Mock jwt.sign to throw an error
            const jwt = require('jsonwebtoken');
            const originalSign = jwt.sign;
            jwt.sign = jest.fn().mockImplementation(() => {
                throw new Error('Token generation failed');
            });

            await authController.login(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor'
            });

            // Restore original jwt.sign
            jwt.sign = originalSign;
        });
    });

    describe('getProfile', () => {
        test('should get user profile successfully', async () => {
            req.user = {
                toPublicJSON: jest.fn().mockReturnValue({
                    username: 'testuser'
                })
            };

            await authController.getProfile(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    user: expect.objectContaining({
                        username: 'testuser'
                    })
                }
            });
        });

        test('should handle profile retrieval errors', async () => {
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
                firstName: 'New',
                lastName: 'Name',
                email: 'new@example.com'
            };

            User.findOne.mockResolvedValue(null);
            
            const mockUpdatedUser = {
                toPublicJSON: jest.fn().mockReturnValue({
                    firstName: 'New',
                    lastName: 'Name'
                })
            };
            
            User.findByIdAndUpdate.mockResolvedValue(mockUpdatedUser);

            await authController.updateProfile(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Perfil actualizado exitosamente',
                data: {
                    user: expect.objectContaining({
                        firstName: 'New',
                        lastName: 'Name'
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
                email: 'existing@example.com'
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
                email: 'newemail@example.com'
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
                email: 'newemail@example.com'
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
                currentPassword: 'oldpass',
                newPassword: 'newpass'
            };

            const mockUser = {
                password: 'hashedOldPass',
                save: jest.fn()
            };

            User.findById.mockResolvedValue(mockUser);
            bcrypt.compare
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);

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
                currentPassword: 'wrongpass',
                newPassword: 'newpass'
            };

            const mockUser = {
                password: 'hashedOldPass'
            };

            User.findById.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false);

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
                currentPassword: 'samepass',
                newPassword: 'samepass'
            };

            const mockUser = {
                password: 'hashedPass'
            };

            User.findById.mockResolvedValue(mockUser);
            bcrypt.compare
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(true);

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
                currentPassword: 'oldpass',
                newPassword: 'newpass'
            };

            const mockUser = {
                password: 'hashedOldPass',
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
                currentPassword: 'oldpass',
                newPassword: 'newpass'
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
        test('should logout successfully', async () => {
            await authController.logout(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Logout exitoso'
            });
        });

        test('should handle logout errors', async () => {
            // Mock res.json to throw error
            res.json = jest.fn(() => {
                throw new Error('Logout error');
            });
            
            // Mock res.status and res.json for catch block
            res.status = jest.fn().mockReturnThis();
            const mockSecondJson = jest.fn();
            res.status.mockReturnValue({ json: mockSecondJson });

            await authController.logout(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(mockSecondJson).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor'
            });
        });
    });

    describe('verifyToken', () => {
        test('should verify token successfully', async () => {
            req.user = {
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

        test('should handle token verification errors', async () => {
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
                    toPublicJSON: jest.fn().mockReturnValue({
                        username: 'user1'
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

            User.countDocuments = jest.fn().mockResolvedValue(1);

            await authController.getAllUsers(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    users: expect.arrayContaining([
                        expect.objectContaining({
                            username: 'user1'
                        })
                    ]),
                    pagination: expect.objectContaining({
                        page: 1,
                        limit: 10,
                        total: 1,
                        pages: 1
                    })
                }
            });
        });

        test('should handle pagination parameters', async () => {
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
