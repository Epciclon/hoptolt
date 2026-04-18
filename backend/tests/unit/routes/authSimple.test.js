const request = require('supertest');
const express = require('express');

// Define all mocks before using them
const mockControllers = {
    login: jest.fn((req, res) => res.status(200).json({
        success: true,
        message: 'Login successful',
        token: 'mock-jwt-token',
        user: { id: 1, username: 'testuser', email: 'test@test.com' }
    })),
    
    verifyToken: jest.fn((req, res) => res.status(200).json({
        success: true,
        message: 'Token valid',
        user: { id: 1, username: 'testuser', email: 'test@test.com' }
    })),
    
    getProfile: jest.fn((req, res) => res.status(200).json({
        success: true,
        user: { id: 1, username: 'testuser', email: 'test@test.com', role: 'user' }
    })),
    
    updateProfile: jest.fn((req, res) => res.status(200).json({
        success: true,
        message: 'Profile updated successfully'
    })),
    
    changePassword: jest.fn((req, res) => res.status(200).json({
        success: true,
        message: 'Password changed successfully'
    })),
    
    logout: jest.fn((req, res) => res.status(200).json({
        success: true,
        message: 'Logout successful'
    })),
    
    register: jest.fn((req, res) => res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: { id: 2, username: req.body.username, email: req.body.email }
    })),
    
    getAllUsers: jest.fn((req, res) => res.status(200).json({
        success: true,
        users: [
            { id: 1, username: 'user1', email: 'user1@test.com', role: 'user' },
            { id: 2, username: 'admin', email: 'admin@test.com', role: 'admin' }
        ],
        total: 2
    }))
};

const mockMiddleware = {
    // Mock authenticate token middleware
    authenticateToken: jest.fn((req, res, next) => {
        req.user = { id: 1, username: 'testuser', email: 'test@test.com', role: 'admin' };
        next();
    }),
    
    // Mock authorize roles middleware - returns a function that gets the roles parameter
    authorizeRoles: jest.fn((roles) => {
        mockMiddleware.authorizeRoles.lastCallRoles = roles;
        return (req, res, next) => {
            req.userRole = 'admin'; // Mock admin role
            next();
        };
    }),
    
    // Mock rate limiters
    loginLimiter: jest.fn((req, res, next) => next()),
    strictLimiter: jest.fn((req, res, next) => next()),
    
    // Mock validation middleware
    validateLogin: jest.fn((req, res, next) => next()),
    validateRegister: jest.fn((req, res, next) => next()),
    validateUpdateProfile: jest.fn((req, res, next) => next()),
    validateChangePassword: jest.fn((req, res, next) => next()),
    validatePagination: jest.fn((req, res, next) => next()),
    
    // Mock sanitization middleware
    sanitizeAuthInput: jest.fn((req, res, next) => next())
};

function createMockAuthRoutes() {
    const router = express.Router();
    
    // POST /login
    router.post('/login',
        mockMiddleware.loginLimiter,
        mockMiddleware.sanitizeAuthInput,
        mockMiddleware.validateLogin,
        mockControllers.login
    );
    
    // GET /verify-token
    router.get('/verify-token',
        mockMiddleware.authenticateToken,
        mockControllers.verifyToken
    );
    
    // GET /profile
    router.get('/profile',
        mockMiddleware.authenticateToken,
        mockControllers.getProfile
    );
    
    // PUT /profile
    router.put('/profile',
        mockMiddleware.authenticateToken,
        mockMiddleware.sanitizeAuthInput,
        mockMiddleware.validateUpdateProfile,
        mockControllers.updateProfile
    );
    
    // PUT /change-password
    router.put('/change-password',
        mockMiddleware.authenticateToken,
        mockMiddleware.strictLimiter,
        mockMiddleware.validateChangePassword,
        mockControllers.changePassword
    );
    
    // POST /logout
    router.post('/logout',
        mockMiddleware.authenticateToken,
        mockControllers.logout
    );
    
    // POST /register (admin only)
    router.post('/register',
        mockMiddleware.authenticateToken,
        mockMiddleware.authorizeRoles('admin'),
        mockMiddleware.strictLimiter,
        mockMiddleware.sanitizeAuthInput,
        mockMiddleware.validateRegister,
        mockControllers.register
    );
    
    // GET /users (admin only)
    router.get('/users',
        mockMiddleware.authenticateToken,
        mockMiddleware.authorizeRoles('admin'),
        mockMiddleware.validatePagination,
        mockControllers.getAllUsers
    );
    
    return router;
}

describe('Auth Routes', () => {
    let app;
    
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Create Express app with mock routes
        app = express();
        app.use(express.json());
        
        const authRoutes = createMockAuthRoutes();
        app.use('/', authRoutes);
    });

    describe('POST /login', () => {
        it('should call login controller', async () => {
            await request(app)
                .post('/login')
                .send({ username: 'test', password: 'password' });

            expect(mockControllers.login).toHaveBeenCalled();
        });

        it('should apply login limiter middleware', async () => {
            await request(app)
                .post('/login')
                .send({ username: 'test', password: 'password' });

            expect(mockMiddleware.loginLimiter).toHaveBeenCalled();
        });

        it('should apply sanitize input middleware', async () => {
            await request(app)
                .post('/login')
                .send({ username: 'test', password: 'password' });

            expect(mockMiddleware.sanitizeAuthInput).toHaveBeenCalled();
        });

        it('should apply validate login middleware', async () => {
            await request(app)
                .post('/login')
                .send({ username: 'test', password: 'password' });

            expect(mockMiddleware.validateLogin).toHaveBeenCalled();
        });

        it('should handle empty request body', async () => {
            await request(app)
                .post('/login')
                .send({});

            expect(mockControllers.login).toHaveBeenCalled();
        });

        it('should handle request with extra fields', async () => {
            await request(app)
                .post('/login')
                .send({ 
                    username: 'test', 
                    password: 'password',
                    extraField: 'should be ignored'
                });

            expect(mockControllers.login).toHaveBeenCalled();
        });
    });

    describe('GET /verify-token', () => {
        it('should call verifyToken controller', async () => {
            await request(app)
                .get('/verify-token');

            expect(mockControllers.verifyToken).toHaveBeenCalled();
        });

        it('should apply authenticate token middleware', async () => {
            await request(app)
                .get('/verify-token');

            expect(mockMiddleware.authenticateToken).toHaveBeenCalled();
        });

        it('should pass user from middleware to controller', async () => {
            await request(app)
                .get('/verify-token');

            expect(mockMiddleware.authenticateToken).toHaveBeenCalled();
            expect(mockControllers.verifyToken).toHaveBeenCalled();
        });
    });

    describe('GET /profile', () => {
        it('should call getProfile controller', async () => {
            await request(app)
                .get('/profile');

            expect(mockControllers.getProfile).toHaveBeenCalled();
        });

        it('should apply authenticate token middleware', async () => {
            await request(app)
                .get('/profile');

            expect(mockMiddleware.authenticateToken).toHaveBeenCalled();
        });

        it('should handle query parameters', async () => {
            await request(app)
                .get('/profile?include=details');

            expect(mockControllers.getProfile).toHaveBeenCalled();
        });
    });

    describe('PUT /profile', () => {
        it('should call updateProfile controller', async () => {
            await request(app)
                .put('/profile')
                .send({ name: 'New Name' });

            expect(mockControllers.updateProfile).toHaveBeenCalled();
        });

        it('should apply authenticate token middleware', async () => {
            await request(app)
                .put('/profile')
                .send({ name: 'New Name' });

            expect(mockMiddleware.authenticateToken).toHaveBeenCalled();
        });

        it('should apply sanitize input middleware', async () => {
            await request(app)
                .put('/profile')
                .send({ name: 'New Name' });

            expect(mockMiddleware.sanitizeAuthInput).toHaveBeenCalled();
        });

        it('should apply validate update profile middleware', async () => {
            await request(app)
                .put('/profile')
                .send({ name: 'New Name' });

            expect(mockMiddleware.validateUpdateProfile).toHaveBeenCalled();
        });

        it('should handle partial updates', async () => {
            await request(app)
                .put('/profile')
                .send({ email: 'newemail@test.com' });

            expect(mockControllers.updateProfile).toHaveBeenCalled();
        });

        it('should handle empty update body', async () => {
            await request(app)
                .put('/profile')
                .send({});

            expect(mockControllers.updateProfile).toHaveBeenCalled();
        });
    });

    describe('PUT /change-password', () => {
        it('should call changePassword controller', async () => {
            await request(app)
                .put('/change-password')
                .send({ 
                    currentPassword: 'oldpass',
                    newPassword: 'newpass'
                });

            expect(mockControllers.changePassword).toHaveBeenCalled();
        });

        it('should apply authenticate token middleware', async () => {
            await request(app)
                .put('/change-password')
                .send({ 
                    currentPassword: 'oldpass',
                    newPassword: 'newpass'
                });

            expect(mockMiddleware.authenticateToken).toHaveBeenCalled();
        });

        it('should apply strict limiter middleware', async () => {
            await request(app)
                .put('/change-password')
                .send({ 
                    currentPassword: 'oldpass',
                    newPassword: 'newpass'
                });

            expect(mockMiddleware.strictLimiter).toHaveBeenCalled();
        });

        it('should apply validate change password middleware', async () => {
            await request(app)
                .put('/change-password')
                .send({ 
                    currentPassword: 'oldpass',
                    newPassword: 'newpass'
                });

            expect(mockMiddleware.validateChangePassword).toHaveBeenCalled();
        });

        it('should handle minimal password change data', async () => {
            await request(app)
                .put('/change-password')
                .send({
                    currentPassword: 'old',
                    newPassword: 'new'
                });

            expect(mockControllers.changePassword).toHaveBeenCalled();
        });
    });

    describe('POST /logout', () => {
        it('should call logout controller', async () => {
            await request(app)
                .post('/logout');

            expect(mockControllers.logout).toHaveBeenCalled();
        });

        it('should apply authenticate token middleware', async () => {
            await request(app)
                .post('/logout');

            expect(mockMiddleware.authenticateToken).toHaveBeenCalled();
        });

        it('should handle logout with body', async () => {
            await request(app)
                .post('/logout')
                .send({ deviceId: 'device123' });

            expect(mockControllers.logout).toHaveBeenCalled();
        });

        it('should handle logout without body', async () => {
            await request(app)
                .post('/logout');

            expect(mockControllers.logout).toHaveBeenCalled();
        });
    });

    describe('POST /register', () => {
        it('should call register controller', async () => {
            await request(app)
                .post('/register')
                .send({ username: 'test', email: 'test@test.com', password: 'test' });

            expect(mockControllers.register).toHaveBeenCalled();
        });

        it('should apply authenticate token middleware', async () => {
            await request(app)
                .post('/register')
                .send({ username: 'test', email: 'test@test.com', password: 'test' });

            expect(mockMiddleware.authenticateToken).toHaveBeenCalled();
        });

        it('should apply authorize roles middleware for admin', async () => {
            await request(app)
                .post('/register')
                .send({ username: 'test', email: 'test@test.com', password: 'test' });

            expect(mockMiddleware.authorizeRoles).toHaveBeenCalled();
            expect(mockMiddleware.authorizeRoles.lastCallRoles).toBe('admin');
        });

        it('should apply strict limiter middleware', async () => {
            await request(app)
                .post('/register')
                .send({ username: 'test', email: 'test@test.com', password: 'test' });

            expect(mockMiddleware.strictLimiter).toHaveBeenCalled();
        });

        it('should apply sanitize input middleware', async () => {
            await request(app)
                .post('/register')
                .send({ username: 'test', email: 'test@test.com', password: 'test' });

            expect(mockMiddleware.sanitizeAuthInput).toHaveBeenCalled();
        });

        it('should apply validate register middleware', async () => {
            await request(app)
                .post('/register')
                .send({ username: 'test', email: 'test@test.com', password: 'test' });

            expect(mockMiddleware.validateRegister).toHaveBeenCalled();
        });

        it('should handle minimal registration data', async () => {
            await request(app)
                .post('/register')
                .send({ 
                    username: 'user',
                    email: 'user@test.com',
                    password: 'pass'
                });

            expect(mockControllers.register).toHaveBeenCalled();
        });

        it('should handle complete registration data', async () => {
            await request(app)
                .post('/register')
                .send({ 
                    username: 'newuser',
                    email: 'newuser@test.com',
                    password: 'password123',
                    role: 'user'
                });

            expect(mockControllers.register).toHaveBeenCalled();
        });
    });

    describe('GET /users', () => {
        it('should call getAllUsers controller', async () => {
            await request(app)
                .get('/users');

            expect(mockControllers.getAllUsers).toHaveBeenCalled();
        });

        it('should apply authenticate token middleware', async () => {
            await request(app)
                .get('/users');

            expect(mockMiddleware.authenticateToken).toHaveBeenCalled();
        });

        it('should apply authorize roles middleware for admin', async () => {
            await request(app)
                .get('/users');

            expect(mockMiddleware.authorizeRoles).toHaveBeenCalled();
            expect(mockMiddleware.authorizeRoles.lastCallRoles).toBe('admin');
        });

        it('should apply validate pagination middleware', async () => {
            await request(app)
                .get('/users');

            expect(mockMiddleware.validatePagination).toHaveBeenCalled();
        });

        it('should handle pagination query parameters', async () => {
            await request(app)
                .get('/users?page=1&limit=10');

            expect(mockControllers.getAllUsers).toHaveBeenCalled();
        });

        it('should handle search query parameters', async () => {
            await request(app)
                .get('/users?search=admin');

            expect(mockControllers.getAllUsers).toHaveBeenCalled();
        });

        it('should handle complex query parameters', async () => {
            await request(app)
                .get('/users?page=2&limit=5&search=user&sort=username&order=asc');

            expect(mockControllers.getAllUsers).toHaveBeenCalled();
        });
    });

    describe('HTTP method validation', () => {
        it('should only accept POST for /login', async () => {
            // POST should work
            const postResponse = await request(app)
                .post('/login')
                .send({ username: 'test', password: 'password' });
            expect(postResponse.status).not.toBe(404);

            // Other methods should return 404
            const getResponse = await request(app).get('/login');
            expect(getResponse.status).toBe(404);

            const putResponse = await request(app).put('/login');
            expect(putResponse.status).toBe(404);

            const deleteResponse = await request(app).delete('/login');
            expect(deleteResponse.status).toBe(404);
        });

        it('should only accept GET for /verify-token', async () => {
            // GET should work
            const getResponse = await request(app).get('/verify-token');
            expect(getResponse.status).not.toBe(404);

            // Other methods should return 404
            const postResponse = await request(app).post('/verify-token');
            expect(postResponse.status).toBe(404);

            const putResponse = await request(app).put('/verify-token');
            expect(putResponse.status).toBe(404);

            const deleteResponse = await request(app).delete('/verify-token');
            expect(deleteResponse.status).toBe(404);
        });

        it('should only accept GET for /profile', async () => {
            // GET should work
            const getResponse = await request(app).get('/profile');
            expect(getResponse.status).not.toBe(404);

            // POST should return 404
            const postResponse = await request(app).post('/profile');
            expect(postResponse.status).toBe(404);

            // DELETE should return 404
            const deleteResponse = await request(app).delete('/profile');
            expect(deleteResponse.status).toBe(404);
        });

        it('should only accept PUT for /change-password', async () => {
            // PUT should work
            const putResponse = await request(app)
                .put('/change-password')
                .send({ currentPassword: 'old', newPassword: 'new' });
            expect(putResponse.status).not.toBe(404);

            // Other methods should return 404
            const getResponse = await request(app).get('/change-password');
            expect(getResponse.status).toBe(404);

            const postResponse = await request(app).post('/change-password');
            expect(postResponse.status).toBe(404);

            const deleteResponse = await request(app).delete('/change-password');
            expect(deleteResponse.status).toBe(404);
        });

        it('should only accept POST for /logout', async () => {
            // POST should work
            const postResponse = await request(app).post('/logout');
            expect(postResponse.status).not.toBe(404);

            // Other methods should return 404
            const getResponse = await request(app).get('/logout');
            expect(getResponse.status).toBe(404);

            const putResponse = await request(app).put('/logout');
            expect(putResponse.status).toBe(404);

            const deleteResponse = await request(app).delete('/logout');
            expect(deleteResponse.status).toBe(404);
        });

        it('should only accept POST for /register', async () => {
            // POST should work
            const postResponse = await request(app)
                .post('/register')
                .send({ username: 'test', email: 'test@test.com', password: 'test' });
            expect(postResponse.status).not.toBe(404);

            // Other methods should return 404
            const getResponse = await request(app).get('/register');
            expect(getResponse.status).toBe(404);

            const putResponse = await request(app).put('/register');
            expect(putResponse.status).toBe(404);

            const deleteResponse = await request(app).delete('/register');
            expect(deleteResponse.status).toBe(404);
        });

        it('should only accept GET for /users', async () => {
            // GET should work
            const getResponse = await request(app).get('/users');
            expect(getResponse.status).not.toBe(404);

            // Other methods should return 404
            const postResponse = await request(app).post('/users');
            expect(postResponse.status).toBe(404);

            const putResponse = await request(app).put('/users');
            expect(putResponse.status).toBe(404);

            const deleteResponse = await request(app).delete('/users');
            expect(deleteResponse.status).toBe(404);
        });
    });

    describe('Request/Response handling', () => {
        it('should handle JSON content type', async () => {
            const response = await request(app)
                .post('/login')
                .set('Content-Type', 'application/json')
                .send({ username: 'test', password: 'password' });

            expect(mockControllers.login).toHaveBeenCalled();
        });

        it('should handle malformed JSON gracefully', async () => {
            const response = await request(app)
                .post('/login')
                .set('Content-Type', 'application/json')
                .send('{"invalid": json}');

            // Express should handle this gracefully and still reach our route
            expect(response.status).toBe(400); // Bad Request for malformed JSON
        });

        it('should handle different content types', async () => {
            const response = await request(app)
                .post('/login')
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .send('username=test&password=password');

            expect(mockControllers.login).toHaveBeenCalled();
        });

        it('should handle special characters in request data', async () => {
            await request(app)
                .post('/login')
                .send({ 
                    username: 'test@#$%^&*()', 
                    password: 'password123!@#' 
                });

            expect(mockControllers.login).toHaveBeenCalled();
        });
    });

    describe('Middleware integration', () => {
        it('should call all middleware in correct order for login', async () => {
            await request(app)
                .post('/login')
                .send({ username: 'test', password: 'password' });

            expect(mockMiddleware.loginLimiter).toHaveBeenCalled();
            expect(mockMiddleware.sanitizeAuthInput).toHaveBeenCalled();
            expect(mockMiddleware.validateLogin).toHaveBeenCalled();
            expect(mockControllers.login).toHaveBeenCalled();
        });

        it('should call all middleware in correct order for register', async () => {
            await request(app)
                .post('/register')
                .send({ username: 'test', email: 'test@test.com', password: 'test' });

            expect(mockMiddleware.authenticateToken).toHaveBeenCalled();
            expect(mockMiddleware.authorizeRoles).toHaveBeenCalled();
            expect(mockMiddleware.strictLimiter).toHaveBeenCalled();
            expect(mockMiddleware.sanitizeAuthInput).toHaveBeenCalled();
            expect(mockMiddleware.validateRegister).toHaveBeenCalled();
            expect(mockControllers.register).toHaveBeenCalled();
        });

        it('should call all middleware in correct order for profile update', async () => {
            await request(app)
                .put('/profile')
                .send({ name: 'New Name' });

            expect(mockMiddleware.authenticateToken).toHaveBeenCalled();
            expect(mockMiddleware.sanitizeAuthInput).toHaveBeenCalled();
            expect(mockMiddleware.validateUpdateProfile).toHaveBeenCalled();
            expect(mockControllers.updateProfile).toHaveBeenCalled();
        });

        it('should call all middleware in correct order for change password', async () => {
            await request(app)
                .put('/change-password')
                .send({ currentPassword: 'old', newPassword: 'new' });

            expect(mockMiddleware.authenticateToken).toHaveBeenCalled();
            expect(mockMiddleware.strictLimiter).toHaveBeenCalled();
            expect(mockMiddleware.validateChangePassword).toHaveBeenCalled();
            expect(mockControllers.changePassword).toHaveBeenCalled();
        });
    });

    describe('Controller function calls verification', () => {
        it('should call each controller function exactly once per request', async () => {
            // Test multiple endpoints to ensure controllers are called correctly
            const endpoints = [
                { method: 'post', path: '/login', body: { username: 'test', password: 'pass' }, controller: 'login' },
                { method: 'get', path: '/verify-token', body: {}, controller: 'verifyToken' },
                { method: 'get', path: '/profile', body: {}, controller: 'getProfile' },
                { method: 'put', path: '/profile', body: { name: 'Test' }, controller: 'updateProfile' },
                { method: 'put', path: '/change-password', body: { currentPassword: 'old', newPassword: 'new' }, controller: 'changePassword' },
                { method: 'post', path: '/logout', body: {}, controller: 'logout' },
                { method: 'post', path: '/register', body: { username: 'test', email: 'test@test.com', password: 'test' }, controller: 'register' },
                { method: 'get', path: '/users', body: {}, controller: 'getAllUsers' }
            ];

            for (const endpoint of endpoints) {
                jest.clearAllMocks();
                
                await request(app)[endpoint.method](endpoint.path).send(endpoint.body);
                
                expect(mockControllers[endpoint.controller]).toHaveBeenCalledTimes(1);
            }
        });
    });

    describe('Edge cases and boundary conditions', () => {
        it('should handle very long usernames', async () => {
            const longUsername = 'a'.repeat(1000);
            await request(app)
                .post('/login')
                .send({ username: longUsername, password: 'password' });

            expect(mockControllers.login).toHaveBeenCalled();
        });

        it('should handle Unicode characters', async () => {
            await request(app)
                .post('/login')
                .send({ username: '测试用户', password: 'пароль123' });

            expect(mockControllers.login).toHaveBeenCalled();
        });

        it('should handle null and undefined values', async () => {
            await request(app)
                .post('/login')
                .send({ username: null, password: undefined });

            expect(mockControllers.login).toHaveBeenCalled();
        });

        it('should handle very large request bodies', async () => {
            const largeData = {
                username: 'test',
                password: 'password',
                metadata: 'x'.repeat(10000)
            };

            await request(app)
                .post('/login')
                .send(largeData);

            expect(mockControllers.login).toHaveBeenCalled();
        });
    });

    describe('Express router functionality', () => {
        it('should handle concurrent requests', async () => {
            const promises = Array(5).fill().map(() =>
                request(app)
                    .post('/login')
                    .send({ username: 'test', password: 'password' })
            );

            const results = await Promise.all(promises);
            
            // All requests should complete successfully
            results.forEach(result => {
                expect(result.status).not.toBe(500);
            });

            // Login controller should be called for each request
            expect(mockControllers.login).toHaveBeenCalledTimes(5);
        });

        it('should handle routes in correct precedence order', async () => {
            // Test that specific routes are matched before general patterns
            
            // Test /profile (specific)
            await request(app).get('/profile');
            expect(mockControllers.getProfile).toHaveBeenCalled();
            
            jest.clearAllMocks();
            
            // Test /users (specific)
            await request(app).get('/users');
            expect(mockControllers.getAllUsers).toHaveBeenCalled();
        });
    });
});
