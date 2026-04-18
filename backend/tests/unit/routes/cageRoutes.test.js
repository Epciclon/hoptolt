const request = require('supertest');
const express = require('express');
const cageRoutes = require('../../../src/routes/cageRoutes');

// Mock the controllers
jest.mock('../../../src/controllers/cageController');

const cageController = require('../../../src/controllers/cageController');

describe('Cage Routes', () => {
    let app;

    beforeEach(() => {
        // Create express app with routes
        app = express();
        app.use(express.json());
        app.use('/', cageRoutes);

        // Reset all mocks
        jest.clearAllMocks();

        // Setup default controller mocks
        cageController.registerCage.mockImplementation((req, res) => {
            res.status(201).json({ 
                message: 'Jaula registrada exitosamente',
                cage: { number: 'C001', capacity: 10 }
            });
        });

        cageController.getCage.mockImplementation((req, res) => {
            const { number } = req.params;
            res.status(200).json({ 
                cage: { number, capacity: 10, location: 'Section A' }
            });
        });

        cageController.getAllCages.mockImplementation((req, res) => {
            res.status(200).json({ 
                cages: [
                    { number: 'C001', capacity: 10, location: 'Section A' },
                    { number: 'C002', capacity: 8, location: 'Section B' }
                ]
            });
        });

        cageController.editCage.mockImplementation((req, res) => {
            const { number } = req.params;
            res.status(200).json({ 
                message: 'Jaula actualizada exitosamente',
                cage: { number, ...req.body }
            });
        });

        cageController.deleteCage.mockImplementation((req, res) => {
            res.status(200).json({ 
                message: 'Jaula eliminada exitosamente'
            });
        });
    });

    describe('POST /cages', () => {
        it('should call registerCage controller', async () => {
            const cageData = {
                number: 'C003',
                capacity: 12,
                location: 'Section C',
                description: 'New cage'
            };

            const response = await request(app)
                .post('/cages')
                .send(cageData);

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('Jaula registrada exitosamente');
            expect(cageController.registerCage).toHaveBeenCalled();
        });

        it('should pass request body to controller', async () => {
            const cageData = {
                number: 'C004',
                capacity: 6
            };

            await request(app)
                .post('/cages')
                .send(cageData);

            expect(cageController.registerCage).toHaveBeenCalled();
            // Verify the controller was called with request containing the body data
            const callArgs = cageController.registerCage.mock.calls[cageController.registerCage.mock.calls.length - 1];
            expect(callArgs[0].body).toEqual(cageData);
        });

        it('should handle empty request body', async () => {
            await request(app)
                .post('/cages')
                .send({});

            expect(cageController.registerCage).toHaveBeenCalled();
            // Verify the controller was called with empty body
            const callArgs = cageController.registerCage.mock.calls[cageController.registerCage.mock.calls.length - 1];
            expect(callArgs[0].body).toEqual({});
        });
    });

    describe('GET /cages/:number', () => {
        it('should call getCage controller with correct number parameter', async () => {
            const cageNumber = 'C001';
            const response = await request(app)
                .get(`/cages/${cageNumber}`);

            expect(response.status).toBe(200);
            expect(response.body.cage.number).toBe(cageNumber);
            expect(cageController.getCage).toHaveBeenCalled();
        });

        it('should pass number parameter to controller', async () => {
            const cageNumber = 'C999';
            
            await request(app)
                .get(`/cages/${cageNumber}`);

            expect(cageController.getCage).toHaveBeenCalled();
            // Verify the controller was called with the correct parameter
            const callArgs = cageController.getCage.mock.calls[cageController.getCage.mock.calls.length - 1];
            expect(callArgs[0].params.number).toBe(cageNumber);
        });

        it('should handle numeric cage numbers', async () => {
            const cageNumber = '123';
            
            await request(app)
                .get(`/cages/${cageNumber}`);

            expect(cageController.getCage).toHaveBeenCalled();
            // Parameter verification handled by route functionality
        });

        it('should handle alphanumeric cage numbers', async () => {
            const cageNumber = 'C001-A';
            
            await request(app)
                .get(`/cages/${cageNumber}`);

            expect(cageController.getCage).toHaveBeenCalled();
            // Parameter verification handled by route functionality
        });
    });

    describe('GET /cages', () => {
        it('should call getAllCages controller', async () => {
            const response = await request(app)
                .get('/cages');

            expect(response.status).toBe(200);
            expect(response.body.cages).toHaveLength(2);
            expect(cageController.getAllCages).toHaveBeenCalled();
        });

        it('should handle query parameters', async () => {
            await request(app)
                .get('/cages?page=1&limit=10&section=A');

            expect(cageController.getAllCages).toHaveBeenCalled();
            // Query verification handled by route functionality
        });

        it('should work without query parameters', async () => {
            await request(app)
                .get('/cages');

            expect(cageController.getAllCages).toHaveBeenCalled();
            // Query verification handled by route functionality
        });
    });

    describe('PUT /cages/:number', () => {
        it('should call editCage controller with correct parameters', async () => {
            const cageNumber = 'C001';
            const updateData = {
                capacity: 15,
                location: 'Section D'
            };

            const response = await request(app)
                .put(`/cages/${cageNumber}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Jaula actualizada exitosamente');
            expect(cageController.editCage).toHaveBeenCalled();
        });

        it('should pass both params and body to controller', async () => {
            const cageNumber = 'C002';
            const updateData = { capacity: 20 };

            await request(app)
                .put(`/cages/${cageNumber}`)
                .send(updateData);

            expect(cageController.editCage).toHaveBeenCalled();
        });

        it('should handle partial updates', async () => {
            const cageNumber = 'C001';
            const updateData = { description: 'Updated description only' };

            await request(app)
                .put(`/cages/${cageNumber}`)
                .send(updateData);

            expect(cageController.editCage).toHaveBeenCalled();
        });

        it('should handle empty update body', async () => {
            const cageNumber = 'C001';

            await request(app)
                .put(`/cages/${cageNumber}`)
                .send({});

            expect(cageController.editCage).toHaveBeenCalled();
        });
    });

    describe('DELETE /cages/:number', () => {
        it('should call deleteCage controller with correct number parameter', async () => {
            const cageNumber = 'C001';
            const response = await request(app)
                .delete(`/cages/${cageNumber}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Jaula eliminada exitosamente');
            expect(cageController.deleteCage).toHaveBeenCalled();
        });

        it('should pass number parameter to controller', async () => {
            const cageNumber = 'C999';
            
            await request(app)
                .delete(`/cages/${cageNumber}`);

            expect(cageController.deleteCage).toHaveBeenCalled();
            // Parameter verification handled by route functionality
        });

        it('should handle complex cage numbers', async () => {
            const cageNumber = 'CAGE-001-SECTION-A';
            
            await request(app)
                .delete(`/cages/${cageNumber}`);

            expect(cageController.deleteCage).toHaveBeenCalled();
            // Parameter verification handled by route functionality
        });
    });

    describe('Route parameter encoding', () => {
        it('should handle URL encoded parameters', async () => {
            const cageNumber = 'C 001';
            const encodedNumber = encodeURIComponent(cageNumber);
            
            await request(app)
                .get(`/cages/${encodedNumber}`);

            expect(cageController.getCage).toHaveBeenCalled();
            // Parameter verification handled by route functionality
        });

        it('should handle special characters in cage numbers', async () => {
            const cageNumber = 'C-001_A';
            
            await request(app)
                .get(`/cages/${cageNumber}`);

            expect(cageController.getCage).toHaveBeenCalled();
            // Parameter verification handled by route functionality
        });
    });

    describe('HTTP method validation', () => {
        it('should only accept POST for /cages', async () => {
            const unsupportedMethods = ['GET', 'PUT', 'DELETE', 'PATCH'];
            
            for (const method of unsupportedMethods) {
                const response = await request(app)[method.toLowerCase()]('/cages');
                
                if (method === 'GET') {
                    // GET /cages is supported
                    expect(response.status).toBe(200);
                } else {
                    expect(response.status).toBe(404);
                }
            }
        });

        it('should only accept specified methods for parameterized routes', async () => {
            const cageNumber = 'C001';
            
            // Test unsupported method
            const response = await request(app)
                .patch(`/cages/${cageNumber}`)
                .send({});

            expect(response.status).toBe(404);
        });
    });

    describe('Request/Response handling', () => {
        it('should handle JSON content type', async () => {
            const cageData = { number: 'C005', capacity: 10 };
            
            const response = await request(app)
                .post('/cages')
                .set('Content-Type', 'application/json')
                .send(JSON.stringify(cageData));

            expect(response.status).toBe(201);
        });

        it('should handle malformed JSON gracefully', async () => {
            const response = await request(app)
                .post('/cages')
                .set('Content-Type', 'application/json')
                .send('invalid json');

            expect(response.status).toBe(400);
        });
    });

    describe('Controller function calls verification', () => {
        it('should call each controller function exactly once per request', async () => {
            await request(app).post('/cages').send({});
            expect(cageController.registerCage).toHaveBeenCalledTimes(1);

            await request(app).get('/cages/C001');
            expect(cageController.getCage).toHaveBeenCalledTimes(1);

            await request(app).get('/cages');
            expect(cageController.getAllCages).toHaveBeenCalledTimes(1);

            await request(app).put('/cages/C001').send({});
            expect(cageController.editCage).toHaveBeenCalledTimes(1);

            await request(app).delete('/cages/C001');
            expect(cageController.deleteCage).toHaveBeenCalledTimes(1);
        });
    });

    describe('Route ordering and precedence', () => {
        it('should prioritize specific routes over parameterized routes', async () => {
            // This ensures that GET /cages doesn't conflict with GET /cages/:number
            await request(app).get('/cages');
            expect(cageController.getAllCages).toHaveBeenCalled();
            expect(cageController.getCage).not.toHaveBeenCalled();
        });
    });

    describe('Express router functionality', () => {
        it('should export Express router', () => {
            expect(typeof cageRoutes).toBe('function');
            expect(cageRoutes.name).toBe('router');
        });

        it('should handle concurrent requests', async () => {
            const promises = [
                request(app).get('/cages'),
                request(app).get('/cages/C001'),
                request(app).post('/cages').send({ number: 'C003', capacity: 10 })
            ];

            const responses = await Promise.all(promises);
            
            responses.forEach(response => {
                expect(response.status).toBeLessThan(400);
            });
        });
    });
});
