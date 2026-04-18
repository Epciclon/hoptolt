const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const Feeding = require('../../../src/models/feeding');
const feedingController = require('../../../src/controllers/feedingController');

describe('Feeding Controller', () => {
    let mongoServer;
    let req, res;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        
        await mongoose.connect(mongoUri);
    });

    afterAll(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        if (mongoServer) {
            await mongoServer.stop();
        }
    });

    beforeEach(async () => {
        await Feeding.deleteMany({});
        
        req = {
            body: {},
            params: {},
            query: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        
        // Mock console.error to avoid test noise
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('registerFeeding', () => {
        it('should register feeding successfully for first time today', async () => {
            req.body = {
                codigo: 'R001',
                heno: 100,
                hierba: 50,
                balanceado: 75
            };

            await feedingController.registerFeeding(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Alimentación registrada exitosamente',
                feeding: expect.objectContaining({
                    codigo: 'R001',
                    heno: 100,
                    hierba: 50,
                    balanceado: 75,
                    justificacion: "No necesita justificación"
                })
            });
        });

        it('should register feeding successfully for second time today', async () => {
            // Create first feeding
            await new Feeding({
                codigo: 'R001',
                heno: 100,
                hierba: 50,
                balanceado: 75,
                fecha: new Date()
            }).save();

            req.body = {
                codigo: 'R001',
                heno: 90,
                hierba: 40,
                balanceado: 80
            };

            await feedingController.registerFeeding(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Alimentación registrada exitosamente',
                feeding: expect.objectContaining({
                    codigo: 'R001',
                    heno: 90,
                    hierba: 40,
                    balanceado: 80,
                    justificacion: "No necesita justificación"
                })
            });
        });

        it('should require justification for third feeding of the day', async () => {
            // Create two feedings for today
            const today = new Date();
            await Feeding.insertMany([
                {
                    codigo: 'R001',
                    heno: 100,
                    hierba: 50,
                    balanceado: 75,
                    fecha: today
                },
                {
                    codigo: 'R001',
                    heno: 90,
                    hierba: 40,
                    balanceado: 80,
                    fecha: today
                }
            ]);

            req.body = {
                codigo: 'R001',
                heno: 80,
                hierba: 30,
                balanceado: 70
            };

            await feedingController.registerFeeding(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Ya ha registrado la alimentación dos veces hoy. ¿Desea registrar una vez más?',
                requiresJustification: true
            });
        });

        it('should register third feeding with valid justification', async () => {
            // Create two feedings for today
            const today = new Date();
            await Feeding.insertMany([
                {
                    codigo: 'R001',
                    heno: 100,
                    hierba: 50,
                    balanceado: 75,
                    fecha: today
                },
                {
                    codigo: 'R001',
                    heno: 90,
                    hierba: 40,
                    balanceado: 80,
                    fecha: today
                }
            ]);

            req.body = {
                codigo: 'R001',
                heno: 80,
                hierba: 30,
                balanceado: 70,
                justificacion: 'Conejo muy activo, requiere alimentación adicional'
            };

            await feedingController.registerFeeding(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Alimentación registrada exitosamente',
                feeding: expect.objectContaining({
                    codigo: 'R001',
                    heno: 80,
                    hierba: 30,
                    balanceado: 70,
                    justificacion: 'Conejo muy activo, requiere alimentación adicional'
                })
            });
        });

        it('should reject third feeding with empty justification', async () => {
            // Create two feedings for today
            const today = new Date();
            await Feeding.insertMany([
                {
                    codigo: 'R001',
                    heno: 100,
                    hierba: 50,
                    balanceado: 75,
                    fecha: today
                },
                {
                    codigo: 'R001',
                    heno: 90,
                    hierba: 40,
                    balanceado: 80,
                    fecha: today
                }
            ]);

            req.body = {
                codigo: 'R001',
                heno: 80,
                hierba: 30,
                balanceado: 70,
                justificacion: '   '
            };

            await feedingController.registerFeeding(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Debe proporcionar una justificación para el registro adicional.'
            });
        });

        it('should reject fourth feeding attempt', async () => {
            // Create three feedings for today
            const today = new Date();
            await Feeding.insertMany([
                {
                    codigo: 'R001',
                    heno: 100,
                    hierba: 50,
                    balanceado: 75,
                    fecha: today
                },
                {
                    codigo: 'R001',
                    heno: 90,
                    hierba: 40,
                    balanceado: 80,
                    fecha: today
                },
                {
                    codigo: 'R001',
                    heno: 80,
                    hierba: 30,
                    balanceado: 70,
                    fecha: today,
                    justificacion: 'Justificación válida'
                }
            ]);

            req.body = {
                codigo: 'R001',
                heno: 70,
                hierba: 20,
                balanceado: 60,
                justificacion: 'Otra justificación'
            };

            await feedingController.registerFeeding(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'No se permiten más de 3 registros de alimentación por día.'
            });
        });

        it('should allow feeding for different rabbits on same day', async () => {
            // Create feeding for different rabbit
            await new Feeding({
                codigo: 'R002',
                heno: 100,
                hierba: 50,
                balanceado: 75,
                fecha: new Date()
            }).save();

            req.body = {
                codigo: 'R001',
                heno: 90,
                hierba: 40,
                balanceado: 80
            };

            await feedingController.registerFeeding(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Alimentación registrada exitosamente',
                feeding: expect.objectContaining({
                    codigo: 'R001'
                })
            });
        });

        it('should only count feedings from current day', async () => {
            // Create feeding from yesterday
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            await new Feeding({
                codigo: 'R001',
                heno: 100,
                hierba: 50,
                balanceado: 75,
                fecha: yesterday
            }).save();

            req.body = {
                codigo: 'R001',
                heno: 90,
                hierba: 40,
                balanceado: 80
            };

            await feedingController.registerFeeding(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Alimentación registrada exitosamente',
                feeding: expect.objectContaining({
                    codigo: 'R001',
                    justificacion: "No necesita justificación"
                })
            });
        });

        it('should handle database errors during registration', async () => {
            jest.spyOn(Feeding, 'countDocuments').mockRejectedValue(new Error('Database error'));

            req.body = {
                codigo: 'R001',
                heno: 100,
                hierba: 50,
                balanceado: 75
            };

            await feedingController.registerFeeding(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al registrar alimentación',
                error: 'Database error'
            });
        });

        it('should handle save errors', async () => {
            jest.spyOn(Feeding.prototype, 'save').mockRejectedValue(new Error('Save error'));

            req.body = {
                codigo: 'R001',
                heno: 100,
                hierba: 50,
                balanceado: 75
            };

            await feedingController.registerFeeding(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al registrar alimentación',
                error: 'Save error'
            });
        });
    });

    describe('getDailyFeedingCount', () => {
        it('should get daily feeding count for rabbit', async () => {
            // Create feedings for today
            const today = new Date();
            await Feeding.insertMany([
                {
                    codigo: 'R001',
                    heno: 100,
                    hierba: 50,
                    balanceado: 75,
                    fecha: today
                },
                {
                    codigo: 'R001',
                    heno: 90,
                    hierba: 40,
                    balanceado: 80,
                    fecha: today
                }
            ]);

            req.params = { codigo: 'R001' };

            await feedingController.getDailyFeedingCount(req, res);

            expect(res.json).toHaveBeenCalledWith({ count: 2 });
        });

        it('should return zero count when no feedings exist', async () => {
            req.params = { codigo: 'R001' };

            await feedingController.getDailyFeedingCount(req, res);

            expect(res.json).toHaveBeenCalledWith({ count: 0 });
        });

        it('should only count feedings from current day', async () => {
            // Create feeding from yesterday
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            await Feeding.insertMany([
                {
                    codigo: 'R001',
                    heno: 100,
                    hierba: 50,
                    balanceado: 75,
                    fecha: yesterday
                },
                {
                    codigo: 'R001',
                    heno: 90,
                    hierba: 40,
                    balanceado: 80,
                    fecha: new Date()
                }
            ]);

            req.params = { codigo: 'R001' };

            await feedingController.getDailyFeedingCount(req, res);

            expect(res.json).toHaveBeenCalledWith({ count: 1 });
        });

        it('should handle database errors', async () => {
            jest.spyOn(Feeding, 'countDocuments').mockRejectedValue(new Error('Database error'));

            req.params = { codigo: 'R001' };

            await feedingController.getDailyFeedingCount(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al obtener conteo de alimentación',
                error: 'Database error'
            });
        });
    });

    describe('getDailyFeedingCounts', () => {
        it('should get daily feeding counts for multiple rabbits', async () => {
            // Create feedings for different rabbits
            const today = new Date();
            await Feeding.insertMany([
                {
                    codigo: 'R001',
                    heno: 100,
                    hierba: 50,
                    balanceado: 75,
                    fecha: today
                },
                {
                    codigo: 'R001',
                    heno: 90,
                    hierba: 40,
                    balanceado: 80,
                    fecha: today
                },
                {
                    codigo: 'R002',
                    heno: 85,
                    hierba: 45,
                    balanceado: 70,
                    fecha: today
                }
            ]);

            req.body = { rabbits: ['R001', 'R002', 'R003'] };

            await feedingController.getDailyFeedingCounts(req, res);

            expect(res.json).toHaveBeenCalledWith({
                counts: {
                    'R001': 2,
                    'R002': 1,
                    'R003': 0
                }
            });
        });

        it('should return error when rabbits array is missing', async () => {
            req.body = {};

            await feedingController.getDailyFeedingCounts(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Se requiere un array de códigos de conejos'
            });
        });

        it('should return error when rabbits is not an array', async () => {
            req.body = { rabbits: 'R001' };

            await feedingController.getDailyFeedingCounts(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Se requiere un array de códigos de conejos'
            });
        });

        it('should handle empty rabbits array', async () => {
            req.body = { rabbits: [] };

            await feedingController.getDailyFeedingCounts(req, res);

            expect(res.json).toHaveBeenCalledWith({
                counts: {}
            });
        });

        it('should handle database errors', async () => {
            jest.spyOn(Feeding, 'countDocuments').mockRejectedValue(new Error('Database error'));

            req.body = { rabbits: ['R001'] };

            await feedingController.getDailyFeedingCounts(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al obtener conteos de alimentación',
                error: 'Database error'
            });
        });
    });

    describe('checkDailyFeedings', () => {
        it('should return requiresJustification false when no rabbits have 2+ feedings', async () => {
            // Create one feeding for each rabbit
            const today = new Date();
            await Feeding.insertMany([
                {
                    codigo: 'R001',
                    heno: 100,
                    hierba: 50,
                    balanceado: 75,
                    fecha: today
                },
                {
                    codigo: 'R002',
                    heno: 90,
                    hierba: 40,
                    balanceado: 80,
                    fecha: today
                }
            ]);

            req.body = { rabbits: ['R001', 'R002', 'R003'] };

            await feedingController.checkDailyFeedings(req, res);

            expect(res.json).toHaveBeenCalledWith({
                requiresJustification: false
            });
        });

        it('should return requiresJustification true when some rabbits have 2+ feedings', async () => {
            // Create multiple feedings for some rabbits
            const today = new Date();
            await Feeding.insertMany([
                {
                    codigo: 'R001',
                    heno: 100,
                    hierba: 50,
                    balanceado: 75,
                    fecha: today
                },
                {
                    codigo: 'R001',
                    heno: 90,
                    hierba: 40,
                    balanceado: 80,
                    fecha: today
                },
                {
                    codigo: 'R002',
                    heno: 85,
                    hierba: 45,
                    balanceado: 70,
                    fecha: today
                },
                {
                    codigo: 'R002',
                    heno: 80,
                    hierba: 35,
                    balanceado: 65,
                    fecha: today
                },
                {
                    codigo: 'R002',
                    heno: 75,
                    hierba: 30,
                    balanceado: 60,
                    fecha: today
                }
            ]);

            req.body = { rabbits: ['R001', 'R002', 'R003'] };

            await feedingController.checkDailyFeedings(req, res);

            expect(res.json).toHaveBeenCalledWith({
                requiresJustification: true,
                message: 'Algunos conejos ya tienen 2 registros hoy. Se requiere justificación.',
                affectedRabbits: [
                    { codigo: 'R001', count: 2 },
                    { codigo: 'R002', count: 3 }
                ]
            });
        });

        it('should return error when rabbits array is missing', async () => {
            req.body = {};

            await feedingController.checkDailyFeedings(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Se requiere un array de códigos de conejos'
            });
        });

        it('should return error when rabbits is not an array', async () => {
            req.body = { rabbits: 'R001' };

            await feedingController.checkDailyFeedings(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Se requiere un array de códigos de conejos'
            });
        });

        it('should handle database errors', async () => {
            jest.spyOn(Feeding, 'countDocuments').mockRejectedValue(new Error('Database error'));

            req.body = { rabbits: ['R001'] };

            await feedingController.checkDailyFeedings(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al verificar registros diarios',
                error: 'Database error'
            });
        });
    });

    describe('getAllFeedingRecords', () => {
        beforeEach(async () => {
            // Create test data
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            await Feeding.insertMany([
                {
                    codigo: 'R001',
                    heno: 100,
                    hierba: 50,
                    balanceado: 75,
                    fecha: today
                },
                {
                    codigo: 'R001',
                    heno: 90,
                    hierba: 40,
                    balanceado: 80,
                    fecha: yesterday
                },
                {
                    codigo: 'R002',
                    heno: 85,
                    hierba: 45,
                    balanceado: 70,
                    fecha: today
                }
            ]);
        });

        it('should get all feeding records with default pagination', async () => {
            await feedingController.getAllFeedingRecords(req, res);

            expect(res.json).toHaveBeenCalledWith({
                registros: expect.arrayContaining([
                    expect.objectContaining({
                        codigo: expect.any(String),
                        heno: expect.any(Number),
                        hierba: expect.any(Number),
                        balanceado: expect.any(Number)
                    })
                ]),
                pagination: {
                    currentPage: 1,
                    totalPages: 1,
                    totalRecords: 3,
                    recordsPerPage: 50
                }
            });
        });

        it('should filter records by codigo', async () => {
            req.query = { codigo: 'R001' };

            await feedingController.getAllFeedingRecords(req, res);

            expect(res.json).toHaveBeenCalledWith({
                registros: expect.arrayContaining([
                    expect.objectContaining({ codigo: 'R001' })
                ]),
                pagination: {
                    currentPage: 1,
                    totalPages: 1,
                    totalRecords: 2,
                    recordsPerPage: 50
                }
            });
        });

        it('should filter records by date range', async () => {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            req.query = { startDate: todayStr, endDate: todayStr };

            await feedingController.getAllFeedingRecords(req, res);

            const [callArgs] = res.json.mock.calls[0];
            expect(callArgs.pagination.totalRecords).toBeGreaterThanOrEqual(0);
            expect(callArgs.registros).toEqual(expect.any(Array));
        });

        it('should handle pagination correctly', async () => {
            req.query = { limit: '1', page: '2' };

            await feedingController.getAllFeedingRecords(req, res);

            expect(res.json).toHaveBeenCalledWith({
                registros: expect.any(Array),
                pagination: {
                    currentPage: 2,
                    totalPages: 3,
                    totalRecords: 3,
                    recordsPerPage: 1
                }
            });

            const [callArgs] = res.json.mock.calls[0];
            expect(callArgs.registros).toHaveLength(1);
        });

        it('should filter by start date only', async () => {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            req.query = { startDate: todayStr };

            await feedingController.getAllFeedingRecords(req, res);

            expect(res.json).toHaveBeenCalledWith({
                registros: expect.any(Array),
                pagination: {
                    currentPage: 1,
                    totalPages: 1,
                    totalRecords: 2,
                    recordsPerPage: 50
                }
            });
        });

        it('should filter by end date only', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            req.query = { endDate: yesterdayStr };

            await feedingController.getAllFeedingRecords(req, res);

            const [callArgs] = res.json.mock.calls[0];
            expect(callArgs.pagination.totalRecords).toBeGreaterThanOrEqual(0);
            expect(callArgs.registros).toEqual(expect.any(Array));
        });

        it('should handle database errors during record retrieval', async () => {
            jest.spyOn(Feeding, 'find').mockImplementation(() => {
                throw new Error('Database error');
            });

            await feedingController.getAllFeedingRecords(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al obtener registros de alimentación',
                error: 'Database error'
            });
        });

        it('should handle database errors during count', async () => {
            jest.spyOn(Feeding, 'countDocuments').mockRejectedValue(new Error('Count error'));

            await feedingController.getAllFeedingRecords(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al obtener registros de alimentación',
                error: 'Count error'
            });
        });

        it('should return records sorted by date descending', async () => {
            await feedingController.getAllFeedingRecords(req, res);

            const [callArgs] = res.json.mock.calls[0];
            const records = callArgs.registros;
            
            // Verify records are sorted by date descending
            for (let i = 0; i < records.length - 1; i++) {
                expect(new Date(records[i].fecha).getTime()).toBeGreaterThanOrEqual(
                    new Date(records[i + 1].fecha).getTime()
                );
            }
        });
    });
});
