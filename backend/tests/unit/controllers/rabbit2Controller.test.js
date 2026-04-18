const rabbitController = require('../../../src/controllers/rabbitController');
const Rabbit = require('../../../src/models/rabbit');
const Race = require('../../../src/models/race');
const { validateRabbitData, validateCodeUniqueness } = require('../../../src/utils/rabbitValidations');

// Mock dependencies
jest.mock('../../../src/utils/rabbitValidations');

describe('Rabbit Controller', () => {
    let mockReq, mockRes;

    beforeEach(async () => {
        await Rabbit.deleteMany({});
        await Race.deleteMany({});
        
        mockReq = {
            body: {},
            params: {},
            query: {}
        };
        
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        // Reset all mocks and restore any spies
        jest.clearAllMocks();
        jest.restoreAllMocks();
        
        // Default successful validation
        validateRabbitData.mockResolvedValue({ valid: true });
        validateCodeUniqueness.mockResolvedValue({ valid: true });
        
        // Mock console methods
        console.log = jest.fn();
        console.error = jest.fn();
    });

    describe('registerRabbit', () => {
        test('should register rabbit successfully', async () => {
            // Arrange
            mockReq.body = {
                race: 'TestRace',
                code: 'R001',
                sex: 'macho',
                age: 6,
                weight: 3.5,
                purpose: 'Reproducción'
            };

            // Act
            await rabbitController.registerRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Conejo registrado exitosamente',
                rabbit: expect.objectContaining({
                    code: 'R001',
                    sex: 'macho'
                })
            });
        });

        test('should return validation errors for invalid data', async () => {
            // Arrange
            validateRabbitData.mockResolvedValue({ 
                valid: false, 
                errors: ['Validation error'] 
            });
            mockReq.body = {
                race: '',
                code: '',
                sex: '',
                age: 0,
                weight: 0,
                purpose: ''
            };

            // Act
            await rabbitController.registerRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                errors: ['Validation error']
            });
        });

        test('should return error for duplicate code', async () => {
            // Arrange
            validateRabbitData.mockResolvedValue({ valid: true });
            validateCodeUniqueness.mockResolvedValue({ 
                valid: false, 
                message: 'Code already exists' 
            });
            mockReq.body = {
                race: 'TestRace',
                code: 'R001',
                sex: 'macho',
                age: 6,
                weight: 3.5,
                purpose: 'Reproducción'
            };

            // Act
            await rabbitController.registerRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Code already exists'
            });
        });

        test('should handle database errors during registration', async () => {
            // Arrange
            mockReq.body = {
                race: 'TestRace',
                code: 'R001',
                sex: 'macho',
                age: 6,
                weight: 3.5,
                purpose: 'Reproducción'
            };

            jest.spyOn(Rabbit.prototype, 'save').mockRejectedValue(new Error('Database error'));

            // Act
            await rabbitController.registerRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Error al registrar el conejo',
                error: 'Database error'
            });
        });
    });

    describe('getRabbit', () => {
        test('should get rabbit by code successfully', async () => {
            // Arrange
            const testRabbit = new Rabbit({
                race: 'TestRace',
                code: 'R001',
                sex: 'macho',
                age: 6,
                weight: 3.5,
                purpose: 'Reproducción'
            });
            await testRabbit.save();

            mockReq.params = { code: 'R001' };

            // Act
            await rabbitController.getRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 'R001',
                    sex: 'macho'
                })
            );
        });

        test('should return 404 when rabbit not found', async () => {
            // Arrange
            mockReq.params = { code: 'R999' };

            // Act
            await rabbitController.getRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Conejo no encontrado'
            });
        });

        test('should handle database errors when getting rabbit', async () => {
            // Arrange
            mockReq.params = { code: 'R001' };
            jest.spyOn(Rabbit, 'findOne').mockRejectedValue(new Error('Database error'));

            // Act
            await rabbitController.getRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Error al obtener el conejo',
                error: 'Database error'
            });
        });
    });

    describe('editRabbit', () => {
        test('should edit rabbit successfully', async () => {
            // Arrange
            const testRabbit = new Rabbit({
                race: 'TestRace',
                code: 'R001',
                sex: 'macho',
                age: 6,
                weight: 3.5,
                purpose: 'Reproducción'
            });
            await testRabbit.save();

            mockReq.params = { code: 'R001' };
            mockReq.body = {
                sex: 'hembra',
                age: 8,
                weight: 4.0,
                purpose: 'Engorde'
            };

            // Act
            await rabbitController.editRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Conejo actualizado exitosamente',
                rabbit: expect.objectContaining({
                    sex: 'hembra',
                    age: 8,
                    weight: 4.0,
                    purpose: 'Engorde'
                })
            });
        });

        test('should return 404 when editing non-existent rabbit', async () => {
            // Arrange
            mockReq.params = { code: 'R999' };
            mockReq.body = { sex: 'hembra' };

            // Act
            await rabbitController.editRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Conejo no encontrado'
            });
        });

        test('should return validation errors for invalid edit data', async () => {
            // Arrange
            const testRabbit = new Rabbit({
                race: 'TestRace',
                code: 'R001',
                sex: 'macho',
                age: 6,
                weight: 3.5,
                purpose: 'Reproducción'
            });
            await testRabbit.save();

            validateRabbitData.mockResolvedValue({ 
                valid: false, 
                errors: ['Validation error'] 
            });
            mockReq.params = { code: 'R001' };
            mockReq.body = { sex: 'invalid' };

            // Act
            await rabbitController.editRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                errors: ['Validation error']
            });
        });

        test('should handle database errors during edit', async () => {
            // Arrange
            const testRabbit = new Rabbit({
                race: 'TestRace',
                code: 'R001',
                sex: 'macho',
                age: 6,
                weight: 3.5,
                purpose: 'Reproducción'
            });
            await testRabbit.save();

            mockReq.params = { code: 'R001' };
            mockReq.body = { sex: 'hembra' };

            jest.spyOn(Rabbit, 'findOneAndUpdate').mockRejectedValue(new Error('Database error'));

            // Act
            await rabbitController.editRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Error al actualizar el conejo',
                error: 'Database error'
            });
        });
    });

    describe('deleteRabbit', () => {
        test('should delete rabbit successfully', async () => {
            // Arrange
            const testRabbit = new Rabbit({
                race: 'TestRace',
                code: 'R001',
                sex: 'macho',
                age: 6,
                weight: 3.5,
                purpose: 'Reproducción'
            });
            await testRabbit.save();

            mockReq.params = { code: 'R001' };

            // Act
            await rabbitController.deleteRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Conejo eliminado exitosamente'
            });
        });

        test('should return 404 when deleting non-existent rabbit', async () => {
            // Arrange
            mockReq.params = { code: 'R999' };

            // Act
            await rabbitController.deleteRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Conejo no encontrado'
            });
        });

        test('should handle database errors during deletion', async () => {
            // Arrange
            mockReq.params = { code: 'R001' };
            jest.spyOn(Rabbit, 'findOneAndDelete').mockRejectedValue(new Error('Database error'));

            // Act
            await rabbitController.deleteRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Error al eliminar el conejo',
                error: 'Database error'
            });
        });
    });

    describe('getAllRabbits', () => {
        test('should get all rabbits successfully', async () => {
            // Arrange
            const testRabbit1 = new Rabbit({
                race: 'TestRace1',
                code: 'R001',
                sex: 'macho',
                age: 6,
                weight: 3.5,
                purpose: 'Reproducción'
            });

            const testRabbit2 = new Rabbit({
                race: 'TestRace2',
                code: 'R002',
                sex: 'hembra',
                age: 8,
                weight: 4.0,
                purpose: 'Engorde'
            });

            await testRabbit1.save();
            await testRabbit2.save();

            // Act
            await rabbitController.getAllRabbits(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ code: 'R001' }),
                    expect.objectContaining({ code: 'R002' })
                ])
            );
        });

        test('should handle database errors when getting all rabbits', async () => {
            // Arrange
            jest.spyOn(Rabbit, 'find').mockRejectedValue(new Error('Database error'));

            // Act
            await rabbitController.getAllRabbits(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Error al obtener los conejos',
                error: 'Database error'
            });
        });
    });

    describe('getAvailableRaces', () => {
        test('should get all races successfully', async () => {
            // Arrange
            const testRace1 = new Race({
                name: 'Race1',
                description: 'Description1'
            });

            const testRace2 = new Race({
                name: 'Race2',
                description: 'Description2'
            });

            await testRace1.save();
            await testRace2.save();

            // Act
            await rabbitController.getAvailableRaces(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ name: 'Race1' }),
                    expect.objectContaining({ name: 'Race2' })
                ])
            );
        });

        test('should handle database errors when getting races', async () => {
            // Arrange
            jest.spyOn(Race, 'find').mockRejectedValue(new Error('Database error'));

            // Act
            await rabbitController.getAvailableRaces(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Error al obtener las razas',
                error: 'Database error'
            });
        });
    });
});
