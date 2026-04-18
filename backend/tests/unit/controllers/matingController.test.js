const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const Mating = require('../../../src/models/mating');
const AssignRabbit = require('../../../src/models/assignRabbit');
const Rabbit = require('../../../src/models/rabbit');
const matingController = require('../../../src/controllers/matingController');

describe('Mating Controller', () => {
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
        await Mating.deleteMany({});
        await AssignRabbit.deleteMany({});
        await Rabbit.deleteMany({});
        
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

    describe('getAvailableFemales', () => {
        beforeEach(async () => {
            // Create test rabbits
            await Rabbit.insertMany([
                { code: 'F001', age: 5, sex: 'hembra', race: 'Nueva Zelanda', weight: 3.5, purpose: 'Reproducción' },
                { code: 'F002', age: 4, sex: 'hembra', race: 'Nueva Zelanda', weight: 3.2, purpose: 'Reproducción' },
                { code: 'F003', age: 3, sex: 'hembra', race: 'Nueva Zelanda', weight: 2.8, purpose: 'Reproducción' }, // Too young
                { code: 'M001', age: 6, sex: 'macho', race: 'Nueva Zelanda', weight: 4.0, purpose: 'Reproducción' }, // Male
                { code: 'F004', age: 7, sex: 'hembra', race: 'Nueva Zelanda', weight: 3.8, purpose: 'Reproducción' }
            ]);

            // Create cage assignments
            await AssignRabbit.insertMany([
                { rabbitCode: 'F001', cageNumber: 1, status: 'asignado' },
                { rabbitCode: 'F002', cageNumber: 2, status: 'asignado' },
                { rabbitCode: 'M001', cageNumber: 3, status: 'asignado' },
                // F004 has no cage assignment
            ]);
        });

        it('should return available females with cage assignments', async () => {
            await matingController.getAvailableFemales(req, res);

            expect(res.json).toHaveBeenCalledWith([
                {
                    code: 'F001',
                    age: 5,
                    sex: 'hembra',
                    cageNumber: 1
                },
                {
                    code: 'F002',
                    age: 4,
                    sex: 'hembra',
                    cageNumber: 2
                }
            ]);
        });

        it('should return empty array when no females meet criteria', async () => {
            await Rabbit.deleteMany({});
            await AssignRabbit.deleteMany({});

            await matingController.getAvailableFemales(req, res);

            expect(res.json).toHaveBeenCalledWith([]);
        });

        it('should filter out males', async () => {
            await Rabbit.deleteMany({});
            await AssignRabbit.deleteMany({});
            
            await Rabbit.create({ code: 'M001', age: 6, sex: 'macho', race: 'Nueva Zelanda', weight: 4.0, purpose: 'Reproducción' });
            await AssignRabbit.create({ rabbitCode: 'M001', cageNumber: 1, status: 'asignado' });

            await matingController.getAvailableFemales(req, res);

            expect(res.json).toHaveBeenCalledWith([]);
        });

        it('should filter out females under age 4', async () => {
            await Rabbit.deleteMany({});
            await AssignRabbit.deleteMany({});
            
            await Rabbit.create({ code: 'F001', age: 3, sex: 'hembra', race: 'Nueva Zelanda', weight: 2.8, purpose: 'Reproducción' });
            await AssignRabbit.create({ rabbitCode: 'F001', cageNumber: 1, status: 'asignado' });

            await matingController.getAvailableFemales(req, res);

            expect(res.json).toHaveBeenCalledWith([]);
        });

        it('should filter out females without cage assignment', async () => {
            await Rabbit.deleteMany({});
            await AssignRabbit.deleteMany({});
            
            await Rabbit.create({ code: 'F001', age: 5, sex: 'hembra', race: 'Nueva Zelanda', weight: 3.5, purpose: 'Reproducción' });
            // No cage assignment created

            await matingController.getAvailableFemales(req, res);

            expect(res.json).toHaveBeenCalledWith([]);
        });

        it('should handle database errors', async () => {
            jest.spyOn(Rabbit, 'find').mockRejectedValue(new Error('Database error'));

            await matingController.getAvailableFemales(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'No se pudo obtener la lista de conejas.',
                error: 'Database error'
            });
        });
    });

    describe('registerMating', () => {
        beforeEach(async () => {
            // Create test rabbit and assignment
            await Rabbit.create({ code: 'F001', age: 5, sex: 'hembra', race: 'Nueva Zelanda', weight: 3.5, purpose: 'Reproducción' });
            await AssignRabbit.create({ rabbitCode: 'F001', cageNumber: 1, status: 'asignado' });
        });

        it('should register mating successfully', async () => {
            const matingDate = '2024-01-15';
            req.body = {
                rabbitCode: 'F001',
                cageNumber: 1,
                matingDate
            };

            await matingController.registerMating(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Se registró la fecha de monta.',
                mating: expect.objectContaining({
                    rabbitCode: 'F001',
                    cageNumber: 1,
                    matingDate: new Date(matingDate),
                    birthDate: expect.any(Date),
                    status: 'activo'
                })
            });

            // Verify birth date is 30 days after mating
            const [callArgs] = res.json.mock.calls[0];
            const birthDate = callArgs.mating.birthDate;
            const expectedBirthDate = new Date(matingDate);
            expectedBirthDate.setDate(expectedBirthDate.getDate() + 30);
            expect(birthDate.getTime()).toBe(expectedBirthDate.getTime());
        });

        it('should return error when rabbitCode is missing', async () => {
            req.body = {
                cageNumber: 1,
                matingDate: '2024-01-15'
            };

            await matingController.registerMating(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Todos los campos son obligatorios.'
            });
        });

        it('should return error when cageNumber is missing', async () => {
            req.body = {
                rabbitCode: 'F001',
                matingDate: '2024-01-15'
            };

            await matingController.registerMating(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Todos los campos son obligatorios.'
            });
        });

        it('should return error when matingDate is missing', async () => {
            req.body = {
                rabbitCode: 'F001',
                cageNumber: 1
            };

            await matingController.registerMating(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Todos los campos son obligatorios.'
            });
        });

        it('should return error when rabbit does not exist', async () => {
            req.body = {
                rabbitCode: 'F999',
                cageNumber: 1,
                matingDate: '2024-01-15'
            };

            await matingController.registerMating(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'La coneja seleccionada no es válida.'
            });
        });

        it('should return error when rabbit is male', async () => {
            await Rabbit.create({ code: 'M001', age: 5, sex: 'macho', race: 'Nueva Zelanda', weight: 4.0, purpose: 'Reproducción' });
            await AssignRabbit.create({ rabbitCode: 'M001', cageNumber: 2, status: 'asignado' });

            req.body = {
                rabbitCode: 'M001',
                cageNumber: 2,
                matingDate: '2024-01-15'
            };

            await matingController.registerMating(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'La coneja seleccionada no es válida.'
            });
        });

        it('should return error when rabbit is too young', async () => {
            await Rabbit.create({ code: 'F002', age: 3, sex: 'hembra', race: 'Nueva Zelanda', weight: 2.8, purpose: 'Reproducción' });
            await AssignRabbit.create({ rabbitCode: 'F002', cageNumber: 2, status: 'asignado' });

            req.body = {
                rabbitCode: 'F002',
                cageNumber: 2,
                matingDate: '2024-01-15'
            };

            await matingController.registerMating(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'La coneja seleccionada no es válida.'
            });
        });

        it('should return error when rabbit has no cage assignment', async () => {
            await Rabbit.create({ code: 'F002', age: 5, sex: 'hembra', race: 'Nueva Zelanda', weight: 3.2, purpose: 'Reproducción' });

            req.body = {
                rabbitCode: 'F002',
                cageNumber: 2,
                matingDate: '2024-01-15'
            };

            await matingController.registerMating(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'La coneja no tiene jaula asignada.'
            });
        });

        it('should return error when cage number does not match assignment', async () => {
            req.body = {
                rabbitCode: 'F001',
                cageNumber: 999, // Different from assigned cage
                matingDate: '2024-01-15'
            };

            await matingController.registerMating(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'La coneja no tiene jaula asignada.'
            });
        });

        it('should return error when rabbit has active mating', async () => {
            // Create active mating with future birth date
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 15);

            await Mating.create({
                rabbitCode: 'F001',
                cageNumber: 1,
                matingDate: new Date(),
                birthDate: futureDate,
                status: 'activo'
            });

            req.body = {
                rabbitCode: 'F001',
                cageNumber: 1,
                matingDate: '2024-01-15'
            };

            await matingController.registerMating(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'La coneja ya tiene una monta activa.'
            });
        });

        it('should allow mating when previous mating birth date has passed', async () => {
            // Create mating with past birth date
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 5);

            await Mating.create({
                rabbitCode: 'F001',
                cageNumber: 1,
                matingDate: new Date(),
                birthDate: pastDate,
                status: 'activo'
            });

            req.body = {
                rabbitCode: 'F001',
                cageNumber: 1,
                matingDate: '2024-01-15'
            };

            await matingController.registerMating(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Se registró la fecha de monta.',
                mating: expect.objectContaining({
                    rabbitCode: 'F001',
                    status: 'activo'
                })
            });
        });

        it('should return error for invalid mating date', async () => {
            req.body = {
                rabbitCode: 'F001',
                cageNumber: 1,
                matingDate: 'invalid-date'
            };

            await matingController.registerMating(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'La fecha de monta no es válida.'
            });
        });

        it('should return error when matingDate becomes null after initial validation', async () => {
            // This test covers the edge case where matingDate passes initial validation but becomes null
            req.body = {
                rabbitCode: 'F001',
                cageNumber: 1,
                matingDate: null
            };

            await matingController.registerMating(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Todos los campos son obligatorios.'
            });
        });

        it('should handle database errors during save', async () => {
            jest.spyOn(Mating.prototype, 'save').mockRejectedValue(new Error('Database error'));

            req.body = {
                rabbitCode: 'F001',
                cageNumber: 1,
                matingDate: '2024-01-15'
            };

            await matingController.registerMating(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al registrar la monta.',
                error: 'Database error'
            });
        });

        it('should handle database errors during rabbit lookup', async () => {
            jest.spyOn(Rabbit, 'findOne').mockRejectedValue(new Error('Database error'));

            req.body = {
                rabbitCode: 'F001',
                cageNumber: 1,
                matingDate: '2024-01-15'
            };

            await matingController.registerMating(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al registrar la monta.',
                error: 'Database error'
            });
        });
    });

    describe('getActiveMatings', () => {
        it('should return active matings', async () => {
            const today = new Date();
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 15);

            await Mating.insertMany([
                {
                    rabbitCode: 'F001',
                    cageNumber: 1,
                    matingDate: today,
                    birthDate: futureDate,
                    status: 'activo'
                },
                {
                    rabbitCode: 'F002',
                    cageNumber: 2,
                    matingDate: today,
                    birthDate: futureDate,
                    status: 'activo'
                },
                {
                    rabbitCode: 'F003',
                    cageNumber: 3,
                    matingDate: today,
                    birthDate: futureDate,
                    status: 'eliminado'
                }
            ]);

            await matingController.getActiveMatings(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        rabbitCode: 'F001',
                        status: 'activo'
                    }),
                    expect.objectContaining({
                        rabbitCode: 'F002',
                        status: 'activo'
                    })
                ])
            );

            const [callArgs] = res.json.mock.calls[0];
            expect(callArgs).toHaveLength(2);
        });

        it('should return empty array when no active matings exist', async () => {
            await matingController.getActiveMatings(req, res);

            expect(res.json).toHaveBeenCalledWith([]);
        });

        it('should exclude eliminated matings', async () => {
            const today = new Date();
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 15);

            await Mating.create({
                rabbitCode: 'F001',
                cageNumber: 1,
                matingDate: today,
                birthDate: futureDate,
                status: 'eliminado'
            });

            await matingController.getActiveMatings(req, res);

            expect(res.json).toHaveBeenCalledWith([]);
        });

        it('should handle database errors', async () => {
            jest.spyOn(Mating, 'find').mockRejectedValue(new Error('Database error'));

            await matingController.getActiveMatings(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'No se pudo obtener la lista de montas.',
                error: 'Database error'
            });
        });
    });

    describe('deleteMating', () => {
        let matingId;

        beforeEach(async () => {
            const mating = await Mating.create({
                rabbitCode: 'F001',
                cageNumber: 1,
                matingDate: new Date(),
                birthDate: new Date(),
                status: 'activo'
            });
            matingId = mating._id.toString();
        });

        it('should delete mating successfully', async () => {
            req.params = { id: matingId };

            await matingController.deleteMating(req, res);

            expect(res.json).toHaveBeenCalledWith({
                message: 'El parto ha sido eliminado con éxito.'
            });

            // Verify mating status was updated
            const updatedMating = await Mating.findById(matingId);
            expect(updatedMating.status).toBe('eliminado');
        });

        it('should return error when mating not found', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            req.params = { id: nonExistentId.toString() };

            await matingController.deleteMating(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'No se encontró el registro de monta.'
            });
        });

        it('should handle invalid ObjectId', async () => {
            req.params = { id: 'invalid-id' };

            await matingController.deleteMating(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al eliminar el parto.',
                error: expect.any(String)
            });
        });

        it('should handle database errors during save', async () => {
            jest.spyOn(Mating.prototype, 'save').mockRejectedValue(new Error('Database error'));

            req.params = { id: matingId };

            await matingController.deleteMating(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al eliminar el parto.',
                error: 'Database error'
            });
        });

        it('should handle database errors during findById', async () => {
            jest.spyOn(Mating, 'findById').mockRejectedValue(new Error('Database error'));

            req.params = { id: matingId };

            await matingController.deleteMating(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al eliminar el parto.',
                error: 'Database error'
            });
        });
    });
});
