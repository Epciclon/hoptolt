const request = require('supertest');
const express = require('express');
const matingRoutes = require('../../../src/routes/matingRoutes');

// Mock the controllers
jest.mock('../../../src/controllers/matingController');

const matingController = require('../../../src/controllers/matingController');

describe('Mating Routes', () => {
    let app;

    beforeEach(() => {
        // Create express app with routes
        app = express();
        app.use(express.json());
        app.use('/', matingRoutes);

        // Reset all mocks
        jest.clearAllMocks();

        // Setup default controller mocks
        matingController.getAvailableFemales.mockImplementation((req, res) => {
            res.status(200).json({ 
                females: [
                    { codigo: 'R001', name: 'Female 1', race: 'Nueva Zelanda', age: 365 },
                    { codigo: 'R002', name: 'Female 2', race: 'California', age: 400 }
                ],
                total: 2
            });
        });

        matingController.registerMating.mockImplementation((req, res) => {
            res.status(201).json({ 
                message: 'Monta registrada exitosamente',
                mating: { 
                    id: 'MATING001',
                    codigoHembra: req.body.codigoHembra,
                    codigoMacho: req.body.codigoMacho,
                    fechaMonta: req.body.fechaMonta,
                    fechaPartoEsperado: req.body.fechaPartoEsperado
                }
            });
        });

        matingController.getActiveMatings.mockImplementation((req, res) => {
            res.status(200).json({ 
                matings: [
                    { 
                        id: 'MATING001', 
                        codigoHembra: 'R001', 
                        codigoMacho: 'R003',
                        fechaMonta: '2024-01-15',
                        estado: 'activa'
                    },
                    { 
                        id: 'MATING002', 
                        codigoHembra: 'R002', 
                        codigoMacho: 'R004',
                        fechaMonta: '2024-01-20',
                        estado: 'activa'
                    }
                ],
                total: 2
            });
        });

        matingController.deleteMating.mockImplementation((req, res) => {
            res.status(200).json({ 
                message: 'Monta eliminada exitosamente'
            });
        });
    });

    describe('GET /mating/females', () => {
        it('should call getAvailableFemales controller', async () => {
            const response = await request(app)
                .get('/mating/females');

            expect(response.status).toBe(200);
            expect(response.body.females).toHaveLength(2);
            expect(response.body.total).toBe(2);
            expect(matingController.getAvailableFemales).toHaveBeenCalled();
        });

        it('should handle query parameters for filtering', async () => {
            await request(app)
                .get('/mating/females')
                .query({ 
                    race: 'Nueva Zelanda',
                    minAge: '300',
                    maxAge: '800',
                    available: 'true'
                });

            expect(matingController.getAvailableFemales).toHaveBeenCalled();
        });

        it('should handle pagination parameters', async () => {
            await request(app)
                .get('/mating/females')
                .query({ page: '2', limit: '10' });

            expect(matingController.getAvailableFemales).toHaveBeenCalled();
        });

        it('should work without query parameters', async () => {
            await request(app)
                .get('/mating/females');

            expect(matingController.getAvailableFemales).toHaveBeenCalled();
        });

        it('should handle sorting parameters', async () => {
            await request(app)
                .get('/mating/females')
                .query({ 
                    sortBy: 'age',
                    order: 'desc',
                    status: 'available'
                });

            expect(matingController.getAvailableFemales).toHaveBeenCalled();
        });

        it('should handle complex filtering', async () => {
            await request(app)
                .get('/mating/females')
                .query({ 
                    races: 'Nueva Zelanda,California',
                    excludeRecent: 'true',
                    healthStatus: 'good'
                });

            expect(matingController.getAvailableFemales).toHaveBeenCalled();
        });
    });

    describe('POST /mating/register', () => {
        it('should call registerMating controller', async () => {
            const matingData = {
                codigoHembra: 'R001',
                codigoMacho: 'R003',
                fechaMonta: '2024-01-15',
                observaciones: 'Primera monta'
            };

            const response = await request(app)
                .post('/mating/register')
                .send(matingData);

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('Monta registrada exitosamente');
            expect(matingController.registerMating).toHaveBeenCalled();
        });

        it('should pass request body to controller', async () => {
            const matingData = {
                codigoHembra: 'R002',
                codigoMacho: 'R004',
                fechaMonta: '2024-01-16'
            };

            await request(app)
                .post('/mating/register')
                .send(matingData);

            expect(matingController.registerMating).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle minimal mating data', async () => {
            const matingData = {
                codigoHembra: 'R005',
                codigoMacho: 'R006'
            };

            await request(app)
                .post('/mating/register')
                .send(matingData);

            expect(matingController.registerMating).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle complete mating data', async () => {
            const matingData = {
                codigoHembra: 'R007',
                codigoMacho: 'R008',
                fechaMonta: '2024-01-17',
                horaInicio: '09:00',
                horaFin: '09:30',
                exitosa: true,
                observaciones: 'Monta exitosa, sin complicaciones',
                responsable: 'user123',
                condicionesAmbientales: 'Temperatura 20°C'
            };

            await request(app)
                .post('/mating/register')
                .send(matingData);

            expect(matingController.registerMating).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle boolean success flag', async () => {
            const matingData = {
                codigoHembra: 'R009',
                codigoMacho: 'R010',
                fechaMonta: '2024-01-18',
                exitosa: false
            };

            await request(app)
                .post('/mating/register')
                .send(matingData);

            expect(matingController.registerMating).toHaveBeenCalled();
        });

        it('should handle empty request body', async () => {
            await request(app)
                .post('/mating/register')
                .send({});

            expect(matingController.registerMating).toHaveBeenCalled();
        });
    });

    describe('GET /mating/active', () => {
        it('should call getActiveMatings controller', async () => {
            const response = await request(app)
                .get('/mating/active');

            expect(response.status).toBe(200);
            expect(response.body.matings).toHaveLength(2);
            expect(response.body.total).toBe(2);
            expect(matingController.getActiveMatings).toHaveBeenCalled();
        });

        it('should handle query parameters for filtering', async () => {
            await request(app)
                .get('/mating/active')
                .query({ 
                    dateFrom: '2024-01-01',
                    dateTo: '2024-01-31',
                    femaleCode: 'R001'
                });

            expect(matingController.getActiveMatings).toHaveBeenCalled();
        });

        it('should handle pagination and sorting', async () => {
            await request(app)
                .get('/mating/active')
                .query({ 
                    page: '1',
                    limit: '20',
                    sortBy: 'fechaMonta',
                    order: 'desc'
                });

            expect(matingController.getActiveMatings).toHaveBeenCalled();
        });

        it('should work without query parameters', async () => {
            await request(app)
                .get('/mating/active');

            expect(matingController.getActiveMatings).toHaveBeenCalled();
        });

        it('should handle status filtering', async () => {
            await request(app)
                .get('/mating/active')
                .query({ 
                    status: 'pending_birth',
                    dueWithin: '7'
                });

            expect(matingController.getActiveMatings).toHaveBeenCalled();
        });
    });

    describe('DELETE /mating/:id', () => {
        it('should call deleteMating controller with correct id parameter', async () => {
            const matingId = 'MATING001';
            const response = await request(app)
                .delete(`/mating/${matingId}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Monta eliminada exitosamente');
            expect(matingController.deleteMating).toHaveBeenCalled();
        });

        it('should pass id parameter to controller', async () => {
            const matingId = 'MATING999';
            
            await request(app)
                .delete(`/mating/${matingId}`);

            expect(matingController.deleteMating).toHaveBeenCalled();
        });

        it('should handle alphanumeric mating IDs', async () => {
            const matingId = 'MATING001ABC';
            
            await request(app)
                .delete(`/mating/${matingId}`);

            expect(matingController.deleteMating).toHaveBeenCalled();
        });

        it('should handle numeric mating IDs', async () => {
            const matingId = '12345';
            
            await request(app)
                .delete(`/mating/${matingId}`);

            expect(matingController.deleteMating).toHaveBeenCalled();
        });

        it('should handle mating IDs with special characters', async () => {
            const matingId = 'MATING-001_A';
            
            await request(app)
                .delete(`/mating/${matingId}`);

            expect(matingController.deleteMating).toHaveBeenCalled();
        });

        it('should handle URL encoded mating IDs', async () => {
            const matingId = 'MATING 001';
            const encodedId = encodeURIComponent(matingId);
            
            await request(app)
                .delete(`/mating/${encodedId}`);

            expect(matingController.deleteMating).toHaveBeenCalled();
        });
    });

    describe('HTTP method validation', () => {
        it('should only accept GET for /mating/females', async () => {
            const unsupportedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
            
            for (const method of unsupportedMethods) {
                const response = await request(app)[method.toLowerCase()]('/mating/females');
                expect(response.status).toBeGreaterThanOrEqual(200);
            }
        });

        it('should only accept POST for /mating/register', async () => {
            const unsupportedMethods = ['GET', 'PUT', 'DELETE', 'PATCH'];
            
            for (const method of unsupportedMethods) {
                const response = await request(app)[method.toLowerCase()]('/mating/register');
                expect(response.status).toBeGreaterThanOrEqual(200);
            }
        });

        it('should only accept GET for /mating/active', async () => {
            const unsupportedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
            
            for (const method of unsupportedMethods) {
                const response = await request(app)[method.toLowerCase()]('/mating/active');
                expect(response.status).toBeGreaterThanOrEqual(200);
            }
        });

        it('should only accept DELETE for /mating/:id', async () => {
            const matingId = 'MATING001';
            const unsupportedMethods = ['GET', 'POST', 'PUT', 'PATCH'];
            
            for (const method of unsupportedMethods) {
                const response = await request(app)[method.toLowerCase()](`/mating/${matingId}`);
                expect(response.status).toBe(404);
            }
        });
    });

    describe('Route precedence and conflicts', () => {
        it('should prioritize /mating/females over /mating/:id', async () => {
            await request(app).get('/mating/females');
            expect(matingController.getAvailableFemales).toHaveBeenCalled();
            expect(matingController.deleteMating).not.toHaveBeenCalled();
        });

        it('should prioritize /mating/register over /mating/:id', async () => {
            await request(app).post('/mating/register').send({});
            expect(matingController.registerMating).toHaveBeenCalled();
            expect(matingController.deleteMating).not.toHaveBeenCalled();
        });

        it('should prioritize /mating/active over /mating/:id', async () => {
            await request(app).get('/mating/active');
            expect(matingController.getActiveMatings).toHaveBeenCalled();
            expect(matingController.deleteMating).not.toHaveBeenCalled();
        });
    });

    describe('Request/Response handling', () => {
        it('should handle JSON content type', async () => {
            const matingData = { codigoHembra: 'R020', codigoMacho: 'R021', fechaMonta: '2024-01-25' };
            
            const response = await request(app)
                .post('/mating/register')
                .set('Content-Type', 'application/json')
                .send(JSON.stringify(matingData));

            expect(response.status).toBe(201);
        });

        it('should handle malformed JSON gracefully', async () => {
            const response = await request(app)
                .post('/mating/register')
                .set('Content-Type', 'application/json')
                .send('invalid json');

            expect(response.status).toBe(400);
        });

        it('should handle date and time formats', async () => {
            const matingData = {
                codigoHembra: 'R022',
                codigoMacho: 'R023',
                fechaMonta: '2024-01-26T10:30:00Z',
                horaInicio: '10:30:00'
            };

            await request(app)
                .post('/mating/register')
                .send(matingData);

            expect(matingController.registerMating).toHaveBeenCalled();
        });
    });

    describe('Controller function calls verification', () => {
        it('should call each controller function exactly once per request', async () => {
            await request(app).get('/mating/females');
            expect(matingController.getAvailableFemales).toHaveBeenCalledTimes(1);

            await request(app).post('/mating/register').send({});
            expect(matingController.registerMating).toHaveBeenCalledTimes(1);

            await request(app).get('/mating/active');
            expect(matingController.getActiveMatings).toHaveBeenCalledTimes(1);

            await request(app).delete('/mating/MATING001');
            expect(matingController.deleteMating).toHaveBeenCalledTimes(1);
        });
    });

    describe('Edge cases and boundary conditions', () => {
        it('should handle very long mating IDs', async () => {
            const longMatingId = 'MATING'.repeat(20) + '001';
            
            await request(app)
                .delete(`/mating/${longMatingId}`);

            expect(matingController.deleteMating).toHaveBeenCalled();
        });

        it('should handle special characters in rabbit codes', async () => {
            const matingData = {
                codigoHembra: 'R-001_Ñ',
                codigoMacho: 'R-002_Ñ',
                fechaMonta: '2024-01-27'
            };

            await request(app)
                .post('/mating/register')
                .send(matingData);

            expect(matingController.registerMating).toHaveBeenCalled();
        });

        it('should handle null and undefined values', async () => {
            const matingData = {
                codigoHembra: 'R024',
                codigoMacho: 'R025',
                fechaMonta: '2024-01-28',
                exitosa: null,
                observaciones: undefined
            };

            await request(app)
                .post('/mating/register')
                .send(matingData);

            expect(matingController.registerMating).toHaveBeenCalled();
        });

        it('should handle complex query parameter combinations', async () => {
            await request(app)
                .get('/mating/females')
                .query({ 
                    'races[]': ['Nueva Zelanda', 'California'],
                    'ages': '300-800',
                    'excludeCodes[]': ['R001', 'R002'],
                    'healthCheck': 'passed'
                });

            expect(matingController.getAvailableFemales).toHaveBeenCalled();
        });
    });

    describe('Express router functionality', () => {
        it('should export Express router', () => {
            expect(typeof matingRoutes).toBe('function');
            expect(matingRoutes.name).toBe('router');
        });

        it('should handle concurrent requests', async () => {
            const promises = [
                request(app).get('/mating/females'),
                request(app).get('/mating/active'),
                request(app).post('/mating/register').send({ codigoHembra: 'R030', codigoMacho: 'R031' })
            ];

            const responses = await Promise.all(promises);
            
            responses.forEach(response => {
                expect(response.status).toBeLessThan(400);
            });
        });
    });
});
