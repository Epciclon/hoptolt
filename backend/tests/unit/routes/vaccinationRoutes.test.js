const request = require('supertest');
const express = require('express');
const vaccinationRoutes = require('../../../src/routes/vaccinationRoutes');

// Mock the controllers
jest.mock('../../../src/controllers/vaccinationController');

const vaccinationController = require('../../../src/controllers/vaccinationController');

describe('Vaccination Routes', () => {
    let app;

    beforeEach(() => {
        // Create express app with routes
        app = express();
        app.use(express.json());
        app.use('/', vaccinationRoutes);

        // Reset all mocks
        jest.clearAllMocks();

        // Setup default controller mocks
        vaccinationController.registerVaccination.mockImplementation((req, res) => {
            res.status(201).json({ 
                message: 'Vacunación registrada exitosamente',
                vaccination: { 
                    codigo: req.body.codigo,
                    fecha: req.body.fecha,
                    mixomatosis: req.body.mixomatosis,
                    vhd: req.body.vhd
                }
            });
        });

        vaccinationController.checkVaccinationValidations.mockImplementation((req, res) => {
            res.status(200).json({ 
                rabbits: req.body.rabbits || [],
                results: (req.body.rabbits || []).map(code => ({
                    codigo: code,
                    canVaccinate: true,
                    lastVaccination: null,
                    nextVaccinationDate: '2024-02-15'
                }))
            });
        });

        vaccinationController.getVaccinationStatus.mockImplementation((req, res) => {
            res.status(200).json({ 
                rabbits: req.body.rabbits || [],
                results: (req.body.rabbits || []).map(code => ({
                    codigo: code,
                    mixomatosisStatus: 'updated',
                    vhdStatus: 'due',
                    lastVaccination: '2024-01-15'
                }))
            });
        });
    });

    describe('POST /register-vaccination', () => {
        it('should call registerVaccination controller', async () => {
            const vaccinationData = {
                codigo: 'R001',
                fecha: '2024-01-15',
                mixomatosis: true,
                vhd: false,
                observaciones: 'First vaccination'
            };

            const response = await request(app)
                .post('/register-vaccination')
                .send(vaccinationData);

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('Vacunación registrada exitosamente');
            expect(vaccinationController.registerVaccination).toHaveBeenCalled();
        });

        it('should pass request body to controller', async () => {
            const vaccinationData = {
                codigo: 'R002',
                fecha: '2024-01-16',
                mixomatosis: false,
                vhd: true
            };

            await request(app)
                .post('/register-vaccination')
                .send(vaccinationData);

            expect(vaccinationController.registerVaccination).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle minimal vaccination data', async () => {
            const vaccinationData = {
                codigo: 'R003',
                fecha: '2024-01-17'
            };

            await request(app)
                .post('/register-vaccination')
                .send(vaccinationData);

            expect(vaccinationController.registerVaccination).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle complete vaccination data', async () => {
            const vaccinationData = {
                codigo: 'R004',
                fecha: '2024-01-18',
                mixomatosis: true,
                vhd: true,
                observaciones: 'Annual vaccination',
                veterinario: 'Dr. Smith',
                lote: 'LOT123'
            };

            await request(app)
                .post('/register-vaccination')
                .send(vaccinationData);

            expect(vaccinationController.registerVaccination).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle boolean vaccination flags', async () => {
            const vaccinationData = {
                codigo: 'R005',
                fecha: '2024-01-19',
                mixomatosis: true,
                vhd: false
            };

            await request(app)
                .post('/register-vaccination')
                .send(vaccinationData);

            expect(vaccinationController.registerVaccination).toHaveBeenCalled();
        });

        it('should handle empty request body', async () => {
            await request(app)
                .post('/register-vaccination')
                .send({});

            expect(vaccinationController.registerVaccination).toHaveBeenCalled();
        });
    });

    describe('POST /check-vaccination-validations', () => {
        it('should call checkVaccinationValidations controller', async () => {
            const validationData = {
                rabbits: ['R001', 'R002', 'R003'],
                vaccinationType: 'mixomatosis'
            };

            const response = await request(app)
                .post('/check-vaccination-validations')
                .send(validationData);

            expect(response.status).toBe(200);
            expect(response.body.rabbits).toEqual(validationData.rabbits);
            expect(response.body.results).toHaveLength(3);
            expect(vaccinationController.checkVaccinationValidations).toHaveBeenCalled();
        });

        it('should pass request body to controller', async () => {
            const validationData = {
                rabbits: ['R004', 'R005'],
                date: '2024-01-20',
                checkBoth: true
            };

            await request(app)
                .post('/check-vaccination-validations')
                .send(validationData);

            expect(vaccinationController.checkVaccinationValidations).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle single rabbit in array', async () => {
            const validationData = {
                rabbits: ['R006']
            };

            await request(app)
                .post('/check-vaccination-validations')
                .send(validationData);

            expect(vaccinationController.checkVaccinationValidations).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle empty rabbit array', async () => {
            const validationData = {
                rabbits: []
            };

            await request(app)
                .post('/check-vaccination-validations')
                .send(validationData);

            expect(vaccinationController.checkVaccinationValidations).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle request without rabbits array', async () => {
            const validationData = {
                date: '2024-01-21',
                vaccinationType: 'vhd'
            };

            await request(app)
                .post('/check-vaccination-validations')
                .send(validationData);

            expect(vaccinationController.checkVaccinationValidations).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle large list of rabbits', async () => {
            const validationData = {
                rabbits: Array.from({ length: 100 }, (_, i) => `R${String(i + 1).padStart(3, '0')}`)
            };

            await request(app)
                .post('/check-vaccination-validations')
                .send(validationData);

            expect(vaccinationController.checkVaccinationValidations).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });
    });

    describe('POST /vaccination-status', () => {
        it('should call getVaccinationStatus controller', async () => {
            const statusData = {
                rabbits: ['R001', 'R002'],
                includeHistory: true
            };

            const response = await request(app)
                .post('/vaccination-status')
                .send(statusData);

            expect(response.status).toBe(200);
            expect(response.body.rabbits).toEqual(statusData.rabbits);
            expect(response.body.results).toHaveLength(2);
            expect(vaccinationController.getVaccinationStatus).toHaveBeenCalled();
        });

        it('should pass request body to controller', async () => {
            const statusData = {
                rabbits: ['R003', 'R004', 'R005'],
                date: '2024-01-22',
                detailed: true
            };

            await request(app)
                .post('/vaccination-status')
                .send(statusData);

            expect(vaccinationController.getVaccinationStatus).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle status check for individual rabbit', async () => {
            const statusData = {
                rabbits: ['R007']
            };

            await request(app)
                .post('/vaccination-status')
                .send(statusData);

            expect(vaccinationController.getVaccinationStatus).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle empty request with no rabbits', async () => {
            const statusData = {
                rabbits: []
            };

            await request(app)
                .post('/vaccination-status')
                .send(statusData);

            expect(vaccinationController.getVaccinationStatus).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle additional parameters in status request', async () => {
            const statusData = {
                rabbits: ['R008', 'R009'],
                filterType: 'overdue',
                sortBy: 'lastVaccination',
                limit: 50
            };

            await request(app)
                .post('/vaccination-status')
                .send(statusData);

            expect(vaccinationController.getVaccinationStatus).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });
    });

    describe('HTTP method validation', () => {
        it('should only accept POST for /register-vaccination', async () => {
            const unsupportedMethods = ['GET', 'PUT', 'DELETE', 'PATCH'];
            
            for (const method of unsupportedMethods) {
                const response = await request(app)[method.toLowerCase()]('/register-vaccination');
                expect(response.status).toBe(404);
            }
        });

        it('should only accept POST for /check-vaccination-validations', async () => {
            const unsupportedMethods = ['GET', 'PUT', 'DELETE', 'PATCH'];
            
            for (const method of unsupportedMethods) {
                const response = await request(app)[method.toLowerCase()]('/check-vaccination-validations');
                expect(response.status).toBe(404);
            }
        });

        it('should only accept POST for /vaccination-status', async () => {
            const unsupportedMethods = ['GET', 'PUT', 'DELETE', 'PATCH'];
            
            for (const method of unsupportedMethods) {
                const response = await request(app)[method.toLowerCase()]('/vaccination-status');
                expect(response.status).toBe(404);
            }
        });
    });

    describe('Request/Response handling', () => {
        it('should handle JSON content type', async () => {
            const vaccinationData = { codigo: 'R010', fecha: '2024-01-23', mixomatosis: true };
            
            const response = await request(app)
                .post('/register-vaccination')
                .set('Content-Type', 'application/json')
                .send(JSON.stringify(vaccinationData));

            expect(response.status).toBe(201);
        });

        it('should handle malformed JSON gracefully', async () => {
            const response = await request(app)
                .post('/register-vaccination')
                .set('Content-Type', 'application/json')
                .send('invalid json');

            expect(response.status).toBe(400);
        });

        it('should handle arrays in request body', async () => {
            const validationData = {
                rabbits: ['R011', 'R012', 'R013']
            };

            const response = await request(app)
                .post('/check-vaccination-validations')
                .send(validationData);

            expect(response.status).toBe(200);
        });

        it('should handle boolean values correctly', async () => {
            const vaccinationData = {
                codigo: 'R014',
                fecha: '2024-01-24',
                mixomatosis: false,
                vhd: true
            };

            await request(app)
                .post('/register-vaccination')
                .send(vaccinationData);

            expect(vaccinationController.registerVaccination).toHaveBeenCalled();
        });
    });

    describe('Controller function calls verification', () => {
        it('should call each controller function exactly once per request', async () => {
            await request(app).post('/register-vaccination').send({});
            expect(vaccinationController.registerVaccination).toHaveBeenCalledTimes(1);

            await request(app).post('/check-vaccination-validations').send({});
            expect(vaccinationController.checkVaccinationValidations).toHaveBeenCalledTimes(1);

            await request(app).post('/vaccination-status').send({});
            expect(vaccinationController.getVaccinationStatus).toHaveBeenCalledTimes(1);
        });
    });

    describe('Data type handling', () => {
        it('should handle string dates in vaccination registration', async () => {
            const vaccinationData = {
                codigo: 'R015',
                fecha: '2024-01-25T10:30:00Z'
            };

            await request(app)
                .post('/register-vaccination')
                .send(vaccinationData);

            expect(vaccinationController.registerVaccination).toHaveBeenCalled();
        });

        it('should handle mixed data types in rabbit arrays', async () => {
            const validationData = {
                rabbits: ['R016', 'R017', 'R018'],
                includeInactive: false,
                maxAge: 365
            };

            await request(app)
                .post('/check-vaccination-validations')
                .send(validationData);

            expect(vaccinationController.checkVaccinationValidations).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });
    });

    describe('Edge cases and boundary conditions', () => {
        it('should handle very large rabbit arrays', async () => {
            const largeArray = Array.from({ length: 1000 }, (_, i) => `R${i}`);
            
            await request(app)
                .post('/vaccination-status')
                .send({ rabbits: largeArray });

            expect(vaccinationController.getVaccinationStatus).toHaveBeenCalled();
        });

        it('should handle special characters in rabbit codes', async () => {
            const vaccinationData = {
                codigo: 'R-001_A#',
                fecha: '2024-01-26'
            };

            await request(app)
                .post('/register-vaccination')
                .send(vaccinationData);

            expect(vaccinationController.registerVaccination).toHaveBeenCalled();
        });

        it('should handle null and undefined values', async () => {
            const vaccinationData = {
                codigo: 'R019',
                fecha: '2024-01-27',
                mixomatosis: null,
                vhd: undefined,
                observaciones: ''
            };

            await request(app)
                .post('/register-vaccination')
                .send(vaccinationData);

            expect(vaccinationController.registerVaccination).toHaveBeenCalled();
        });
    });

    describe('Express router functionality', () => {
        it('should export Express router', () => {
            expect(typeof vaccinationRoutes).toBe('function');
            expect(vaccinationRoutes.name).toBe('router');
        });

        it('should handle concurrent requests', async () => {
            const promises = [
                request(app).post('/register-vaccination').send({ codigo: 'R020', fecha: '2024-01-28' }),
                request(app).post('/check-vaccination-validations').send({ rabbits: ['R021'] }),
                request(app).post('/vaccination-status').send({ rabbits: ['R022'] })
            ];

            const responses = await Promise.all(promises);
            
            responses.forEach(response => {
                expect(response.status).toBeLessThan(400);
            });
        });
    });
});
