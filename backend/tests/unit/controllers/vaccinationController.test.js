const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const Vaccination = require('../../../src/models/vaccination');
const vaccinationController = require('../../../src/controllers/vaccinationController');

describe('Vaccination Controller', () => {
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
        // Set a timeout for cleanup
        const cleanup = new Promise(async (resolve) => {
            try {
                if (mongoose.connection.readyState !== 0) {
                    await mongoose.connection.close(false);
                }
                if (mongoServer) {
                    await mongoServer.stop(true);
                }
            } catch (error) {
                // Ignore cleanup errors
            }
            resolve();
        });
        
        // Wait for cleanup with timeout
        const timeout = new Promise(resolve => setTimeout(resolve, 2000));
        await Promise.race([cleanup, timeout]);
    });

    beforeEach(async () => {
        try {
            if (mongoose.connection.readyState === 1) {
                await Vaccination.deleteMany({});
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

    afterEach(async () => {
        jest.restoreAllMocks();
        // Small delay to allow async operations to complete
        await new Promise(resolve => setTimeout(resolve, 10));
    });

    describe('registerVaccination', () => {
        it('should register vaccination successfully with both vaccines', async () => {
            req.body = {
                codigo: 'R001',
                mixomatosis: true,
                vhd: true
            };

            await vaccinationController.registerVaccination(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Se registró el control de vacunación',
                vaccination: expect.objectContaining({
                    codigo: 'R001',
                    mixomatosis: true,
                    vhd: true,
                    lastMixomatosisDate: expect.any(Date),
                    lastVhdDate: expect.any(Date)
                })
            });
        });

        it('should register vaccination with only mixomatosis', async () => {
            req.body = {
                codigo: 'R001',
                mixomatosis: true,
                vhd: false
            };

            await vaccinationController.registerVaccination(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Se registró el control de vacunación',
                vaccination: expect.objectContaining({
                    codigo: 'R001',
                    mixomatosis: true,
                    vhd: false,
                    lastMixomatosisDate: expect.any(Date),
                    lastVhdDate: null
                })
            });
        });

        it('should register vaccination with only VHD', async () => {
            req.body = {
                codigo: 'R001',
                mixomatosis: false,
                vhd: true
            };

            await vaccinationController.registerVaccination(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Se registró el control de vacunación',
                vaccination: expect.objectContaining({
                    codigo: 'R001',
                    mixomatosis: false,
                    vhd: true,
                    lastMixomatosisDate: null,
                    lastVhdDate: expect.any(Date)
                })
            });
        });

        it('should return error when codigo is missing', async () => {
            req.body = {
                mixomatosis: true,
                vhd: true
            };

            await vaccinationController.registerVaccination(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'El código del conejo es obligatorio'
            });
        });

        it('should return error when no vaccines are selected', async () => {
            req.body = {
                codigo: 'R001',
                mixomatosis: false,
                vhd: false
            };

            await vaccinationController.registerVaccination(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Debe seleccionar al menos una vacuna para poder realizar el registro'
            });
        });

        it('should return error when neither vaccine is provided', async () => {
            req.body = {
                codigo: 'R001'
            };

            await vaccinationController.registerVaccination(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Debe seleccionar al menos una vacuna para poder realizar el registro'
            });
        });

        it('should reject mixomatosis vaccination within one year', async () => {
            // Create previous vaccination less than one year ago
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            await new Vaccination({
                codigo: 'R001',
                mixomatosis: true,
                vhd: false,
                fecha: sixMonthsAgo,
                lastMixomatosisDate: sixMonthsAgo,
                lastVhdDate: null
            }).save();

            req.body = {
                codigo: 'R001',
                mixomatosis: true,
                vhd: false
            };

            await vaccinationController.registerVaccination(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Debe pasar un año para poder ingresar otra vacuna de mixomatosis')
                })
            );
        });

        it('should reject VHD vaccination within one year', async () => {
            // Create previous vaccination less than one year ago
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            await new Vaccination({
                codigo: 'R001',
                mixomatosis: false,
                vhd: true,
                fecha: sixMonthsAgo,
                lastMixomatosisDate: null,
                lastVhdDate: sixMonthsAgo
            }).save();

            req.body = {
                codigo: 'R001',
                mixomatosis: false,
                vhd: true
            };

            await vaccinationController.registerVaccination(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Debe pasar un año para poder ingresar otra vacuna VHD')
                })
            );
        });

        it('should allow mixomatosis vaccination after one year', async () => {
            // Create previous vaccination more than one year ago
            const overOneYearAgo = new Date();
            overOneYearAgo.setFullYear(overOneYearAgo.getFullYear() - 1);
            overOneYearAgo.setDate(overOneYearAgo.getDate() - 1);

            await new Vaccination({
                codigo: 'R001',
                mixomatosis: true,
                vhd: false,
                fecha: overOneYearAgo,
                lastMixomatosisDate: overOneYearAgo,
                lastVhdDate: null
            }).save();

            req.body = {
                codigo: 'R001',
                mixomatosis: true,
                vhd: false
            };

            await vaccinationController.registerVaccination(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Se registró el control de vacunación',
                vaccination: expect.objectContaining({
                    codigo: 'R001',
                    mixomatosis: true,
                    vhd: false
                })
            });
        });

        it('should allow VHD vaccination after one year', async () => {
            // Create previous vaccination more than one year ago
            const overOneYearAgo = new Date();
            overOneYearAgo.setFullYear(overOneYearAgo.getFullYear() - 1);
            overOneYearAgo.setDate(overOneYearAgo.getDate() - 1);

            await new Vaccination({
                codigo: 'R001',
                mixomatosis: false,
                vhd: true,
                fecha: overOneYearAgo,
                lastMixomatosisDate: null,
                lastVhdDate: overOneYearAgo
            }).save();

            req.body = {
                codigo: 'R001',
                mixomatosis: false,
                vhd: true
            };

            await vaccinationController.registerVaccination(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Se registró el control de vacunación',
                vaccination: expect.objectContaining({
                    codigo: 'R001',
                    mixomatosis: false,
                    vhd: true
                })
            });
        });

        it('should allow one vaccine type if the other is restricted', async () => {
            // Create previous vaccination with only mixomatosis less than one year ago
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            await new Vaccination({
                codigo: 'R001',
                mixomatosis: true,
                vhd: false,
                fecha: sixMonthsAgo,
                lastMixomatosisDate: sixMonthsAgo,
                lastVhdDate: null
            }).save();

            req.body = {
                codigo: 'R001',
                mixomatosis: false,
                vhd: true
            };

            await vaccinationController.registerVaccination(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Se registró el control de vacunación',
                vaccination: expect.objectContaining({
                    codigo: 'R001',
                    mixomatosis: false,
                    vhd: true,
                    lastMixomatosisDate: sixMonthsAgo,
                    lastVhdDate: expect.any(Date)
                })
            });
        });

        it('should handle database errors during save', async () => {
            jest.spyOn(Vaccination.prototype, 'save').mockRejectedValue(new Error('Database error'));

            req.body = {
                codigo: 'R001',
                mixomatosis: true,
                vhd: true
            };

            await vaccinationController.registerVaccination(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'No se pudo registrar la vacunación. Intente nuevamente.'
            });
        });

        it('should handle database errors during findOne', async () => {
            // Mock Vaccination.findOne to throw an error
            const originalFindOne = Vaccination.findOne;
            Vaccination.findOne = jest.fn().mockImplementation(() => {
                throw new Error('Database error');
            });

            req.body = {
                codigo: 'R001',
                mixomatosis: true,
                vhd: true
            };

            await vaccinationController.registerVaccination(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'No se pudo registrar la vacunación. Intente nuevamente.'
            });
            
            // Restore original method
            Vaccination.findOne = originalFindOne;
        });
    });

    describe('checkVaccinationValidations', () => {
        it('should return validation results for multiple rabbits', async () => {
            // Create some vaccination history
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            await Vaccination.insertMany([
                {
                    codigo: 'R001',
                    mixomatosis: true,
                    vhd: false,
                    fecha: sixMonthsAgo,
                    lastMixomatosisDate: sixMonthsAgo,
                    lastVhdDate: null
                },
                {
                    codigo: 'R002',
                    mixomatosis: false,
                    vhd: true,
                    fecha: sixMonthsAgo,
                    lastMixomatosisDate: null,
                    lastVhdDate: sixMonthsAgo
                }
            ]);

            req.body = { rabbits: ['R001', 'R002', 'R003'] };

            await vaccinationController.checkVaccinationValidations(req, res);

            expect(res.json).toHaveBeenCalledWith({
                validations: {
                    'R001': {
                        canReceiveMixomatosis: false,
                        canReceiveVhd: true,
                        lastMixomatosis: expect.any(Date),
                        lastVhd: null
                    },
                    'R002': {
                        canReceiveMixomatosis: true,
                        canReceiveVhd: false,
                        lastMixomatosis: null,
                        lastVhd: expect.any(Date)
                    },
                    'R003': {
                        canReceiveMixomatosis: true,
                        canReceiveVhd: true,
                        lastMixomatosis: null,
                        lastVhd: null
                    }
                }
            });
        });

        it('should allow all vaccines when no previous vaccinations exist', async () => {
            req.body = { rabbits: ['R001', 'R002'] };

            await vaccinationController.checkVaccinationValidations(req, res);

            expect(res.json).toHaveBeenCalledWith({
                validations: {
                    'R001': {
                        canReceiveMixomatosis: true,
                        canReceiveVhd: true,
                        lastMixomatosis: null,
                        lastVhd: null
                    },
                    'R002': {
                        canReceiveMixomatosis: true,
                        canReceiveVhd: true,
                        lastMixomatosis: null,
                        lastVhd: null
                    }
                }
            });
        });

        it('should allow vaccines when previous vaccinations are over one year old', async () => {
            const overOneYearAgo = new Date();
            overOneYearAgo.setFullYear(overOneYearAgo.getFullYear() - 1);
            overOneYearAgo.setDate(overOneYearAgo.getDate() - 1);

            await new Vaccination({
                codigo: 'R001',
                mixomatosis: true,
                vhd: true,
                fecha: overOneYearAgo,
                lastMixomatosisDate: overOneYearAgo,
                lastVhdDate: overOneYearAgo
            }).save();

            req.body = { rabbits: ['R001'] };

            await vaccinationController.checkVaccinationValidations(req, res);

            expect(res.json).toHaveBeenCalledWith({
                validations: {
                    'R001': {
                        canReceiveMixomatosis: true,
                        canReceiveVhd: true,
                        lastMixomatosis: null,
                        lastVhd: null
                    }
                }
            });
        });

        it('should return error when rabbits array is missing', async () => {
            req.body = {};

            await vaccinationController.checkVaccinationValidations(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Se requiere un array de códigos de conejos'
            });
        });

        it('should return error when rabbits is not an array', async () => {
            req.body = { rabbits: 'R001' };

            await vaccinationController.checkVaccinationValidations(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Se requiere un array de códigos de conejos'
            });
        });

        it('should handle database errors', async () => {
            // Mock Vaccination.findOne to throw an error
            const originalFindOne = Vaccination.findOne;
            Vaccination.findOne = jest.fn().mockImplementation(() => {
                throw new Error('Database error');
            });

            req.body = { rabbits: ['R001'] };

            await vaccinationController.checkVaccinationValidations(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error interno del servidor al verificar validaciones'
            });
            
            // Restore original method
            Vaccination.findOne = originalFindOne;
        });
    });

    describe('getVaccinationStatus', () => {
        it('should return vaccination status for multiple rabbits', async () => {
            // Create vaccination history
            const today = new Date();
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

            await Vaccination.insertMany([
                {
                    codigo: 'R001',
                    mixomatosis: true,
                    vhd: true,
                    fecha: today,
                    lastMixomatosisDate: today,
                    lastVhdDate: today
                },
                {
                    codigo: 'R002',
                    mixomatosis: true,
                    vhd: false,
                    fecha: oneMonthAgo,
                    lastMixomatosisDate: oneMonthAgo,
                    lastVhdDate: null
                }
            ]);

            req.body = { rabbits: ['R001', 'R002', 'R003'] };

            await vaccinationController.getVaccinationStatus(req, res);

            expect(res.json).toHaveBeenCalledWith({
                status: {
                    'R001': {
                        hasVaccinations: true,
                        lastMixomatosis: expect.any(Date),
                        lastVhd: expect.any(Date)
                    },
                    'R002': {
                        hasVaccinations: true,
                        lastMixomatosis: expect.any(Date),
                        lastVhd: null
                    },
                    'R003': {
                        hasVaccinations: false,
                        lastMixomatosis: null,
                        lastVhd: null
                    }
                }
            });
        });

        it('should return status for rabbits without vaccinations', async () => {
            req.body = { rabbits: ['R001', 'R002'] };

            await vaccinationController.getVaccinationStatus(req, res);

            expect(res.json).toHaveBeenCalledWith({
                status: {
                    'R001': {
                        hasVaccinations: false,
                        lastMixomatosis: null,
                        lastVhd: null
                    },
                    'R002': {
                        hasVaccinations: false,
                        lastMixomatosis: null,
                        lastVhd: null
                    }
                }
            });
        });

        it('should return error when rabbits array is missing', async () => {
            req.body = {};

            await vaccinationController.getVaccinationStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Se requiere un array de códigos de conejos'
            });
        });

        it('should return error when rabbits is not an array', async () => {
            req.body = { rabbits: 'R001' };

            await vaccinationController.getVaccinationStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Se requiere un array de códigos de conejos'
            });
        });

        it('should handle database errors', async () => {
            // Mock Vaccination.findOne to throw an error
            const originalFindOne = Vaccination.findOne;
            Vaccination.findOne = jest.fn().mockImplementation(() => {
                throw new Error('Database error');
            });

            req.body = { rabbits: ['R001'] };

            await vaccinationController.getVaccinationStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error interno del servidor al obtener estado de vacunaciones'
            });
            
            // Restore original method
            Vaccination.findOne = originalFindOne;
        });

        it('should handle empty rabbits array', async () => {
            req.body = { rabbits: [] };

            await vaccinationController.getVaccinationStatus(req, res);

            expect(res.json).toHaveBeenCalledWith({
                status: {}
            });
        });
    });
});
