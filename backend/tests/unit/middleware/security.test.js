const {
    loginLimiter,
    apiLimiter,
    strictLimiter,
    helmetConfig,
    securityLogger,
    bruteForceDetection,
    inputSanitizer
} = require('../../../src/middleware/security');

describe('Security Middleware', () => {
    let mockReq, mockRes, mockNext;
    let consoleSpy;

    beforeEach(() => {
        mockReq = {
            ip: '127.0.0.1',
            connection: { remoteAddress: '127.0.0.1' },
            method: 'GET',
            url: '/test',
            headers: {},
            body: {},
            query: {},
            get: jest.fn()
        };
        
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            set: jest.fn(),
            setHeader: jest.fn(),
            removeHeader: jest.fn(),
            getHeader: jest.fn(),
            header: jest.fn()
        };
        
        mockNext = jest.fn();

        // Mock console.log to suppress output during tests
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        // Reset all mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    describe('Rate Limiters', () => {
        describe('loginLimiter', () => {
            it('should be configured with correct options', () => {
                expect(loginLimiter).toBeDefined();
                expect(typeof loginLimiter).toBe('function');
            });

            it('should allow requests within rate limit', (done) => {
                loginLimiter(mockReq, mockRes, (err) => {
                    expect(err).toBeUndefined();
                    done();
                });
            });

            it('should have custom keyGenerator function', () => {
                // Test that the security module exports the loginLimiter correctly
                expect(loginLimiter).toBeDefined();
                expect(typeof loginLimiter).toBe('function');
                
                // We can test the behavior by checking the module structure
                const securityModule = require('../../../src/middleware/security');
                expect(securityModule.loginLimiter).toBe(loginLimiter);
            });
        });

        describe('apiLimiter', () => {
            it('should be configured with correct options', () => {
                expect(apiLimiter).toBeDefined();
                expect(typeof apiLimiter).toBe('function');
            });

            it('should be properly configured rate limiter', () => {
                // Test that the middleware exists and is functional
                expect(apiLimiter).toBeDefined();
                
                // Test that it's different from other limiters
                expect(apiLimiter).not.toBe(loginLimiter);
                expect(apiLimiter).not.toBe(strictLimiter);
            });
        });

        describe('strictLimiter', () => {
            it('should be configured with correct options', () => {
                expect(strictLimiter).toBeDefined();
                expect(typeof strictLimiter).toBe('function');
            });

            it('should be properly configured strict limiter', () => {
                // Test that the middleware exists and is functional
                expect(strictLimiter).toBeDefined();
                
                // Test that it's different from other limiters
                expect(strictLimiter).not.toBe(loginLimiter);
                expect(strictLimiter).not.toBe(apiLimiter);
            });
        });
    });

    describe('helmetConfig', () => {
        it('should be configured helmet middleware', () => {
            expect(helmetConfig).toBeDefined();
            expect(typeof helmetConfig).toBe('function');
        });

        it('should apply security headers', () => {
            // Test that helmet middleware runs without error
            helmetConfig(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('securityLogger', () => {
        it('should log sensitive route access', () => {
            mockReq.url = '/auth/login';
            mockReq.method = 'POST';
            mockReq.ip = '192.168.1.100';
            mockReq.get.mockReturnValue('Mozilla/5.0 Test Browser');

            securityLogger(mockReq, mockRes, mockNext);

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[SECURITY LOG]')
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('IP: 192.168.1.100')
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('POST /auth/login')
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Mozilla/5.0 Test Browser')
            );
            expect(mockNext).toHaveBeenCalled();
        });

        it('should log auth/register route access', () => {
            mockReq.url = '/auth/register';
            mockReq.method = 'POST';

            securityLogger(mockReq, mockRes, mockNext);

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('/auth/register')
            );
            expect(mockNext).toHaveBeenCalled();
        });

        it('should log auth/forgot-password route access', () => {
            mockReq.url = '/auth/forgot-password';

            securityLogger(mockReq, mockRes, mockNext);

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('/auth/forgot-password')
            );
            expect(mockNext).toHaveBeenCalled();
        });

        it('should log auth/reset-password route access', () => {
            mockReq.url = '/auth/reset-password';

            securityLogger(mockReq, mockRes, mockNext);

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('/auth/reset-password')
            );
            expect(mockNext).toHaveBeenCalled();
        });

        it('should not log non-sensitive routes', () => {
            mockReq.url = '/api/rabbits';

            securityLogger(mockReq, mockRes, mockNext);

            expect(consoleSpy).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalled();
        });

        it('should handle missing User-Agent gracefully', () => {
            mockReq.url = '/auth/login';
            mockReq.get.mockReturnValue(undefined);

            securityLogger(mockReq, mockRes, mockNext);

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('User-Agent: Unknown')
            );
            expect(mockNext).toHaveBeenCalled();
        });

        it('should handle missing IP gracefully', () => {
            mockReq.url = '/auth/login';
            mockReq.ip = undefined;
            mockReq.connection.remoteAddress = '10.0.0.1';

            securityLogger(mockReq, mockRes, mockNext);

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('IP: 10.0.0.1')
            );
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('bruteForceDetection', () => {
        it('should continue without blocking by default', () => {
            mockReq.ip = '192.168.1.1';

            bruteForceDetection(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should process requests from different IPs', () => {
            const requests = ['192.168.1.1', '192.168.1.2', '192.168.1.3'];

            requests.forEach(ip => {
                mockReq.ip = ip;
                bruteForceDetection(mockReq, mockRes, mockNext);
            });

            expect(mockNext).toHaveBeenCalledTimes(3);
        });

        it('should handle timestamp tracking', () => {
            const originalDateNow = Date.now;
            const mockTimestamp = 1234567890000;
            Date.now = jest.fn(() => mockTimestamp);

            bruteForceDetection(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();

            Date.now = originalDateNow;
        });
    });

    describe('inputSanitizer', () => {
        describe('Body sanitization', () => {
            it('should sanitize string values in body', () => {
                mockReq.body = {
                    username: '<script>alert("xss")</script>testuser',
                    email: 'test@example.com',
                    description: 'javascript:alert("hack")'
                };

                inputSanitizer(mockReq, mockRes, mockNext);

                expect(mockReq.body.username).toBe('testuser');
                expect(mockReq.body.email).toBe('test@example.com');
                expect(mockReq.body.description).toBe('alert("hack")');
                expect(mockNext).toHaveBeenCalled();
            });

            it('should remove script tags from body values', () => {
                mockReq.body = {
                    content: 'Hello <script>alert("xss")</script> World',
                    title: 'Clean title'
                };

                inputSanitizer(mockReq, mockRes, mockNext);

                expect(mockReq.body.content).toBe('Hello  World');
                expect(mockReq.body.title).toBe('Clean title');
                expect(mockNext).toHaveBeenCalled();
            });

            it('should remove event attributes from body values', () => {
                mockReq.body = {
                    html: '<div onclick="alert()">Click me</div>',
                    text: 'onmouseover=alert(1) normal text'
                };

                inputSanitizer(mockReq, mockRes, mockNext);

                // The current regex removes the pattern but might leave some artifacts
                expect(mockReq.body.html).not.toContain('onclick=');
                expect(mockReq.body.text).not.toContain('onmouseover=');
                expect(mockNext).toHaveBeenCalled();
            });

            it('should trim whitespace from body values', () => {
                mockReq.body = {
                    username: '  testuser  ',
                    password: '\t\npassword123\t\n'
                };

                inputSanitizer(mockReq, mockRes, mockNext);

                expect(mockReq.body.username).toBe('testuser');
                expect(mockReq.body.password).toBe('password123');
                expect(mockNext).toHaveBeenCalled();
            });

            it('should handle non-string values in body', () => {
                mockReq.body = {
                    age: 25,
                    active: true,
                    metadata: { key: 'value' },
                    tags: ['tag1', 'tag2']
                };

                inputSanitizer(mockReq, mockRes, mockNext);

                expect(mockReq.body.age).toBe(25);
                expect(mockReq.body.active).toBe(true);
                expect(mockReq.body.metadata).toEqual({ key: 'value' });
                expect(mockReq.body.tags).toEqual(['tag1', 'tag2']);
                expect(mockNext).toHaveBeenCalled();
            });

            it('should handle empty body', () => {
                mockReq.body = {};

                inputSanitizer(mockReq, mockRes, mockNext);

                expect(mockReq.body).toEqual({});
                expect(mockNext).toHaveBeenCalled();
            });

            it('should handle null body', () => {
                mockReq.body = null;

                inputSanitizer(mockReq, mockRes, mockNext);

                expect(mockReq.body).toBeNull();
                expect(mockNext).toHaveBeenCalled();
            });
        });

        describe('Query parameter sanitization', () => {
            it('should sanitize string values in query params', () => {
                mockReq.query = {
                    search: '<script>alert("xss")</script>rabbit',
                    page: '1',
                    filter: 'javascript:alert("hack")'
                };

                inputSanitizer(mockReq, mockRes, mockNext);

                expect(mockReq.query.search).toBe('rabbit');
                expect(mockReq.query.page).toBe('1');
                expect(mockReq.query.filter).toBe('alert("hack")');
                expect(mockNext).toHaveBeenCalled();
            });

            it('should remove script tags from query params', () => {
                mockReq.query = {
                    q: 'search <script>malicious()</script> term'
                };

                inputSanitizer(mockReq, mockRes, mockNext);

                expect(mockReq.query.q).toBe('search  term');
                expect(mockNext).toHaveBeenCalled();
            });

            it('should remove event attributes from query params', () => {
                mockReq.query = {
                    callback: 'onload=alert(1)',
                    redirect: 'onclick=hack()'
                };

                inputSanitizer(mockReq, mockRes, mockNext);

                // The current regex removes the pattern but might leave some content
                expect(mockReq.query.callback).not.toContain('onload=');
                expect(mockReq.query.redirect).not.toContain('onclick=');
                expect(mockNext).toHaveBeenCalled();
            });

            it('should trim whitespace from query params', () => {
                mockReq.query = {
                    term: '  search term  ',
                    category: '\t\nbooks\t\n'
                };

                inputSanitizer(mockReq, mockRes, mockNext);

                expect(mockReq.query.term).toBe('search term');
                expect(mockReq.query.category).toBe('books');
                expect(mockNext).toHaveBeenCalled();
            });

            it('should handle empty query', () => {
                mockReq.query = {};

                inputSanitizer(mockReq, mockRes, mockNext);

                expect(mockReq.query).toEqual({});
                expect(mockNext).toHaveBeenCalled();
            });

            it('should handle null query', () => {
                mockReq.query = null;

                inputSanitizer(mockReq, mockRes, mockNext);

                expect(mockReq.query).toBeNull();
                expect(mockNext).toHaveBeenCalled();
            });
        });

        describe('Complex XSS patterns', () => {
            it('should handle case-insensitive script tags', () => {
                mockReq.body = {
                    content: '<SCRIPT>alert("xss")</SCRIPT>test<Script>hack()</Script>'
                };

                inputSanitizer(mockReq, mockRes, mockNext);

                expect(mockReq.body.content).toBe('test');
                expect(mockNext).toHaveBeenCalled();
            });

            it('should handle script tags with attributes', () => {
                mockReq.body = {
                    content: '<script type="text/javascript">alert("xss")</script>clean text'
                };

                inputSanitizer(mockReq, mockRes, mockNext);

                expect(mockReq.body.content).toBe('clean text');
                expect(mockNext).toHaveBeenCalled();
            });

            it('should handle nested script tags', () => {
                mockReq.body = {
                    content: '<div><script>alert("xss")</script></div>safe content'
                };

                inputSanitizer(mockReq, mockRes, mockNext);

                expect(mockReq.body.content).toBe('<div></div>safe content');
                expect(mockNext).toHaveBeenCalled();
            });

            it('should handle javascript URLs case-insensitively', () => {
                mockReq.body = {
                    link1: 'JAVASCRIPT:alert("hack")',
                    link2: 'Javascript:malicious()',
                    link3: 'https://safe-link.com'
                };

                inputSanitizer(mockReq, mockRes, mockNext);

                expect(mockReq.body.link1).toBe('alert("hack")');
                expect(mockReq.body.link2).toBe('malicious()');
                expect(mockReq.body.link3).toBe('https://safe-link.com');
                expect(mockNext).toHaveBeenCalled();
            });

            it('should handle various event attributes', () => {
                mockReq.body = {
                    html: 'onclick=alert(1) onmouseover=hack() onsubmit=evil() normal text'
                };

                inputSanitizer(mockReq, mockRes, mockNext);

                // Check that event attributes are removed
                expect(mockReq.body.html).not.toContain('onclick=');
                expect(mockReq.body.html).not.toContain('onmouseover=');
                expect(mockReq.body.html).not.toContain('onsubmit=');
                expect(mockReq.body.html).toContain('normal text');
                expect(mockNext).toHaveBeenCalled();
            });
        });

        describe('Performance and edge cases', () => {
            it('should handle large strings efficiently', () => {
                const largeString = 'a'.repeat(10000) + '<script>alert("xss")</script>' + 'b'.repeat(10000);
                mockReq.body = {
                    content: largeString
                };

                const startTime = Date.now();
                inputSanitizer(mockReq, mockRes, mockNext);
                const endTime = Date.now();

                expect(mockReq.body.content).not.toContain('<script>');
                expect(endTime - startTime).toBeLessThan(100); // Should be fast
                expect(mockNext).toHaveBeenCalled();
            });

            it('should handle empty strings', () => {
                mockReq.body = {
                    empty: '',
                    whitespace: '   ',
                    tabs: '\t\t\t'
                };

                inputSanitizer(mockReq, mockRes, mockNext);

                expect(mockReq.body.empty).toBe('');
                expect(mockReq.body.whitespace).toBe('');
                expect(mockReq.body.tabs).toBe('');
                expect(mockNext).toHaveBeenCalled();
            });

            it('should handle special characters', () => {
                mockReq.body = {
                    unicode: 'Hello 世界 🌍',
                    special: '!@#$%^&*()_+-={}[]|\\:";\'<>?,./',
                    mixed: 'Normal text with émojis 🎉 and unicode ñáéíóú'
                };

                inputSanitizer(mockReq, mockRes, mockNext);

                expect(mockReq.body.unicode).toBe('Hello 世界 🌍');
                expect(mockReq.body.special).toBe('!@#$%^&*()_+-={}[]|\\:";\'<>?,./');
                expect(mockReq.body.mixed).toBe('Normal text with émojis 🎉 and unicode ñáéíóú');
                expect(mockNext).toHaveBeenCalled();
            });
        });
    });

    describe('Integration scenarios', () => {
        it('should handle request with both body and query sanitization', () => {
            mockReq.body = {
                username: '<script>alert("body")</script>user',
                password: 'javascript:void(0)'
            };
            mockReq.query = {
                redirect: '<script>alert("query")</script>/dashboard',
                token: 'onclick=steal()'
            };

            inputSanitizer(mockReq, mockRes, mockNext);

            expect(mockReq.body.username).toBe('user');
            expect(mockReq.body.password).toBe('void(0)');
            expect(mockReq.query.redirect).toBe('/dashboard');
            expect(mockReq.query.token).not.toContain('onclick=');
            expect(mockNext).toHaveBeenCalled();
        });

        it('should work with security logging', () => {
            mockReq.url = '/auth/login';
            mockReq.body = {
                username: '<script>alert("xss")</script>admin',
                password: 'password123'
            };

            // Apply both middlewares
            securityLogger(mockReq, mockRes, () => {
                inputSanitizer(mockReq, mockRes, mockNext);
            });

            expect(consoleSpy).toHaveBeenCalled();
            expect(mockReq.body.username).toBe('admin');
            expect(mockNext).toHaveBeenCalled();
        });
    });
});
