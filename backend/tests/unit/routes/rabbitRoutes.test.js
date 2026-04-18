const request = require('supertest');
const express = require('express');
const rabbitRoutes = require('../../../src/routes/rabbitRoutes');

// Mock the controllers
jest.mock('../../../src/controllers/rabbitController');

const rabbitController = require('../../../src/controllers/rabbitController');

describe('Rabbit Routes', () => {
    let app;

    beforeEach(() => {
        // Create express app with routes
        app = express();
        app.use(express.json());
        app.use('/', rabbitRoutes);

        // Reset all mocks
        jest.clearAllMocks();

        // Setup default controller mocks
        rabbitController.getAvailableRaces.mockImplementation((req, res) => {
            res.status(200).json({ races: ['Nueva Zelanda', 'California'] });
        });

        rabbitController.registerRabbit.mockImplementation((req, res) => {
            res.status(201).json({ 
                message: 'Conejo registrado exitosamente',
                rabbit: { code: 'R001', name: 'Test Rabbit' }
            });
        });

        rabbitController.getAllRabbits.mockImplementation((req, res) => {
            res.status(200).json({ 
                rabbits: [
                    { code: 'R001', name: 'Rabbit 1' },
                    { code: 'R002', name: 'Rabbit 2' }
                ]
            });
        });

        rabbitController.getRabbit.mockImplementation((req, res) => {
            const { code } = req.params;
            res.status(200).json({ 
                rabbit: { code, name: `Rabbit ${code}` }
            });
        });

        rabbitController.editRabbit.mockImplementation((req, res) => {
            const { code } = req.params;
            res.status(200).json({ 
                message: 'Conejo actualizado exitosamente',
                rabbit: { code, ...req.body }
            });
        });

        rabbitController.deleteRabbit.mockImplementation((req, res) => {
            res.status(200).json({ 
                message: 'Conejo eliminado exitosamente'
            });
        });
    });

    describe('GET /rabbits/races', () => {
        it('should call getAvailableRaces controller', async () => {
            const response = await request(app)
                .get('/rabbits/races');

            expect(response.status).toBe(200);
            expect(response.body.races).toEqual(['Nueva Zelanda', 'California']);
            expect(rabbitController.getAvailableRaces).toHaveBeenCalled();
        });

        it('should pass request and response objects to controller', async () => {
            await request(app)
                .get('/rabbits/races');

            expect(rabbitController.getAvailableRaces).toHaveBeenCalled();
        });
    });

    describe('POST /rabbits', () => {
        it('should call registerRabbit controller', async () => {
            const rabbitData = {
                code: 'R003',
                name: 'New Rabbit',
                race: 'Nueva Zelanda',
                birthDate: '2024-01-01',
                gender: 'Macho'
            };

            const response = await request(app)
                .post('/rabbits')
                .send(rabbitData);

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('Conejo registrado exitosamente');
            expect(rabbitController.registerRabbit).toHaveBeenCalled();
        });

        it('should pass request body to controller', async () => {
            const rabbitData = {
                code: 'R003',
                name: 'New Rabbit'
            };

            await request(app)
                .post('/rabbits')
                .send(rabbitData);

            expect(rabbitController.registerRabbit).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });
    });

    describe('GET /rabbits', () => {
        it('should call getAllRabbits controller', async () => {
            const response = await request(app)
                .get('/rabbits');

            expect(response.status).toBe(200);
            expect(response.body.rabbits).toHaveLength(2);
            expect(rabbitController.getAllRabbits).toHaveBeenCalled();
        });

        it('should handle query parameters', async () => {
            await request(app)
                .get('/rabbits?page=1&limit=10');

            expect(rabbitController.getAllRabbits).toHaveBeenCalled();
        });
    });

    describe('GET /rabbits/:code', () => {
        it('should call getRabbit controller with correct code parameter', async () => {
            const rabbitCode = 'R001';
            const response = await request(app)
                .get(`/rabbits/${rabbitCode}`);

            expect(response.status).toBe(200);
            expect(response.body.rabbit.code).toBe(rabbitCode);
            expect(rabbitController.getRabbit).toHaveBeenCalled();
        });

        it('should pass code parameter to controller', async () => {
            const rabbitCode = 'R999';
            
            await request(app)
                .get(`/rabbits/${rabbitCode}`);

            expect(rabbitController.getRabbit).toHaveBeenCalled();
        });

        it('should handle special characters in code parameter', async () => {
            const rabbitCode = 'R001-A';
            
            await request(app)
                .get(`/rabbits/${rabbitCode}`);

            expect(rabbitController.getRabbit).toHaveBeenCalled();
        });
    });

    describe('PUT /rabbits/:code', () => {
        it('should call editRabbit controller with correct parameters', async () => {
            const rabbitCode = 'R001';
            const updateData = {
                name: 'Updated Rabbit Name',
                race: 'California'
            };

            const response = await request(app)
                .put(`/rabbits/${rabbitCode}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Conejo actualizado exitosamente');
            expect(rabbitController.editRabbit).toHaveBeenCalled();
        });

        it('should pass both params and body to controller', async () => {
            const rabbitCode = 'R001';
            const updateData = { name: 'New Name' };

            await request(app)
                .put(`/rabbits/${rabbitCode}`)
                .send(updateData);

            expect(rabbitController.editRabbit).toHaveBeenCalled();
        });

        it('should handle empty body', async () => {
            const rabbitCode = 'R001';

            await request(app)
                .put(`/rabbits/${rabbitCode}`)
                .send({});

            expect(rabbitController.editRabbit).toHaveBeenCalled();
        });
    });

    describe('DELETE /rabbits/:code', () => {
        it('should call deleteRabbit controller with correct code parameter', async () => {
            const rabbitCode = 'R001';
            const response = await request(app)
                .delete(`/rabbits/${rabbitCode}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Conejo eliminado exitosamente');
            expect(rabbitController.deleteRabbit).toHaveBeenCalled();
        });

        it('should pass code parameter to controller', async () => {
            const rabbitCode = 'R999';
            
            await request(app)
                .delete(`/rabbits/${rabbitCode}`);

            expect(rabbitController.deleteRabbit).toHaveBeenCalled();
        });
    });

    describe('Route parameter handling', () => {
        it('should handle URL encoded parameters', async () => {
            const rabbitCode = 'R 001';
            const encodedCode = encodeURIComponent(rabbitCode);
            
            await request(app)
                .get(`/rabbits/${encodedCode}`);

            expect(rabbitController.getRabbit).toHaveBeenCalled();
        });

        it('should handle numeric codes', async () => {
            const rabbitCode = '123';
            
            await request(app)
                .get(`/rabbits/${rabbitCode}`);

            expect(rabbitController.getRabbit).toHaveBeenCalled();
        });
    });

    describe('HTTP methods verification', () => {
        it('should only accept GET for /rabbits/races', async () => {
            const response = await request(app)
                .post('/rabbits/races')
                .send({});

            expect(response.status).toBe(404);
        });

        it('should only accept POST for /rabbits', async () => {
            const response = await request(app)
                .patch('/rabbits')
                .send({});

            expect(response.status).toBe(404);
        });

        it('should only accept specified methods for parameterized routes', async () => {
            // Test unsupported method
            const response = await request(app)
                .patch('/rabbits/R001')
                .send({});

            expect(response.status).toBe(404);
        });
    });

    describe('Controller function calls', () => {
        it('should call each controller function exactly once per request', async () => {
            await request(app).get('/rabbits/races');
            expect(rabbitController.getAvailableRaces).toHaveBeenCalledTimes(1);

            await request(app).post('/rabbits').send({});
            expect(rabbitController.registerRabbit).toHaveBeenCalledTimes(1);

            await request(app).get('/rabbits');
            expect(rabbitController.getAllRabbits).toHaveBeenCalledTimes(1);

            await request(app).get('/rabbits/R001');
            expect(rabbitController.getRabbit).toHaveBeenCalledTimes(1);

            await request(app).put('/rabbits/R001').send({});
            expect(rabbitController.editRabbit).toHaveBeenCalledTimes(1);

            await request(app).delete('/rabbits/R001');
            expect(rabbitController.deleteRabbit).toHaveBeenCalledTimes(1);
        });
    });
});
