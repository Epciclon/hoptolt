const authMiddleware = require('../../../src/middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../../../src/models/user');
const { createTestUser } = require('../../helpers/testHelpers');

// Mock dependencies
jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
    let mockReq, mockRes, mockNext;
    let testUser;
    let consoleSpy;

    beforeEach(async () => {
        await User.deleteMany({});
        
        testUser = await createTestUser();
        
        mockReq = {
            headers: {},
            user: null
        };
        
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        
        mockNext = jest.fn();

        // Mock console.error to suppress output during tests
        consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // Reset all mocks
        jest.clearAllMocks();
        
        // Mock environment variables
        process.env.JWT_SECRET = 'test-secret';
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    describe('authenticateToken', () => {
        test('should authenticate user with valid token', async () => {
            // Arrange
            mockReq.headers['authorization'] = 'Bearer valid-token';
            jwt.verify.mockReturnValue({ userId: testUser._id });

            // Act
            await authMiddleware.authenticateToken(mockReq, mockRes, mockNext);

            // Assert
            expect(mockReq.user).toBeDefined();
            expect(mockReq.user._id.toString()).toBe(testUser._id.toString());
            expect(mockNext).toHaveBeenCalled();
        });

        test('should return 401 when no token provided', async () => {
            // Arrange
            mockReq.headers = {};

            // Act
            await authMiddleware.authenticateToken(mockReq, mockRes, mockNext);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Token de acceso requerido'
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        test('should return 401 when authorization header is malformed', async () => {
            // Arrange
            mockReq.headers['authorization'] = 'InvalidHeader';

            // Act
            await authMiddleware.authenticateToken(mockReq, mockRes, mockNext);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Token de acceso requerido'
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        test('should return 401 when token is invalid', async () => {
            // Arrange
            mockReq.headers['authorization'] = 'Bearer invalid-token';
            jwt.verify.mockImplementation(() => {
                const error = new Error('Invalid token');
                error.name = 'JsonWebTokenError';
                throw error;
            });

            // Act
            await authMiddleware.authenticateToken(mockReq, mockRes, mockNext);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Token inválido'
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        test('should return 401 when token is expired', async () => {
            // Arrange
            mockReq.headers['authorization'] = 'Bearer expired-token';
            jwt.verify.mockImplementation(() => {
                const error = new Error('Token expired');
                error.name = 'TokenExpiredError';
                throw error;
            });

            // Act
            await authMiddleware.authenticateToken(mockReq, mockRes, mockNext);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Token expirado'
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        test('should return 401 when user not found', async () => {
            // Arrange
            mockReq.headers['authorization'] = 'Bearer valid-token';
            jwt.verify.mockReturnValue({ userId: '507f1f77bcf86cd799439011' }); // Non-existent ID

            // Act
            await authMiddleware.authenticateToken(mockReq, mockRes, mockNext);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Usuario no encontrado'
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        test('should return 401 when user is inactive', async () => {
            // Arrange
            await User.findByIdAndUpdate(testUser._id, { isActive: false });
            mockReq.headers['authorization'] = 'Bearer valid-token';
            jwt.verify.mockReturnValue({ userId: testUser._id });

            // Act
            await authMiddleware.authenticateToken(mockReq, mockRes, mockNext);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Cuenta desactivada'
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        test('should return 401 when user account is locked', async () => {
            // Arrange
            await User.findByIdAndUpdate(testUser._id, {
                loginAttempts: 5,
                lockUntil: new Date(Date.now() + 60000) // 1 minute from now
            });
            mockReq.headers['authorization'] = 'Bearer valid-token';
            jwt.verify.mockReturnValue({ userId: testUser._id });

            // Act
            await authMiddleware.authenticateToken(mockReq, mockRes, mockNext);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Cuenta temporalmente bloqueada'
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        test('should handle unexpected errors', async () => {
            // Arrange
            mockReq.headers['authorization'] = 'Bearer valid-token';
            jwt.verify.mockImplementation(() => {
                throw new Error('Unexpected error');
            });

            // Act
            await authMiddleware.authenticateToken(mockReq, mockRes, mockNext);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor'
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('authorizeRoles', () => {
        beforeEach(() => {
            mockReq.user = { ...testUser.toObject(), role: 'employee' };
        });

        test('should allow access for user with required role', () => {
            // Arrange
            const middleware = authMiddleware.authorizeRoles('employee');
            mockReq.user.role = 'employee';

            // Act
            middleware(mockReq, mockRes, mockNext);

            // Assert
            expect(mockNext).toHaveBeenCalled();
        });

        test('should allow access for admin role', () => {
            // Arrange
            const middleware = authMiddleware.authorizeRoles('admin');
            mockReq.user.role = 'admin';

            // Act
            middleware(mockReq, mockRes, mockNext);

            // Assert
            expect(mockNext).toHaveBeenCalled();
        });

        test('should deny access for user without required role', () => {
            // Arrange
            const middleware = authMiddleware.authorizeRoles('admin');
            mockReq.user.role = 'employee';

            // Act
            middleware(mockReq, mockRes, mockNext);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Permisos insuficientes para esta operación'
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        test('should allow access for multiple required roles', () => {
            // Arrange
            const middleware = authMiddleware.authorizeRoles('admin', 'employee');
            mockReq.user.role = 'employee';

            // Act
            middleware(mockReq, mockRes, mockNext);

            // Assert
            expect(mockNext).toHaveBeenCalled();
        });

        test('should deny access when user role not in required roles', () => {
            // Arrange
            const middleware = authMiddleware.authorizeRoles('admin', 'supervisor');
            mockReq.user.role = 'employee';

            // Act
            middleware(mockReq, mockRes, mockNext);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Permisos insuficientes para esta operación'
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        test('should return 401 when user not authenticated', () => {
            // Arrange
            mockReq.user = null;
            const middleware = authMiddleware.authorizeRoles('admin');

            // Act
            middleware(mockReq, mockRes, mockNext);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Acceso no autorizado'
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('optionalAuth', () => {
        test('should continue without user when no token provided', async () => {
            // Arrange
            mockReq.headers = {};

            // Act
            await authMiddleware.optionalAuth(mockReq, mockRes, mockNext);

            // Assert
            expect(mockReq.user).toBeNull();
            expect(mockNext).toHaveBeenCalled();
        });

        test('should authenticate user when valid token provided', async () => {
            // Arrange
            mockReq.headers['authorization'] = 'Bearer valid-token';
            jwt.verify.mockReturnValue({ userId: testUser._id });

            // Act
            await authMiddleware.optionalAuth(mockReq, mockRes, mockNext);

            // Assert
            expect(mockReq.user).toBeDefined();
            expect(mockReq.user._id.toString()).toBe(testUser._id.toString());
            expect(mockNext).toHaveBeenCalled();
        });

        test('should continue without user when token is invalid', async () => {
            // Arrange
            mockReq.headers['authorization'] = 'Bearer invalid-token';
            jwt.verify.mockImplementation(() => {
                const error = new Error('Invalid token');
                error.name = 'JsonWebTokenError';
                throw error;
            });

            // Act
            await authMiddleware.optionalAuth(mockReq, mockRes, mockNext);

            // Assert
            expect(mockReq.user).toBeNull();
            expect(mockNext).toHaveBeenCalled();
        });

        test('should continue without user when user not found', async () => {
            // Arrange
            mockReq.headers['authorization'] = 'Bearer valid-token';
            jwt.verify.mockReturnValue({ userId: '507f1f77bcf86cd799439011' });

            // Act
            await authMiddleware.optionalAuth(mockReq, mockRes, mockNext);

            // Assert
            expect(mockReq.user).toBeNull();
            expect(mockNext).toHaveBeenCalled();
        });

        test('should continue without user when user is inactive', async () => {
            // Arrange
            await User.findByIdAndUpdate(testUser._id, { isActive: false });
            mockReq.headers['authorization'] = 'Bearer valid-token';
            jwt.verify.mockReturnValue({ userId: testUser._id });

            // Act
            await authMiddleware.optionalAuth(mockReq, mockRes, mockNext);

            // Assert
            expect(mockReq.user).toBeNull();
            expect(mockNext).toHaveBeenCalled();
        });

        test('should continue without user when user is locked', async () => {
            // Arrange
            await User.findByIdAndUpdate(testUser._id, {
                loginAttempts: 5,
                lockUntil: new Date(Date.now() + 60000)
            });
            mockReq.headers['authorization'] = 'Bearer valid-token';
            jwt.verify.mockReturnValue({ userId: testUser._id });

            // Act
            await authMiddleware.optionalAuth(mockReq, mockRes, mockNext);

            // Assert
            expect(mockReq.user).toBeNull();
            expect(mockNext).toHaveBeenCalled();
        });
    });
});
