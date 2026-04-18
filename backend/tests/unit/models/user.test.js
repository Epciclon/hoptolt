/**
 * Unit tests for User model
 * Testing all validations, methods, and business logic
 * Following the Arrange, Act, Assert pattern
 */

const User = require('../../../src/models/user');
const bcrypt = require('bcryptjs');
const { createTestUser } = require('../../helpers/testHelpers');

describe('User Model', () => {
    
    describe('User Creation and Validation', () => {
        
        test('should create a valid user with all required fields', async () => {
            // Arrange
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'TestPass123!',
                firstName: 'Test',
                lastName: 'User'
            };

            // Act
            const user = new User(userData);
            const savedUser = await user.save();

            // Assert
            expect(savedUser._id).toBeDefined();
            expect(savedUser.username).toBe('testuser');
            expect(savedUser.email).toBe('test@example.com');
            expect(savedUser.firstName).toBe('Test');
            expect(savedUser.lastName).toBe('User');
            expect(savedUser.role).toBe('employee'); // Default role
            expect(savedUser.isActive).toBe(true); // Default active
            expect(savedUser.password).not.toBe('TestPass123!'); // Should be hashed
            expect(savedUser.createdAt).toBeDefined();
        });

        test('should fail validation when username is missing', async () => {
            // Arrange
            const userData = {
                email: 'test@example.com',
                password: 'TestPass123!',
                firstName: 'Test',
                lastName: 'User'
            };

            // Act & Assert
            const user = new User(userData);
            await expect(user.save()).rejects.toThrow('El nombre de usuario es obligatorio');
        });

        test('should fail validation when email is missing', async () => {
            // Arrange
            const userData = {
                username: 'testuser',
                password: 'TestPass123!',
                firstName: 'Test',
                lastName: 'User'
            };

            // Act & Assert
            const user = new User(userData);
            await expect(user.save()).rejects.toThrow('El email es obligatorio');
        });

        test('should fail validation when password is missing', async () => {
            // Arrange
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User'
            };

            // Act & Assert
            const user = new User(userData);
            await expect(user.save()).rejects.toThrow('La contraseña es obligatoria');
        });

        test('should fail validation with invalid email format', async () => {
            // Arrange
            const userData = {
                username: 'testuser',
                email: 'invalid-email',
                password: 'TestPass123!',
                firstName: 'Test',
                lastName: 'User'
            };

            // Act & Assert
            const user = new User(userData);
            await expect(user.save()).rejects.toThrow('Formato de email inválido');
        });

        test('should fail validation with weak password', async () => {
            // Arrange
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'weak',
                firstName: 'Test',
                lastName: 'User'
            };

            // Act & Assert
            const user = new User(userData);
            await expect(user.save()).rejects.toThrow();
        });

        test('should fail validation with short username', async () => {
            // Arrange
            const userData = {
                username: 'ab', // Too short
                email: 'test@example.com',
                password: 'TestPass123!',
                firstName: 'Test',
                lastName: 'User'
            };

            // Act & Assert
            const user = new User(userData);
            await expect(user.save()).rejects.toThrow();
        });

        test('should fail validation with invalid username characters', async () => {
            // Arrange
            const userData = {
                username: 'test user!', // Invalid characters
                email: 'test@example.com',
                password: 'TestPass123!',
                firstName: 'Test',
                lastName: 'User'
            };

            // Act & Assert
            const user = new User(userData);
            await expect(user.save()).rejects.toThrow();
        });

        test('should enforce unique username', async () => {
            // Arrange
            const userData1 = {
                username: 'testuser',
                email: 'test1@example.com',
                password: 'TestPass123!',
                firstName: 'Test',
                lastName: 'User'
            };
            
            const userData2 = {
                username: 'testuser', // Same username
                email: 'test2@example.com',
                password: 'TestPass123!',
                firstName: 'Test',
                lastName: 'User'
            };

            // Act
            const user1 = new User(userData1);
            await user1.save();

            const user2 = new User(userData2);

            // Assert
            await expect(user2.save()).rejects.toThrow();
        });

        test('should enforce unique email', async () => {
            // Arrange
            const userData1 = {
                username: 'testuser1',
                email: 'test@example.com',
                password: 'TestPass123!',
                firstName: 'Test',
                lastName: 'User'
            };
            
            const userData2 = {
                username: 'testuser2',
                email: 'test@example.com', // Same email
                password: 'TestPass123!',
                firstName: 'Test',
                lastName: 'User'
            };

            // Act
            const user1 = new User(userData1);
            await user1.save();

            const user2 = new User(userData2);

            // Assert
            await expect(user2.save()).rejects.toThrow();
        });

        test('should set default values correctly', async () => {
            // Arrange
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'TestPass123!',
                firstName: 'Test',
                lastName: 'User'
            };

            // Act
            const user = new User(userData);
            const savedUser = await user.save();

            // Assert
            expect(savedUser.role).toBe('employee');
            expect(savedUser.isActive).toBe(true);
            expect(savedUser.loginAttempts).toBe(0);
            expect(savedUser.createdAt).toBeDefined();
            expect(savedUser.updatedAt).toBeDefined();
        });

    });

    describe('Password Hashing', () => {
        
        test('should hash password before saving', async () => {
            // Arrange
            const plainPassword = 'TestPass123!';
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: plainPassword,
                firstName: 'Test',
                lastName: 'User'
            };

            // Act
            const user = new User(userData);
            await user.save();

            // Assert
            expect(user.password).not.toBe(plainPassword);
            expect(user.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash format
        });

        test('should not rehash password if not modified', async () => {
            // Arrange
            const user = await createTestUser();
            const originalPasswordHash = user.password;

            // Act
            user.firstName = 'Updated Name';
            await user.save();

            // Assert
            expect(user.password).toBe(originalPasswordHash);
        });

        test('should rehash password if modified', async () => {
            // Arrange
            const user = await createTestUser();
            const originalPasswordHash = user.password;

            // Act
            user.password = 'NewPass123!';
            await user.save();

            // Assert
            expect(user.password).not.toBe(originalPasswordHash);
            expect(user.password).toMatch(/^\$2[aby]\$\d+\$/);
        });

        test('should handle bcrypt error during password hashing', async () => {
            // Arrange
            const bcrypt = require('bcryptjs');
            const originalHash = bcrypt.hash;
            
            // Mock bcrypt.hash to throw an error
            bcrypt.hash = jest.fn().mockRejectedValue(new Error('Bcrypt hashing failed'));
            
            const user = new User({
                username: 'testuser',
                email: 'test@example.com',
                password: 'TestPass123!',
                firstName: 'Test',
                lastName: 'User'
            });

            // Act & Assert
            await expect(user.save()).rejects.toThrow('Bcrypt hashing failed');
            
            // Cleanup
            bcrypt.hash = originalHash;
        });

    });

    describe('Password Comparison', () => {
        
        test('should compare password correctly for valid password', async () => {
            // Arrange
            const plainPassword = 'TestPass123!';
            const user = await createTestUser({ password: plainPassword });

            // Act
            const isValid = await user.comparePassword(plainPassword);

            // Assert
            expect(isValid).toBe(true);
        });

        test('should return false for invalid password', async () => {
            // Arrange
            const user = await createTestUser({ password: 'TestPass123!' });

            // Act
            const isValid = await user.comparePassword('wrongpassword');

            // Assert
            expect(isValid).toBe(false);
        });

        test('should throw error if account is locked', async () => {
            // Arrange
            const user = await createTestUser();
            user.lockUntil = Date.now() + 1000 * 60 * 60; // 1 hour from now
            await user.save();

            // Act & Assert
            await expect(user.comparePassword('TestPass123!')).rejects.toThrow('Cuenta temporalmente bloqueada');
        });

    });

    describe('Account Locking', () => {
        
        test('should increment login attempts', async () => {
            // Arrange
            const user = await createTestUser();
            expect(user.loginAttempts).toBe(0);

            // Act
            await user.incLoginAttempts();

            // Assert
            const updatedUser = await User.findById(user._id);
            expect(updatedUser.loginAttempts).toBe(1);
        });

        test('should lock account after max attempts', async () => {
            // Arrange
            const user = await createTestUser();
            user.loginAttempts = User.MAX_LOGIN_ATTEMPTS - 1;
            await user.save();

            // Act
            await user.incLoginAttempts();

            // Assert
            const updatedUser = await User.findById(user._id);
            expect(updatedUser.lockUntil).toBeDefined();
            expect(updatedUser.lockUntil.getTime()).toBeGreaterThan(Date.now());
        });

        test('should reset expired lock', async () => {
            // Arrange
            const user = await createTestUser();
            user.lockUntil = Date.now() - 1000; // 1 second ago (expired)
            user.loginAttempts = 3;
            await user.save();

            // Act
            await user.incLoginAttempts();

            // Assert
            const updatedUser = await User.findById(user._id);
            expect(updatedUser.loginAttempts).toBe(1);
            expect(updatedUser.lockUntil).toBeUndefined();
        });

        test('should reset login attempts after successful login', async () => {
            // Arrange
            const user = await createTestUser();
            user.loginAttempts = 3;
            await user.save();

            // Act
            await user.resetLoginAttempts();

            // Assert
            const updatedUser = await User.findById(user._id);
            expect(updatedUser.loginAttempts).toBe(0); // Changed from toBeUndefined() to toBe(0)
            expect(updatedUser.lockUntil).toBeUndefined();
            expect(updatedUser.lastLogin).toBeDefined();
        });

    });

    describe('Virtual Properties', () => {
        
        test('should correctly identify locked account', async () => {
            // Arrange
            const user = await createTestUser();

            // Act & Assert - Not locked initially
            expect(user.isLocked).toBe(false);

            // Set lock in future
            user.lockUntil = Date.now() + 1000 * 60 * 60; // 1 hour from now
            expect(user.isLocked).toBe(true);

            // Set expired lock
            user.lockUntil = Date.now() - 1000; // 1 second ago
            expect(user.isLocked).toBe(false);
        });

    });

    describe('Instance Methods', () => {
        
        test('should return public JSON without sensitive data', async () => {
            // Arrange
            const user = await createTestUser();

            // Act
            const publicData = user.toPublicJSON();

            // Assert
            expect(publicData).toHaveProperty('id');
            expect(publicData).toHaveProperty('username');
            expect(publicData).toHaveProperty('email');
            expect(publicData).toHaveProperty('firstName');
            expect(publicData).toHaveProperty('lastName');
            expect(publicData).toHaveProperty('role');
            expect(publicData).toHaveProperty('isActive');
            expect(publicData).toHaveProperty('createdAt');
            
            // Should not have sensitive data
            expect(publicData).not.toHaveProperty('password');
            expect(publicData).not.toHaveProperty('loginAttempts');
            expect(publicData).not.toHaveProperty('lockUntil');
        });

    });

    describe('Static Methods', () => {
        
        test('should clean expired tokens', async () => {
            // Arrange
            const user1 = await createTestUser({
                passwordResetToken: 'token1',
                passwordResetExpires: Date.now() - 1000 * 60 * 60 // 1 hour ago (expired)
            });
            
            const user2 = await createTestUser({
                username: 'testuser2',
                email: 'test2@example.com',
                passwordResetToken: 'token2',
                passwordResetExpires: Date.now() + 1000 * 60 * 60 // 1 hour from now (valid)
            });

            // Act
            await User.cleanExpiredTokens();

            // Assert
            const updatedUser1 = await User.findById(user1._id);
            const updatedUser2 = await User.findById(user2._id);
            
            expect(updatedUser1.passwordResetToken).toBeUndefined();
            expect(updatedUser1.passwordResetExpires).toBeUndefined();
            expect(updatedUser2.passwordResetToken).toBe('token2');
            expect(updatedUser2.passwordResetExpires).toBeDefined();
        });

    });

    describe('Role Validation', () => {
        
        test('should accept valid roles', async () => {
            // Arrange & Act & Assert
            const adminUser = await createTestUser({ 
                username: 'admin', 
                email: 'admin@example.com',
                role: 'admin' 
            });
            expect(adminUser.role).toBe('admin');

            const managerUser = await createTestUser({ 
                username: 'manager', 
                email: 'manager@example.com',
                role: 'manager' 
            });
            expect(managerUser.role).toBe('manager');

            const employeeUser = await createTestUser({ 
                username: 'employee', 
                email: 'employee@example.com',
                role: 'employee' 
            });
            expect(employeeUser.role).toBe('employee');
        });

        test('should reject invalid role', async () => {
            // Arrange
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'TestPass123!',
                firstName: 'Test',
                lastName: 'User',
                role: 'invalidrole'
            };

            // Act & Assert
            const user = new User(userData);
            await expect(user.save()).rejects.toThrow();
        });

    });

});
