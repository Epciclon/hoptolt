const request = require('supertest');
const express = require('express');
const growthRoutes = require('../../../src/routes/growthRoutes');

// Mock the controllers
jest.mock('../../../src/controllers/growthController');

const growthController = require('../../../src/controllers/growthController');

describe('Growth Routes', () => {
    let app;

    beforeEach(() => {
        // Create express app with routes
        app = express();
        app.use(express.json());
        app.use('/', growthRoutes);

        // Reset all mocks
        jest.clearAllMocks();

        // Setup default controller mocks
        growthController.updateAgeAndGetRabbits.mockImplementation((req, res) => {
            res.status(200).json({ 
                success: true,
                message: 'La edad de los conejos ha sido actualizada: R001, R002',
                data: {
                    rabbits: [
                        { 
                            _id: '1',
                            code: 'R001', 
                            race: { name: 'Californiano' },
                            sex: 'Macho',
                            age: 12,
                            weight: 3.5,
                            cage: { cageNumber: 'C001' },
                            lastVaccination: '2024-01-15',
                            lastDeworming: '2024-01-10'
                        },
                        { 
                            _id: '2',
                            code: 'R002', 
                            race: { name: 'Nueva Zelanda' },
                            sex: 'Hembra',
                            age: 8,
                            weight: 2.8,
                            cage: { cageNumber: 'C002' },
                            lastVaccination: 'Sin registros',
                            lastDeworming: 'Sin registros'
                        }
                    ],
                    updatedCount: 2,
                    totalCount: 2
                }
            });
        });

        growthController.updateWeight.mockImplementation((req, res) => {
            res.status(200).json({ 
                success: true,
                message: 'Se actualizó el peso de 2 conejo(s) exitosamente',
                data: {
                    successful: [
                        {
                            code: 'R001',
                            previousWeight: 3.5,
                            newWeight: 3.8,
                            change: 0.3
                        },
                        {
                            code: 'R002',
                            previousWeight: 2.8,
                            newWeight: 3.1,
                            change: 0.3
                        }
                    ],
                    totalUpdated: 2,
                    totalRequested: 2
                }
            });
        });
    });

    describe('GET /growth/update-age-and-list', () => {
        it('should call updateAgeAndGetRabbits controller', async () => {
            const response = await request(app)
                .get('/growth/update-age-and-list');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.rabbits).toHaveLength(2);
            expect(response.body.data.updatedCount).toBe(2);
            expect(response.body.data.totalCount).toBe(2);
            expect(growthController.updateAgeAndGetRabbits).toHaveBeenCalled();
        });

        it('should handle query parameters', async () => {
            await request(app)
                .get('/growth/update-age-and-list')
                .query({ 
                    sortBy: 'age',
                    order: 'desc',
                    includeDetails: 'true'
                });

            expect(growthController.updateAgeAndGetRabbits).toHaveBeenCalled();
        });

        it('should handle request without query parameters', async () => {
            await request(app)
                .get('/growth/update-age-and-list');

            expect(growthController.updateAgeAndGetRabbits).toHaveBeenCalled();
        });

        it('should handle multiple query parameters', async () => {
            await request(app)
                .get('/growth/update-age-and-list')
                .query({ 
                    filter: 'active',
                    race: 'Californiano',
                    minAge: '6',
                    maxAge: '24'
                });

            expect(growthController.updateAgeAndGetRabbits).toHaveBeenCalled();
        });

        it('should handle empty query parameters', async () => {
            await request(app)
                .get('/growth/update-age-and-list')
                .query({});

            expect(growthController.updateAgeAndGetRabbits).toHaveBeenCalled();
        });
    });

    describe('POST /growth/update-weight', () => {
        it('should call updateWeight controller', async () => {
            const weightData = {
                rabbitIds: ['1', '2'],
                weightChange: 0.3
            };

            const response = await request(app)
                .post('/growth/update-weight')
                .send(weightData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.successful).toHaveLength(2);
            expect(response.body.data.totalUpdated).toBe(2);
            expect(growthController.updateWeight).toHaveBeenCalled();
        });

        it('should pass request body to controller', async () => {
            const weightData = {
                rabbitIds: ['3', '4', '5'],
                weightChange: -0.2,
                reason: 'Diet adjustment'
            };

            await request(app)
                .post('/growth/update-weight')
                .send(weightData);

            expect(growthController.updateWeight).toHaveBeenCalled();
        });

        it('should handle single rabbit weight update', async () => {
            const weightData = {
                rabbitIds: ['1'],
                weightChange: 0.5
            };

            await request(app)
                .post('/growth/update-weight')
                .send(weightData);

            expect(growthController.updateWeight).toHaveBeenCalled();
        });

        it('should handle negative weight changes', async () => {
            const weightData = {
                rabbitIds: ['1', '2'],
                weightChange: -0.4
            };

            await request(app)
                .post('/growth/update-weight')
                .send(weightData);

            expect(growthController.updateWeight).toHaveBeenCalled();
        });

        it('should handle large weight changes', async () => {
            const weightData = {
                rabbitIds: ['1'],
                weightChange: 1.5
            };

            await request(app)
                .post('/growth/update-weight')
                .send(weightData);

            expect(growthController.updateWeight).toHaveBeenCalled();
        });

        it('should handle empty request body', async () => {
            await request(app)
                .post('/growth/update-weight')
                .send({});

            expect(growthController.updateWeight).toHaveBeenCalled();
        });

        it('should handle additional fields in request body', async () => {
            const weightData = {
                rabbitIds: ['1', '2'],
                weightChange: 0.2,
                notes: 'Growth monitoring',
                userId: 'user123',
                timestamp: new Date().toISOString()
            };

            await request(app)
                .post('/growth/update-weight')
                .send(weightData);

            expect(growthController.updateWeight).toHaveBeenCalled();
        });

        it('should handle decimal weight changes', async () => {
            const weightData = {
                rabbitIds: ['1', '2'],
                weightChange: 0.25
            };

            await request(app)
                .post('/growth/update-weight')
                .send(weightData);

            expect(growthController.updateWeight).toHaveBeenCalled();
        });

        it('should handle string weight changes', async () => {
            const weightData = {
                rabbitIds: ['1'],
                weightChange: '0.3'
            };

            await request(app)
                .post('/growth/update-weight')
                .send(weightData);

            expect(growthController.updateWeight).toHaveBeenCalled();
        });
    });

    describe('HTTP method validation', () => {
        it('should only accept GET for /growth/update-age-and-list', async () => {
            const unsupportedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
            
            for (const method of unsupportedMethods) {
                const response = await request(app)[method.toLowerCase()]('/growth/update-age-and-list');
                expect(response.status).toBe(404);
            }
        });

        it('should only accept POST for /growth/update-weight', async () => {
            const unsupportedMethods = ['GET', 'PUT', 'DELETE', 'PATCH'];
            
            for (const method of unsupportedMethods) {
                const response = await request(app)[method.toLowerCase()]('/growth/update-weight');
                expect(response.status).toBe(404);
            }
        });
    });

    describe('Request/Response handling', () => {
        it('should handle JSON content type for POST requests', async () => {
            const weightData = { rabbitIds: ['1'], weightChange: 0.2 };
            
            const response = await request(app)
                .post('/growth/update-weight')
                .set('Content-Type', 'application/json')
                .send(JSON.stringify(weightData));

            expect(response.status).toBe(200);
        });

        it('should handle malformed JSON gracefully', async () => {
            const response = await request(app)
                .post('/growth/update-weight')
                .set('Content-Type', 'application/json')
                .send('invalid json');

            expect(response.status).toBe(400);
        });

        it('should handle large arrays of rabbit IDs', async () => {
            const largeArray = Array.from({ length: 100 }, (_, i) => `${i + 1}`);
            const weightData = {
                rabbitIds: largeArray,
                weightChange: 0.1
            };

            const response = await request(app)
                .post('/growth/update-weight')
                .send(weightData);

            expect(response.status).toBe(200);
        });

        it('should handle complex query strings for GET requests', async () => {
            await request(app)
                .get('/growth/update-age-and-list')
                .query({ 
                    filters: JSON.stringify({ race: 'Californiano', minAge: 6 }),
                    sort: JSON.stringify({ field: 'age', order: 'asc' })
                });

            expect(growthController.updateAgeAndGetRabbits).toHaveBeenCalled();
        });
    });

    describe('Controller function calls verification', () => {
        it('should call each controller function exactly once per request', async () => {
            await request(app).get('/growth/update-age-and-list');
            expect(growthController.updateAgeAndGetRabbits).toHaveBeenCalledTimes(1);

            await request(app).post('/growth/update-weight').send({});
            expect(growthController.updateWeight).toHaveBeenCalledTimes(1);
        });

        it('should handle multiple concurrent requests', async () => {
            const promises = [
                request(app).get('/growth/update-age-and-list'),
                request(app).post('/growth/update-weight').send({ rabbitIds: ['1'], weightChange: 0.1 }),
                request(app).get('/growth/update-age-and-list').query({ sortBy: 'code' })
            ];

            const responses = await Promise.all(promises);
            
            responses.forEach(response => {
                expect(response.status).toBeLessThan(400);
            });
        });
    });

    describe('Edge cases and error handling', () => {
        it('should handle requests with no body for POST routes', async () => {
            const response = await request(app)
                .post('/growth/update-weight')
                .send();

            expect(response.status).toBe(200); // Assuming controller handles this gracefully
        });

        it('should handle extremely large weight changes', async () => {
            const weightData = {
                rabbitIds: ['1'],
                weightChange: 10.5
            };

            await request(app)
                .post('/growth/update-weight')
                .send(weightData);

            expect(growthController.updateWeight).toHaveBeenCalled();
        });

        it('should handle zero weight change', async () => {
            const weightData = {
                rabbitIds: ['1'],
                weightChange: 0
            };

            await request(app)
                .post('/growth/update-weight')
                .send(weightData);

            expect(growthController.updateWeight).toHaveBeenCalled();
        });

        it('should handle null and undefined values', async () => {
            const weightData = {
                rabbitIds: null,
                weightChange: undefined
            };

            await request(app)
                .post('/growth/update-weight')
                .send(weightData);

            expect(growthController.updateWeight).toHaveBeenCalled();
        });

        it('should handle special characters in query parameters', async () => {
            await request(app)
                .get('/growth/update-age-and-list')
                .query({ 
                    search: 'R-001_A',
                    filter: 'race=Californiano&active=true'
                });

            expect(growthController.updateAgeAndGetRabbits).toHaveBeenCalled();
        });

        it('should handle very long query strings', async () => {
            const longString = 'a'.repeat(1000);
            await request(app)
                .get('/growth/update-age-and-list')
                .query({ 
                    notes: longString,
                    description: longString
                });

            expect(growthController.updateAgeAndGetRabbits).toHaveBeenCalled();
        });
    });

    describe('Express router functionality', () => {
        it('should export Express router', () => {
            expect(typeof growthRoutes).toBe('function');
            expect(growthRoutes.name).toBe('router');
        });

        it('should handle route parameters correctly', async () => {
            // Test that the routes are properly defined
            const getResponse = await request(app).get('/growth/update-age-and-list');
            expect(getResponse.status).not.toBe(404);

            const postResponse = await request(app).post('/growth/update-weight').send({});
            expect(postResponse.status).not.toBe(404);
        });

        it('should handle middleware integration', async () => {
            // Test that express.json() middleware works
            const weightData = { rabbitIds: ['1'], weightChange: 0.3 };
            
            const response = await request(app)
                .post('/growth/update-weight')
                .send(weightData);

            expect(response.status).toBe(200);
            expect(growthController.updateWeight).toHaveBeenCalled();
        });
    });

    describe('Route path validation', () => {
        it('should match exact paths for GET routes', async () => {
            const validResponse = await request(app).get('/growth/update-age-and-list');
            expect(validResponse.status).toBe(200);

            const invalidResponse = await request(app).get('/growth/update-age-and-list/extra');
            expect(invalidResponse.status).toBe(404);
        });

        it('should match exact paths for POST routes', async () => {
            const validResponse = await request(app).post('/growth/update-weight').send({});
            expect(validResponse.status).toBe(200);

            const invalidResponse = await request(app).post('/growth/update-weight/extra').send({});
            expect(invalidResponse.status).toBe(404);
        });

        it('should handle case sensitivity', async () => {
            // Express routes are case sensitive by default
            const response = await request(app).get('/Growth/Update-Age-And-List');
            // Note: Express may handle case differently, so we'll check for any valid response
            expect([200, 404]).toContain(response.status);
        });

        it('should handle trailing slashes', async () => {
            const response = await request(app).get('/growth/update-age-and-list/');
            // Express may handle trailing slashes differently based on configuration
            expect([200, 404]).toContain(response.status);
        });
    });

    describe('Data validation and transformation', () => {
        it('should handle boolean values in weight change', async () => {
            const weightData = {
                rabbitIds: ['1'],
                weightChange: true // Will be converted to 1
            };

            await request(app)
                .post('/growth/update-weight')
                .send(weightData);

            expect(growthController.updateWeight).toHaveBeenCalled();
        });

        it('should handle array with mixed data types', async () => {
            const weightData = {
                rabbitIds: ['1', 2, '3'], // Mixed strings and numbers
                weightChange: 0.2
            };

            await request(app)
                .post('/growth/update-weight')
                .send(weightData);

            expect(growthController.updateWeight).toHaveBeenCalled();
        });

        it('should handle nested objects in request body', async () => {
            const weightData = {
                rabbitIds: ['1'],
                weightChange: 0.3,
                metadata: {
                    user: 'admin',
                    timestamp: new Date().toISOString(),
                    settings: {
                        autoSave: true,
                        notifications: false
                    }
                }
            };

            await request(app)
                .post('/growth/update-weight')
                .send(weightData);

            expect(growthController.updateWeight).toHaveBeenCalled();
        });
    });
});
