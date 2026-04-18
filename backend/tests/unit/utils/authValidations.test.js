const { validationResult } = require('express-validator');
const {
    validateRegister,
    validateLogin,
    validateUpdateProfile,
    validateChangePassword,
    validateUserId,
    validatePagination,
    validateForgotPassword,
    validateResetPassword,
    sanitizeAuthInput
} = require('../../../src/utils/authValidations');

describe('Auth Validations', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
            query: {}
        };
        res = {};
        next = jest.fn();
    });

    // Helper function to run validations
    const runValidations = async (validations, req) => {
        for (const validation of validations) {
            await validation.run(req);
        }
        return validationResult(req);
    };

    describe('validateRegister', () => {
        it('should pass with valid registration data', async () => {
            req.body = {
                username: 'testuser123',
                email: 'test@example.com',
                password: 'Test123@password',
                confirmPassword: 'Test123@password',
                firstName: 'Juan',
                lastName: 'Pérez',
                role: 'employee'
            };

            const result = await runValidations(validateRegister, req);
            expect(result.isEmpty()).toBe(true);
        });

        it('should fail with invalid username - too short', async () => {
            req.body = {
                username: 'ab',
                email: 'test@example.com',
                password: 'Test123@password',
                confirmPassword: 'Test123@password',
                firstName: 'Juan',
                lastName: 'Pérez'
            };

            const result = await runValidations(validateRegister, req);
            expect(result.isEmpty()).toBe(false);
            const errors = result.array();
            expect(errors.some(err => err.msg.includes('entre 3 y 30 caracteres'))).toBe(true);
        });

        it('should fail with invalid username - special characters', async () => {
            req.body = {
                username: 'test@user',
                email: 'test@example.com',
                password: 'Test123@password',
                confirmPassword: 'Test123@password',
                firstName: 'Juan',
                lastName: 'Pérez'
            };

            const result = await runValidations(validateRegister, req);
            expect(result.isEmpty()).toBe(false);
            const errors = result.array();
            expect(errors.some(err => err.msg.includes('solo puede contener letras, números y guiones bajos'))).toBe(true);
        });

        it('should fail with invalid email format', async () => {
            req.body = {
                username: 'testuser123',
                email: 'invalid-email',
                password: 'Test123@password',
                confirmPassword: 'Test123@password',
                firstName: 'Juan',
                lastName: 'Pérez'
            };

            const result = await runValidations(validateRegister, req);
            expect(result.isEmpty()).toBe(false);
            const errors = result.array();
            expect(errors.some(err => err.msg.includes('Formato de email inválido'))).toBe(true);
        });

        it('should fail with weak password', async () => {
            req.body = {
                username: 'testuser123',
                email: 'test@example.com',
                password: 'weak',
                confirmPassword: 'weak',
                firstName: 'Juan',
                lastName: 'Pérez'
            };

            const result = await runValidations(validateRegister, req);
            expect(result.isEmpty()).toBe(false);
            const errors = result.array();
            expect(errors.some(err => err.msg.includes('entre 8 y 128 caracteres'))).toBe(true);
        });

        it('should fail with password without special characters', async () => {
            req.body = {
                username: 'testuser123',
                email: 'test@example.com',
                password: 'Test12345',
                confirmPassword: 'Test12345',
                firstName: 'Juan',
                lastName: 'Pérez'
            };

            const result = await runValidations(validateRegister, req);
            expect(result.isEmpty()).toBe(false);
            const errors = result.array();
            expect(errors.some(err => err.msg.includes('carácter especial'))).toBe(true);
        });

        it('should fail with mismatched passwords', async () => {
            req.body = {
                username: 'testuser123',
                email: 'test@example.com',
                password: 'Test123@password',
                confirmPassword: 'Different123@password',
                firstName: 'Juan',
                lastName: 'Pérez'
            };

            const result = await runValidations(validateRegister, req);
            expect(result.isEmpty()).toBe(false);
            const errors = result.array();
            expect(errors.some(err => err.msg.includes('Las contraseñas no coinciden'))).toBe(true);
        });

        it('should fail with invalid firstName - numbers', async () => {
            req.body = {
                username: 'testuser123',
                email: 'test@example.com',
                password: 'Test123@password',
                confirmPassword: 'Test123@password',
                firstName: 'Juan123',
                lastName: 'Pérez'
            };

            const result = await runValidations(validateRegister, req);
            expect(result.isEmpty()).toBe(false);
            const errors = result.array();
            expect(errors.some(err => err.msg.includes('solo puede contener letras y espacios'))).toBe(true);
        });

        it('should fail with invalid role', async () => {
            req.body = {
                username: 'testuser123',
                email: 'test@example.com',
                password: 'Test123@password',
                confirmPassword: 'Test123@password',
                firstName: 'Juan',
                lastName: 'Pérez',
                role: 'invalidrole'
            };

            const result = await runValidations(validateRegister, req);
            expect(result.isEmpty()).toBe(false);
            const errors = result.array();
            expect(errors.some(err => err.msg.includes('Rol inválido'))).toBe(true);
        });

        it('should pass without optional role', async () => {
            req.body = {
                username: 'testuser123',
                email: 'test@example.com',
                password: 'Test123@password',
                confirmPassword: 'Test123@password',
                firstName: 'Juan',
                lastName: 'Pérez'
            };

            const result = await runValidations(validateRegister, req);
            expect(result.isEmpty()).toBe(true);
        });
    });

    describe('validateLogin', () => {
        it('should pass with valid login data', async () => {
            req.body = {
                username: 'testuser',
                password: 'password123'
            };

            const result = await runValidations(validateLogin, req);
            expect(result.isEmpty()).toBe(true);
        });

        it('should fail with empty username', async () => {
            req.body = {
                username: '',
                password: 'password123'
            };

            const result = await runValidations(validateLogin, req);
            expect(result.isEmpty()).toBe(false);
            const errors = result.array();
            expect(errors.some(err => err.msg.includes('Usuario o email requerido'))).toBe(true);
        });

        it('should fail with empty password', async () => {
            req.body = {
                username: 'testuser',
                password: ''
            };

            const result = await runValidations(validateLogin, req);
            expect(result.isEmpty()).toBe(false);
            const errors = result.array();
            expect(errors.some(err => err.msg.includes('Contraseña requerida'))).toBe(true);
        });

        it('should fail with username too short', async () => {
            req.body = {
                username: 'ab',
                password: 'password123'
            };

            const result = await runValidations(validateLogin, req);
            expect(result.isEmpty()).toBe(false);
            const errors = result.array();
            expect(errors.some(err => err.msg.includes('entre 3 y 100 caracteres'))).toBe(true);
        });
    });

    describe('validateUpdateProfile', () => {
        it('should pass with valid update data', async () => {
            req.body = {
                firstName: 'Juan Carlos',
                lastName: 'González',
                email: 'newemail@example.com'
            };

            const result = await runValidations(validateUpdateProfile, req);
            expect(result.isEmpty()).toBe(true);
        });

        it('should pass with empty body (all optional fields)', async () => {
            req.body = {};

            const result = await runValidations(validateUpdateProfile, req);
            expect(result.isEmpty()).toBe(true);
        });

        it('should fail with invalid firstName', async () => {
            req.body = {
                firstName: 'Juan123'
            };

            const result = await runValidations(validateUpdateProfile, req);
            expect(result.isEmpty()).toBe(false);
            const errors = result.array();
            expect(errors.some(err => err.msg.includes('solo puede contener letras y espacios'))).toBe(true);
        });

        it('should fail with invalid email', async () => {
            req.body = {
                email: 'invalid-email'
            };

            const result = await runValidations(validateUpdateProfile, req);
            expect(result.isEmpty()).toBe(false);
            const errors = result.array();
            expect(errors.some(err => err.msg.includes('Formato de email inválido'))).toBe(true);
        });
    });

    describe('validateChangePassword', () => {
        it('should pass with valid password change data', async () => {
            req.body = {
                currentPassword: 'oldpassword',
                newPassword: 'NewPass123@',
                confirmNewPassword: 'NewPass123@'
            };

            const result = await runValidations(validateChangePassword, req);
            expect(result.isEmpty()).toBe(true);
        });

        it('should fail with empty current password', async () => {
            req.body = {
                currentPassword: '',
                newPassword: 'NewPass123@',
                confirmNewPassword: 'NewPass123@'
            };

            const result = await runValidations(validateChangePassword, req);
            expect(result.isEmpty()).toBe(false);
            const errors = result.array();
            expect(errors.some(err => err.msg.includes('Contraseña actual requerida'))).toBe(true);
        });

        it('should fail with weak new password', async () => {
            req.body = {
                currentPassword: 'oldpassword',
                newPassword: 'weak',
                confirmNewPassword: 'weak'
            };

            const result = await runValidations(validateChangePassword, req);
            expect(result.isEmpty()).toBe(false);
            const errors = result.array();
            expect(errors.some(err => err.msg.includes('entre 8 y 128 caracteres'))).toBe(true);
        });

        it('should fail with mismatched new passwords', async () => {
            req.body = {
                currentPassword: 'oldpassword',
                newPassword: 'NewPass123@',
                confirmNewPassword: 'DifferentPass123@'
            };

            const result = await runValidations(validateChangePassword, req);
            expect(result.isEmpty()).toBe(false);
            const errors = result.array();
            expect(errors.some(err => err.msg.includes('Las contraseñas no coinciden'))).toBe(true);
        });
    });

    describe('validateUserId', () => {
        it('should pass with valid MongoDB ObjectId', async () => {
            req.params = {
                id: '507f1f77bcf86cd799439011'
            };

            const result = await runValidations(validateUserId, req);
            expect(result.isEmpty()).toBe(true);
        });

        it('should fail with invalid ObjectId', async () => {
            req.params = {
                id: 'invalid-id'
            };

            const result = await runValidations(validateUserId, req);
            expect(result.isEmpty()).toBe(false);
            const errors = result.array();
            expect(errors.some(err => err.msg.includes('ID de usuario inválido'))).toBe(true);
        });
    });

    describe('validatePagination', () => {
        it('should pass with valid pagination parameters', async () => {
            req.query = {
                page: '2',
                limit: '10'
            };

            const result = await runValidations(validatePagination, req);
            expect(result.isEmpty()).toBe(true);
        });

        it('should pass without pagination parameters', async () => {
            req.query = {};

            const result = await runValidations(validatePagination, req);
            expect(result.isEmpty()).toBe(true);
        });

        it('should fail with invalid page number', async () => {
            req.query = {
                page: '0'
            };

            const result = await runValidations(validatePagination, req);
            expect(result.isEmpty()).toBe(false);
            const errors = result.array();
            expect(errors.some(err => err.msg.includes('número entero mayor a 0'))).toBe(true);
        });

        it('should fail with limit too high', async () => {
            req.query = {
                limit: '101'
            };

            const result = await runValidations(validatePagination, req);
            expect(result.isEmpty()).toBe(false);
            const errors = result.array();
            expect(errors.some(err => err.msg.includes('entre 1 y 100'))).toBe(true);
        });
    });

    describe('validateForgotPassword', () => {
        it('should pass with valid email', async () => {
            req.body = {
                email: 'test@example.com'
            };

            const result = await runValidations(validateForgotPassword, req);
            expect(result.isEmpty()).toBe(true);
        });

        it('should fail with invalid email', async () => {
            req.body = {
                email: 'invalid-email'
            };

            const result = await runValidations(validateForgotPassword, req);
            expect(result.isEmpty()).toBe(false);
            const errors = result.array();
            expect(errors.some(err => err.msg.includes('Formato de email inválido'))).toBe(true);
        });
    });

    describe('validateResetPassword', () => {
        it('should pass with valid reset data', async () => {
            req.body = {
                token: 'validtokenstring12345',
                newPassword: 'NewPass123@',
                confirmPassword: 'NewPass123@'
            };

            const result = await runValidations(validateResetPassword, req);
            expect(result.isEmpty()).toBe(true);
        });

        it('should fail with empty token', async () => {
            req.body = {
                token: '',
                newPassword: 'NewPass123@',
                confirmPassword: 'NewPass123@'
            };

            const result = await runValidations(validateResetPassword, req);
            expect(result.isEmpty()).toBe(false);
            const errors = result.array();
            expect(errors.some(err => err.msg.includes('Token requerido'))).toBe(true);
        });

        it('should fail with token too short', async () => {
            req.body = {
                token: 'short',
                newPassword: 'NewPass123@',
                confirmPassword: 'NewPass123@'
            };

            const result = await runValidations(validateResetPassword, req);
            expect(result.isEmpty()).toBe(false);
            const errors = result.array();
            expect(errors.some(err => err.msg.includes('Token inválido'))).toBe(true);
        });

        it('should fail with weak new password', async () => {
            req.body = {
                token: 'validtokenstring12345',
                newPassword: 'weak',
                confirmPassword: 'weak'
            };

            const result = await runValidations(validateResetPassword, req);
            expect(result.isEmpty()).toBe(false);
            const errors = result.array();
            expect(errors.some(err => err.msg.includes('entre 8 y 128 caracteres'))).toBe(true);
        });

        it('should fail with mismatched passwords', async () => {
            req.body = {
                token: 'validtokenstring12345',
                newPassword: 'NewPass123@',
                confirmPassword: 'DifferentPass123@'
            };

            const result = await runValidations(validateResetPassword, req);
            expect(result.isEmpty()).toBe(false);
            const errors = result.array();
            expect(errors.some(err => err.msg.includes('Las contraseñas no coinciden'))).toBe(true);
        });
    });

    describe('sanitizeAuthInput middleware', () => {
        it('should sanitize username to lowercase and trim', () => {
            req.body = {
                username: '  TestUser123  '
            };

            sanitizeAuthInput(req, res, next);

            expect(req.body.username).toBe('testuser123');
            expect(next).toHaveBeenCalled();
        });

        it('should sanitize email to lowercase and trim', () => {
            req.body = {
                email: '  TEST@EXAMPLE.COM  '
            };

            sanitizeAuthInput(req, res, next);

            expect(req.body.email).toBe('test@example.com');
            expect(next).toHaveBeenCalled();
        });

        it('should trim firstName and lastName', () => {
            req.body = {
                firstName: '  Juan  ',
                lastName: '  Pérez  '
            };

            sanitizeAuthInput(req, res, next);

            expect(req.body.firstName).toBe('Juan');
            expect(req.body.lastName).toBe('Pérez');
            expect(next).toHaveBeenCalled();
        });

        it('should handle missing fields gracefully', () => {
            req.body = {};

            sanitizeAuthInput(req, res, next);

            expect(req.body).toEqual({});
            expect(next).toHaveBeenCalled();
        });

        it('should handle all fields together', () => {
            req.body = {
                username: '  TestUser  ',
                email: '  TEST@EXAMPLE.COM  ',
                firstName: '  Juan Carlos  ',
                lastName: '  González Pérez  '
            };

            sanitizeAuthInput(req, res, next);

            expect(req.body.username).toBe('testuser');
            expect(req.body.email).toBe('test@example.com');
            expect(req.body.firstName).toBe('Juan Carlos');
            expect(req.body.lastName).toBe('González Pérez');
            expect(next).toHaveBeenCalled();
        });
    });
});
