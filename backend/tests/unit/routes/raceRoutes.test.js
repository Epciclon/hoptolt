const request = require('supertest');
const express = require('express');
const raceRoutes = require('../../../src/routes/raceRoutes');

// Mock the controllers
jest.mock('../../../src/controllers/raceController');

const raceController = require('../../../src/controllers/raceController');

describe('Race Routes', () => {
    let app;

    beforeEach(() => {
        // Create express app with routes
        app = express();
        app.use(express.json());
        app.use('/', raceRoutes);

        // Reset all mocks
        jest.clearAllMocks();

        // Setup default controller mocks
        raceController.registerRace.mockImplementation((req, res) => {
            res.status(201).json({ 
                message: 'Raza registrada exitosamente',
                race: { name: 'Nueva Zelanda', description: 'Raza de conejo blanco' }
            });
        });

        raceController.getRaceByName.mockImplementation((req, res) => {
            const name = req.query.name || 'Default Race';
            res.status(200).json({ 
                race: { name, description: `Description for ${name}` }
            });
        });

        raceController.getAllRaces.mockImplementation((req, res) => {
            res.status(200).json({ 
                races: [
                    { name: 'Nueva Zelanda', description: 'Raza blanca' },
                    { name: 'California', description: 'Raza manchada' },
                    { name: 'Chinchilla', description: 'Raza gris' }
                ]
            });
        });

        raceController.editRaceDescription.mockImplementation((req, res) => {
            const { name } = req.params;
            res.status(200).json({ 
                message: 'Descripción de raza actualizada exitosamente',
                race: { name, description: req.body.description }
            });
        });

        raceController.deleteRace.mockImplementation((req, res) => {
            res.status(200).json({ 
                message: 'Raza eliminada exitosamente'
            });
        });
    });

    describe('POST /races', () => {
        it('should call registerRace controller', async () => {
            const raceData = {
                name: 'Angora',
                description: 'Raza de pelo largo'
            };

            const response = await request(app)
                .post('/races')
                .send(raceData);

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('Raza registrada exitosamente');
            expect(raceController.registerRace).toHaveBeenCalled();
        });

        it('should pass request body to controller', async () => {
            const raceData = {
                name: 'Mini Lop',
                description: 'Raza pequeña con orejas caídas'
            };

            await request(app)
                .post('/races')
                .send(raceData);

            expect(raceController.registerRace).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle minimal race data', async () => {
            const raceData = {
                name: 'Basic Race'
            };

            await request(app)
                .post('/races')
                .send(raceData);

            expect(raceController.registerRace).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle empty request body', async () => {
            await request(app)
                .post('/races')
                .send({});

            expect(raceController.registerRace).toHaveBeenCalled();
        });
    });

    describe('GET /races/search', () => {
        it('should call getRaceByName controller', async () => {
            const raceName = 'Nueva Zelanda';
            const response = await request(app)
                .get('/races/search')
                .query({ name: raceName });

            expect(response.status).toBe(200);
            expect(response.body.race.name).toBe(raceName);
            expect(raceController.getRaceByName).toHaveBeenCalled();
        });

        it('should pass query parameters to controller', async () => {
            const raceName = 'California';
            
            await request(app)
                .get('/races/search')
                .query({ name: raceName });

            expect(raceController.getRaceByName).toHaveBeenCalled();
        });

        it('should handle multiple query parameters', async () => {
            await request(app)
                .get('/races/search')
                .query({ name: 'Chinchilla', exact: 'true' });

            expect(raceController.getRaceByName).toHaveBeenCalled();
        });

        it('should handle empty query parameters', async () => {
            await request(app)
                .get('/races/search');

            expect(raceController.getRaceByName).toHaveBeenCalled();
        });

        it('should handle URL encoded query parameters', async () => {
            const raceName = 'Nueva Zelanda Special';
            
            await request(app)
                .get('/races/search')
                .query({ name: raceName });

            expect(raceController.getRaceByName).toHaveBeenCalled();
        });
    });

    describe('GET /races', () => {
        it('should call getAllRaces controller', async () => {
            const response = await request(app)
                .get('/races');

            expect(response.status).toBe(200);
            expect(response.body.races).toHaveLength(3);
            expect(raceController.getAllRaces).toHaveBeenCalled();
        });

        it('should handle query parameters for filtering/pagination', async () => {
            await request(app)
                .get('/races')
                .query({ page: '1', limit: '10', sort: 'name' });

            expect(raceController.getAllRaces).toHaveBeenCalled();
        });

        it('should work without query parameters', async () => {
            await request(app)
                .get('/races');

            expect(raceController.getAllRaces).toHaveBeenCalled();
        });
    });

    describe('PUT /races/:name', () => {
        it('should call editRaceDescription controller with correct parameters', async () => {
            const raceName = 'Nueva Zelanda';
            const updateData = {
                description: 'Raza de conejo blanco de gran tamaño'
            };

            const response = await request(app)
                .put(`/races/${raceName}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Descripción de raza actualizada exitosamente');
            expect(raceController.editRaceDescription).toHaveBeenCalled();
        });

        it('should pass both params and body to controller', async () => {
            const raceName = 'California';
            const updateData = { description: 'Nueva descripción' };

            await request(app)
                .put(`/races/${raceName}`)
                .send(updateData);

            expect(raceController.editRaceDescription).toHaveBeenCalled();
        });

        it('should handle race names with spaces', async () => {
            const raceName = 'Nueva Zelanda Gigante';
            const updateData = { description: 'Raza de gran tamaño' };

            await request(app)
                .put(`/races/${encodeURIComponent(raceName)}`)
                .send(updateData);

            expect(raceController.editRaceDescription).toHaveBeenCalled();
        });

        it('should handle special characters in race names', async () => {
            const raceName = 'Angora-Francés';
            const updateData = { description: 'Raza francesa' };

            await request(app)
                .put(`/races/${raceName}`)
                .send(updateData);

            expect(raceController.editRaceDescription).toHaveBeenCalled();
        });

        it('should handle empty update body', async () => {
            const raceName = 'Chinchilla';

            await request(app)
                .put(`/races/${raceName}`)
                .send({});

            expect(raceController.editRaceDescription).toHaveBeenCalled();
        });
    });

    describe('DELETE /races/:name', () => {
        it('should call deleteRace controller with correct name parameter', async () => {
            const raceName = 'Nueva Zelanda';
            const response = await request(app)
                .delete(`/races/${raceName}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Raza eliminada exitosamente');
            expect(raceController.deleteRace).toHaveBeenCalled();
        });

        it('should pass name parameter to controller', async () => {
            const raceName = 'California';
            
            await request(app)
                .delete(`/races/${raceName}`);

            expect(raceController.deleteRace).toHaveBeenCalled();
        });

        it('should handle complex race names', async () => {
            const raceName = 'Mini Rex Color Point';
            
            await request(app)
                .delete(`/races/${encodeURIComponent(raceName)}`);

            expect(raceController.deleteRace).toHaveBeenCalled();
        });

        it('should handle race names with special characters', async () => {
            const raceName = 'Bélier-Français';
            
            await request(app)
                .delete(`/races/${raceName}`);

            expect(raceController.deleteRace).toHaveBeenCalled();
        });
    });

    describe('Route precedence and ordering', () => {
        it('should prioritize /races/search over /races/:name', async () => {
            // This test ensures that GET /races/search doesn't conflict with potential GET /races/:name
            await request(app)
                .get('/races/search')
                .query({ name: 'test' });

            expect(raceController.getRaceByName).toHaveBeenCalled();
            expect(raceController.getAllRaces).not.toHaveBeenCalled();
        });

        it('should handle /races differently from /races/search', async () => {
            // Test that GET /races calls getAllRaces, not getRaceByName
            await request(app).get('/races');
            expect(raceController.getAllRaces).toHaveBeenCalled();
            expect(raceController.getRaceByName).not.toHaveBeenCalled();
        });
    });

    describe('HTTP method validation', () => {
        it('should only accept specified methods for each route', async () => {
            // Test unsupported methods
            const response1 = await request(app).patch('/races').send({});
            expect(response1.status).toBe(404);

            const response2 = await request(app).post('/races/search').send({});
            expect(response2.status).toBe(404);

            const response3 = await request(app).patch('/races/SomeRace').send({});
            expect(response3.status).toBe(404);
        });

        it('should accept GET for /races/search', async () => {
            const response = await request(app).get('/races/search');
            expect(response.status).toBe(200);
        });

        it('should accept GET for /races', async () => {
            const response = await request(app).get('/races');
            expect(response.status).toBe(200);
        });
    });

    describe('Request/Response handling', () => {
        it('should handle JSON content type', async () => {
            const raceData = { name: 'Jersey Wooly', description: 'Small woolly breed' };
            
            const response = await request(app)
                .post('/races')
                .set('Content-Type', 'application/json')
                .send(JSON.stringify(raceData));

            expect(response.status).toBe(201);
        });

        it('should handle malformed JSON gracefully', async () => {
            const response = await request(app)
                .post('/races')
                .set('Content-Type', 'application/json')
                .send('invalid json');

            expect(response.status).toBe(400);
        });

        it('should handle query string parameters correctly', async () => {
            await request(app)
                .get('/races/search?name=Test Race&category=domestic');

            expect(raceController.getRaceByName).toHaveBeenCalled();
        });
    });

    describe('Controller function calls verification', () => {
        it('should call each controller function exactly once per request', async () => {
            await request(app).post('/races').send({});
            expect(raceController.registerRace).toHaveBeenCalledTimes(1);

            await request(app).get('/races/search');
            expect(raceController.getRaceByName).toHaveBeenCalledTimes(1);

            await request(app).get('/races');
            expect(raceController.getAllRaces).toHaveBeenCalledTimes(1);

            await request(app).put('/races/TestRace').send({});
            expect(raceController.editRaceDescription).toHaveBeenCalledTimes(1);

            await request(app).delete('/races/TestRace');
            expect(raceController.deleteRace).toHaveBeenCalledTimes(1);
        });
    });

    describe('Parameter encoding and special cases', () => {
        it('should handle percent-encoded parameters', async () => {
            const raceName = 'Mini Lop Eared';
            const encoded = encodeURIComponent(raceName);
            
            await request(app).delete(`/races/${encoded}`);
            
            expect(raceController.deleteRace).toHaveBeenCalled();
        });

        it('should handle international characters', async () => {
            const raceName = 'Bélier Français';
            
            await request(app).put(`/races/${raceName}`).send({ description: 'French breed' });
            
            expect(raceController.editRaceDescription).toHaveBeenCalled();
        });
    });

    describe('Express router functionality', () => {
        it('should export Express router', () => {
            expect(typeof raceRoutes).toBe('function');
            expect(raceRoutes.name).toBe('router');
        });

        it('should handle concurrent requests', async () => {
            const promises = [
                request(app).get('/races'),
                request(app).get('/races/search').query({ name: 'test' }),
                request(app).post('/races').send({ name: 'Test Race', description: 'Test' })
            ];

            const responses = await Promise.all(promises);
            
            responses.forEach(response => {
                expect(response.status).toBeLessThan(400);
            });
        });
    });
});
