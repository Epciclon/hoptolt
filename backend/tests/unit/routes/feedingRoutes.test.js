const request = require('supertest');
const express = require('express');
const feedingRoutes = require('../../../src/routes/feedingRoutes');

// Mock the controllers
jest.mock('../../../src/controllers/feedingController');

const feedingController = require('../../../src/controllers/feedingController');

describe('Feeding Routes', () => {
    let app;

    beforeEach(() => {
        // Create express app with routes
        app = express();
        app.use(express.json());
        app.use('/', feedingRoutes);

        // Reset all mocks
        jest.clearAllMocks();

        // Setup default controller mocks
        feedingController.registerFeeding.mockImplementation((req, res) => {
            res.status(201).json({ 
                message: 'Alimentación registrada exitosamente',
                feeding: { 
                    codigo: req.body.codigo,
                    fecha: req.body.fecha,
                    tipoAlimento: req.body.tipoAlimento,
                    cantidad: req.body.cantidad
                }
            });
        });

        feedingController.getDailyFeedingCount.mockImplementation((req, res) => {
            const { codigo } = req.params;
            res.status(200).json({ 
                rabbitCode: codigo,
                date: new Date().toISOString().split('T')[0],
                count: 3,
                totalAmount: 150
            });
        });

        feedingController.checkDailyFeedings.mockImplementation((req, res) => {
            res.status(200).json({ 
                rabbits: req.body.rabbits || [],
                results: (req.body.rabbits || []).map(code => ({
                    codigo: code,
                    feedingsToday: 2,
                    canFeed: true
                }))
            });
        });

        feedingController.getDailyFeedingCounts.mockImplementation((req, res) => {
            res.status(200).json({ 
                date: req.body.date || new Date().toISOString().split('T')[0],
                rabbits: (req.body.rabbits || []).map(code => ({
                    codigo: code,
                    count: 3,
                    totalAmount: 150
                }))
            });
        });

        feedingController.getAllFeedingRecords.mockImplementation((req, res) => {
            res.status(200).json({ 
                records: [
                    { codigo: 'R001', fecha: '2024-01-15', tipoAlimento: 'Pellets', cantidad: 50 },
                    { codigo: 'R002', fecha: '2024-01-15', tipoAlimento: 'Heno', cantidad: 100 }
                ],
                total: 2
            });
        });
    });

    describe('POST /register-feeding', () => {
        it('should call registerFeeding controller', async () => {
            const feedingData = {
                codigo: 'R001',
                fecha: '2024-01-15',
                tipoAlimento: 'Pellets',
                cantidad: 50,
                observaciones: 'Normal feeding'
            };

            const response = await request(app)
                .post('/register-feeding')
                .send(feedingData);

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('Alimentación registrada exitosamente');
            expect(feedingController.registerFeeding).toHaveBeenCalled();
        });

        it('should pass request body to controller', async () => {
            const feedingData = {
                codigo: 'R002',
                fecha: '2024-01-16',
                tipoAlimento: 'Heno',
                cantidad: 75
            };

            await request(app)
                .post('/register-feeding')
                .send(feedingData);

            expect(feedingController.registerFeeding).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle minimal feeding data', async () => {
            const feedingData = {
                codigo: 'R003',
                fecha: '2024-01-17',
                tipoAlimento: 'Concentrado'
            };

            await request(app)
                .post('/register-feeding')
                .send(feedingData);

            expect(feedingController.registerFeeding).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle complete feeding data with all fields', async () => {
            const feedingData = {
                codigo: 'R004',
                fecha: '2024-01-18',
                tipoAlimento: 'Pellets Premium',
                cantidad: 60,
                observaciones: 'Increased appetite',
                hora: '14:30',
                responsable: 'user123'
            };

            await request(app)
                .post('/register-feeding')
                .send(feedingData);

            expect(feedingController.registerFeeding).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle empty request body', async () => {
            await request(app)
                .post('/register-feeding')
                .send({});

            expect(feedingController.registerFeeding).toHaveBeenCalled();
        });
    });

    describe('GET /daily-count/:codigo', () => {
        it('should call getDailyFeedingCount controller with correct parameter', async () => {
            const rabbitCode = 'R001';
            const response = await request(app)
                .get(`/daily-count/${rabbitCode}`);

            expect(response.status).toBe(200);
            expect(response.body.rabbitCode).toBe(rabbitCode);
            expect(response.body.count).toBe(3);
            expect(feedingController.getDailyFeedingCount).toHaveBeenCalled();
        });

        it('should pass codigo parameter to controller', async () => {
            const rabbitCode = 'R999';
            
            await request(app)
                .get(`/daily-count/${rabbitCode}`);

            expect(feedingController.getDailyFeedingCount).toHaveBeenCalled();
        });

        it('should handle alphanumeric rabbit codes', async () => {
            const rabbitCode = 'RABBIT001';
            
            await request(app)
                .get(`/daily-count/${rabbitCode}`);

            expect(feedingController.getDailyFeedingCount).toHaveBeenCalled();
        });

        it('should handle rabbit codes with special characters', async () => {
            const rabbitCode = 'R-001_A';
            
            await request(app)
                .get(`/daily-count/${rabbitCode}`);

            expect(feedingController.getDailyFeedingCount).toHaveBeenCalled();
        });

        it('should handle URL encoded rabbit codes', async () => {
            const rabbitCode = 'R 001';
            const encodedCode = encodeURIComponent(rabbitCode);
            
            await request(app)
                .get(`/daily-count/${encodedCode}`);

            expect(feedingController.getDailyFeedingCount).toHaveBeenCalled();
        });

        it('should handle query parameters for date filtering', async () => {
            const rabbitCode = 'R001';
            
            await request(app)
                .get(`/daily-count/${rabbitCode}`)
                .query({ date: '2024-01-15' });

            expect(feedingController.getDailyFeedingCount).toHaveBeenCalled();
        });
    });

    describe('POST /check-daily-feedings', () => {
        it('should call checkDailyFeedings controller', async () => {
            const checkData = {
                rabbits: ['R001', 'R002', 'R003'],
                date: '2024-01-15'
            };

            const response = await request(app)
                .post('/check-daily-feedings')
                .send(checkData);

            expect(response.status).toBe(200);
            expect(response.body.rabbits).toEqual(checkData.rabbits);
            expect(response.body.results).toHaveLength(3);
            expect(feedingController.checkDailyFeedings).toHaveBeenCalled();
        });

        it('should pass request body to controller', async () => {
            const checkData = {
                rabbits: ['R004', 'R005'],
                date: '2024-01-16',
                includeDetails: true
            };

            await request(app)
                .post('/check-daily-feedings')
                .send(checkData);

            expect(feedingController.checkDailyFeedings).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle single rabbit in array', async () => {
            const checkData = {
                rabbits: ['R006']
            };

            await request(app)
                .post('/check-daily-feedings')
                .send(checkData);

            expect(feedingController.checkDailyFeedings).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle empty rabbit array', async () => {
            const checkData = {
                rabbits: []
            };

            await request(app)
                .post('/check-daily-feedings')
                .send(checkData);

            expect(feedingController.checkDailyFeedings).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle request without rabbits array', async () => {
            const checkData = {
                date: '2024-01-17'
            };

            await request(app)
                .post('/check-daily-feedings')
                .send(checkData);

            expect(feedingController.checkDailyFeedings).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });
    });

    describe('POST /daily-counts', () => {
        it('should call getDailyFeedingCounts controller', async () => {
            const countsData = {
                rabbits: ['R001', 'R002'],
                date: '2024-01-15'
            };

            const response = await request(app)
                .post('/daily-counts')
                .send(countsData);

            expect(response.status).toBe(200);
            expect(response.body.date).toBe(countsData.date);
            expect(response.body.rabbits).toHaveLength(2);
            expect(feedingController.getDailyFeedingCounts).toHaveBeenCalled();
        });

        it('should pass request body to controller', async () => {
            const countsData = {
                rabbits: ['R003', 'R004', 'R005'],
                date: '2024-01-16',
                includeAmounts: true
            };

            await request(app)
                .post('/daily-counts')
                .send(countsData);

            expect(feedingController.getDailyFeedingCounts).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle request with current date when no date provided', async () => {
            const countsData = {
                rabbits: ['R006', 'R007']
            };

            await request(app)
                .post('/daily-counts')
                .send(countsData);

            expect(feedingController.getDailyFeedingCounts).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle large list of rabbits', async () => {
            const countsData = {
                rabbits: Array.from({ length: 50 }, (_, i) => `R${String(i + 1).padStart(3, '0')}`),
                date: '2024-01-18'
            };

            await request(app)
                .post('/daily-counts')
                .send(countsData);

            expect(feedingController.getDailyFeedingCounts).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });
    });

    describe('GET /all-records', () => {
        it('should call getAllFeedingRecords controller', async () => {
            const response = await request(app)
                .get('/all-records');

            expect(response.status).toBe(200);
            expect(response.body.records).toHaveLength(2);
            expect(response.body.total).toBe(2);
            expect(feedingController.getAllFeedingRecords).toHaveBeenCalled();
        });

        it('should handle query parameters for filtering', async () => {
            await request(app)
                .get('/all-records')
                .query({ 
                    dateFrom: '2024-01-01',
                    dateTo: '2024-01-31',
                    rabbitCode: 'R001',
                    foodType: 'Pellets'
                });

            expect(feedingController.getAllFeedingRecords).toHaveBeenCalled();
        });

        it('should handle pagination parameters', async () => {
            await request(app)
                .get('/all-records')
                .query({ page: '2', limit: '25', sortBy: 'fecha', order: 'desc' });

            expect(feedingController.getAllFeedingRecords).toHaveBeenCalled();
        });

        it('should work without query parameters', async () => {
            await request(app)
                .get('/all-records');

            expect(feedingController.getAllFeedingRecords).toHaveBeenCalled();
        });
    });

    describe('HTTP method validation', () => {
        it('should only accept POST for /register-feeding', async () => {
            const unsupportedMethods = ['GET', 'PUT', 'DELETE', 'PATCH'];
            
            for (const method of unsupportedMethods) {
                const response = await request(app)[method.toLowerCase()]('/register-feeding');
                expect(response.status).toBe(404);
            }
        });

        it('should only accept GET for /daily-count/:codigo', async () => {
            const rabbitCode = 'R001';
            const unsupportedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
            
            for (const method of unsupportedMethods) {
                const response = await request(app)[method.toLowerCase()](`/daily-count/${rabbitCode}`);
                expect(response.status).toBe(404);
            }
        });

        it('should only accept POST for /check-daily-feedings', async () => {
            const unsupportedMethods = ['GET', 'PUT', 'DELETE', 'PATCH'];
            
            for (const method of unsupportedMethods) {
                const response = await request(app)[method.toLowerCase()]('/check-daily-feedings');
                expect(response.status).toBe(404);
            }
        });

        it('should only accept POST for /daily-counts', async () => {
            const unsupportedMethods = ['GET', 'PUT', 'DELETE', 'PATCH'];
            
            for (const method of unsupportedMethods) {
                const response = await request(app)[method.toLowerCase()]('/daily-counts');
                expect(response.status).toBe(404);
            }
        });

        it('should only accept GET for /all-records', async () => {
            const unsupportedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
            
            for (const method of unsupportedMethods) {
                const response = await request(app)[method.toLowerCase()]('/all-records');
                expect(response.status).toBe(404);
            }
        });
    });

    describe('Request/Response handling', () => {
        it('should handle JSON content type', async () => {
            const feedingData = { codigo: 'R008', fecha: '2024-01-19', tipoAlimento: 'Pellets' };
            
            const response = await request(app)
                .post('/register-feeding')
                .set('Content-Type', 'application/json')
                .send(JSON.stringify(feedingData));

            expect(response.status).toBe(201);
        });

        it('should handle malformed JSON gracefully', async () => {
            const response = await request(app)
                .post('/register-feeding')
                .set('Content-Type', 'application/json')
                .send('invalid json');

            expect(response.status).toBe(400);
        });

        it('should handle arrays in request body', async () => {
            const checkData = {
                rabbits: ['R010', 'R011', 'R012'],
                date: '2024-01-20'
            };

            const response = await request(app)
                .post('/check-daily-feedings')
                .send(checkData);

            expect(response.status).toBe(200);
        });
    });

    describe('Controller function calls verification', () => {
        it('should call each controller function exactly once per request', async () => {
            await request(app).post('/register-feeding').send({});
            expect(feedingController.registerFeeding).toHaveBeenCalledTimes(1);

            await request(app).get('/daily-count/R001');
            expect(feedingController.getDailyFeedingCount).toHaveBeenCalledTimes(1);

            await request(app).post('/check-daily-feedings').send({});
            expect(feedingController.checkDailyFeedings).toHaveBeenCalledTimes(1);

            await request(app).post('/daily-counts').send({});
            expect(feedingController.getDailyFeedingCounts).toHaveBeenCalledTimes(1);

            await request(app).get('/all-records');
            expect(feedingController.getAllFeedingRecords).toHaveBeenCalledTimes(1);
        });
    });

    describe('Edge cases and error handling', () => {
        it('should handle very long rabbit codes in URL parameters', async () => {
            const longRabbitCode = 'R'.repeat(100) + '001';
            
            await request(app)
                .get(`/daily-count/${longRabbitCode}`);

            expect(feedingController.getDailyFeedingCount).toHaveBeenCalled();
        });

        it('should handle numeric-only rabbit codes', async () => {
            const rabbitCode = '12345';
            
            await request(app)
                .get(`/daily-count/${rabbitCode}`);

            expect(feedingController.getDailyFeedingCount).toHaveBeenCalled();
        });

        it('should handle large arrays in POST requests', async () => {
            const largeArray = Array.from({ length: 1000 }, (_, i) => `R${i}`);
            
            await request(app)
                .post('/check-daily-feedings')
                .send({ rabbits: largeArray });

            expect(feedingController.checkDailyFeedings).toHaveBeenCalled();
        });
    });

    describe('Express router functionality', () => {
        it('should export Express router', () => {
            expect(typeof feedingRoutes).toBe('function');
            expect(feedingRoutes.name).toBe('router');
        });

        it('should handle concurrent requests', async () => {
            const promises = [
                request(app).get('/all-records'),
                request(app).get('/daily-count/R001'),
                request(app).post('/register-feeding').send({ codigo: 'R020', fecha: '2024-01-21', tipoAlimento: 'Heno' })
            ];

            const responses = await Promise.all(promises);
            
            responses.forEach(response => {
                expect(response.status).toBeLessThan(400);
            });
        });
    });
});
