const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const Deworming = require('../../../src/models/deworming');
const dewormingController = require('../../../src/controllers/dewormingController');

describe('Deworming Controller', () => {
    let mongoServer;
    let req, res;

    // Increase timeout for database operations
    jest.setTimeout(30000);

    beforeAll(async () => {
        try {
            mongoServer = await MongoMemoryServer.create();
            const mongoUri = mongoServer.getUri();
            
            if (mongoose.connection.readyState !== 0) {
                await mongoose.disconnect();
            }
            
            await mongoose.connect(mongoUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
        } catch (error) {
            console.error('Error setting up MongoDB:', error);
        }
    });

    afterAll(async () => {
        try {
            // Close connection without dropping database to avoid topology errors
            if (mongoose.connection.readyState !== 0) {
                await mongoose.connection.close(false);
            }
        } catch (error) {
            // Ignore disconnect errors
        }
        
        try {
            if (mongoServer) {
                await mongoServer.stop(true); // Force stop
            }
        } catch (error) {
            // Ignore server stop errors
        }
    });

    beforeEach(async () => {
        try {
            if (mongoose.connection.readyState === 1) {
                await Deworming.deleteMany({});
            }
        } catch (error) {
            // Ignore cleanup errors in beforeEach
        }
        
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

    describe('registerDeworming', () => {
        it('should successfully register deworming for a rabbit', async () => {
            req.body = {
                codigo: 'R001',
                desparasitacion: true
            };

            await dewormingController.registerDeworming(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Se registró el control de desparasitación',
                deworming: expect.objectContaining({
                    codigo: 'R001',
                    desparasitacion: true
                })
            });
        });

        it('should return 400 if codigo is missing', async () => {
            req.body = {
                desparasitacion: true
            };

            await dewormingController.registerDeworming(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'El código del conejo es obligatorio'
            });
        });

        it('should return 400 if desparasitacion is false', async () => {
            req.body = {
                codigo: 'R001',
                desparasitacion: false
            };

            await dewormingController.registerDeworming(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Debe seleccionar la desparasitación para poder realizar el registro'
            });
        });

        it('should return 400 if trying to register within one month', async () => {
            // Create an existing deworming within the last month
            const recentDate = new Date();
            recentDate.setDate(recentDate.getDate() - 15); // 15 days ago

            await new Deworming({
                codigo: 'R001',
                desparasitacion: true,
                fecha: recentDate,
                lastDewormingDate: recentDate
            }).save();

            req.body = {
                codigo: 'R001',
                desparasitacion: true
            };

            await dewormingController.registerDeworming(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Debe pasar un mes para poder ingresar otra desparasitación')
                })
            );
        });

        it('should allow registration if more than one month has passed', async () => {
            // Create an existing deworming more than one month ago
            const oldDate = new Date();
            oldDate.setMonth(oldDate.getMonth() - 2); // 2 months ago

            await new Deworming({
                codigo: 'R001',
                desparasitacion: true,
                fecha: oldDate,
                lastDewormingDate: oldDate
            }).save();

            req.body = {
                codigo: 'R001',
                desparasitacion: true
            };

            await dewormingController.registerDeworming(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Se registró el control de desparasitación',
                deworming: expect.objectContaining({
                    codigo: 'R001',
                    desparasitacion: true
                })
            });
        });

        it('should handle save errors', async () => {
            const mockSave = jest.spyOn(Deworming.prototype, 'save').mockRejectedValue(new Error('Save error'));

            req.body = {
                codigo: 'R001',
                desparasitacion: true
            };

            await dewormingController.registerDeworming(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'No se pudo registrar la desparasitación. Intente nuevamente.'
            });

            mockSave.mockRestore();
        });

        it('should handle database errors during findOne', async () => {
            // Mock Deworming.findOne to throw an error
            const originalFindOne = Deworming.findOne;
            Deworming.findOne = jest.fn().mockImplementation(() => {
                throw new Error('Database error');
            });

            req.body = {
                codigo: 'R001',
                desparasitacion: true
            };

            await dewormingController.registerDeworming(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'No se pudo registrar la desparasitación. Intente nuevamente.'
            });
            
            // Restore original method
            Deworming.findOne = originalFindOne;
        });
    });

    describe('checkDewormingValidations', () => {
        it('should return validation results for multiple rabbits', async () => {
            // Create some deworming history
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

            const overOneMonthAgo = new Date();
            overOneMonthAgo.setMonth(overOneMonthAgo.getMonth() - 1);
            overOneMonthAgo.setDate(overOneMonthAgo.getDate() - 1);

            await Deworming.insertMany([
                {
                    codigo: 'R001',
                    desparasitacion: true,
                    fecha: twoWeeksAgo,
                    lastDewormingDate: twoWeeksAgo
                },
                {
                    codigo: 'R002',
                    desparasitacion: true,
                    fecha: overOneMonthAgo,
                    lastDewormingDate: overOneMonthAgo
                }
            ]);

            req.body = { rabbits: ['R001', 'R002', 'R003'] };

            await dewormingController.checkDewormingValidations(req, res);

            expect(res.json).toHaveBeenCalledWith({
                validations: {
                    'R001': {
                        canReceiveDeworming: false,
                        lastDeworming: expect.any(Date)
                    },
                    'R002': {
                        canReceiveDeworming: true,
                        lastDeworming: null
                    },
                    'R003': {
                        canReceiveDeworming: true,
                        lastDeworming: null
                    }
                }
            });
        });

        it('should return 400 if rabbits array is missing', async () => {
            req.body = {};

            await dewormingController.checkDewormingValidations(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Se requiere un array de códigos de conejos'
            });
        });

        it('should return 400 if rabbits is not an array', async () => {
            req.body = { rabbits: 'R001' };

            await dewormingController.checkDewormingValidations(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Se requiere un array de códigos de conejos'
            });
        });

        it('should handle database errors', async () => {
            // Mock Deworming.findOne to throw an error
            const originalFindOne = Deworming.findOne;
            Deworming.findOne = jest.fn().mockImplementation(() => {
                throw new Error('Database error');
            });

            req.body = { rabbits: ['R001'] };

            await dewormingController.checkDewormingValidations(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error interno del servidor al verificar validaciones'
            });
            
            // Restore original method
            Deworming.findOne = originalFindOne;
        });

        it('should handle empty rabbits array', async () => {
            req.body = { rabbits: [] };

            await dewormingController.checkDewormingValidations(req, res);

            expect(res.json).toHaveBeenCalledWith({
                validations: {}
            });
        });
    });

    describe('getDewormingStatus', () => {
        it('should return deworming status for multiple rabbits', async () => {
            // Create deworming history
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);

            await new Deworming({
                codigo: 'R001',
                desparasitacion: true,
                fecha: lastMonth,
                lastDewormingDate: lastMonth
            }).save();

            req.body = { rabbits: ['R001', 'R002'] };

            await dewormingController.getDewormingStatus(req, res);

            expect(res.json).toHaveBeenCalledWith({
                status: {
                    'R001': {
                        hasDeworming: true,
                        lastDeworming: expect.any(Date)
                    },
                    'R002': {
                        hasDeworming: false,
                        lastDeworming: null
                    }
                }
            });
        });

        it('should return 400 if rabbits array is missing', async () => {
            req.body = {};

            await dewormingController.getDewormingStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Se requiere un array de códigos de conejos'
            });
        });

        it('should return 400 if rabbits is not an array', async () => {
            req.body = { rabbits: 'R001' };

            await dewormingController.getDewormingStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Se requiere un array de códigos de conejos'
            });
        });

        it('should handle database errors', async () => {
            // Mock Deworming.findOne to throw an error
            const originalFindOne = Deworming.findOne;
            Deworming.findOne = jest.fn().mockImplementation(() => {
                throw new Error('Database error');
            });

            req.body = { rabbits: ['R001'] };

            await dewormingController.getDewormingStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error interno del servidor al obtener estado de desparasitaciones'
            });
            
            // Restore original method
            Deworming.findOne = originalFindOne;
        });

        it('should handle empty rabbits array', async () => {
            req.body = { rabbits: [] };

            await dewormingController.getDewormingStatus(req, res);

            expect(res.json).toHaveBeenCalledWith({
                status: {}
            });
        });
    });
});
