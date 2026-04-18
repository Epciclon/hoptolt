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
        validateRabbitData.mockReturnValue([]);
        validateCodeUniqueness.mockResolvedValue([]);
        
        // Mock console methods
        console.log = jest.fn();
        console.error = jest.fn();
    });

    describe('registerRabbit', () => {
        test('should register rabbit successfully', async () => {
            // Arrange
            mockReq.body = {
                code: 'R001',
                name: 'TestRabbit',
                birthDate: '2023-01-01',
                sex: 'M',
                breed: 'TestBreed',
                acquisitionType: 'Compra',
                acquisitionDate: '2023-01-02',
                origin: 'TestOrigin',
                status: 'AVAILABLE',
                motherId: null,
                fatherId: null,
                race: 'raceId123'
            };

            // Act
            await rabbitController.registerRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Conejo registrado exitosamente',
                rabbit: expect.objectContaining({
                    code: 'R001',
                    name: 'TestRabbit'
                })
            });
        });

        test('should return validation errors for invalid data', async () => {
            // Arrange
            validateRabbitData.mockReturnValue(['Validation error']);
            mockReq.body = {
                code: '',
                name: ''
            };

            // Act
            await rabbitController.registerRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Validation error'
            });
        });

        test('should return error for duplicate code', async () => {
            // Arrange
            validateCodeUniqueness.mockResolvedValue(['Code already exists']);
            mockReq.body = {
                code: 'R001',
                name: 'TestRabbit'
            };

            // Act
            await rabbitController.registerRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Code already exists'
            });
        });

        test('should handle database errors during registration', async () => {
            // Arrange
            mockReq.body = {
                code: 'R001',
                name: 'TestRabbit'
            };

            // Mock Rabbit constructor to throw error on save
            const mockSave = jest.fn().mockRejectedValue(new Error('Database error'));
            jest.spyOn(Rabbit.prototype, 'save').mockImplementation(mockSave);

            // Act
            await rabbitController.registerRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor',
                error: 'Database error'
            });
        });
    });

    describe('getRabbit', () => {
        test('should get rabbit by id successfully', async () => {
            // Arrange
            const testRabbit = new Rabbit({
                code: 'R001',
                name: 'TestRabbit',
                birthDate: '2023-01-01',
                sex: 'M',
                breed: 'TestBreed',
                acquisitionType: 'Compra',
                acquisitionDate: '2023-01-02',
                origin: 'TestOrigin',
                status: 'AVAILABLE',
                motherId: null,
                fatherId: null,
                race: 'raceId123'
            });
            await testRabbit.save();

            mockReq.params = { id: testRabbit._id.toString() };

            // Act
            await rabbitController.getRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                rabbit: expect.objectContaining({
                    code: 'R001',
                    name: 'TestRabbit'
                })
            });
        });

        test('should return 404 when rabbit not found', async () => {
            // Arrange
            const nonExistentId = '507f1f77bcf86cd799439011';
            mockReq.params = { id: nonExistentId };

            // Act
            await rabbitController.getRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Conejo no encontrado'
            });
        });

        test('should handle database errors when getting rabbit', async () => {
            // Arrange
            mockReq.params = { id: '507f1f77bcf86cd799439011' };
            jest.spyOn(Rabbit, 'findById').mockRejectedValue(new Error('Database error'));

            // Act
            await rabbitController.getRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor',
                error: 'Database error'
            });
        });
    });

    describe('editRabbit', () => {
        test('should edit rabbit successfully', async () => {
            // Arrange
            const testRabbit = new Rabbit({
                code: 'R001',
                name: 'TestRabbit',
                birthDate: '2023-01-01',
                sex: 'M',
                breed: 'TestBreed',
                acquisitionType: 'Compra',
                acquisitionDate: '2023-01-02',
                origin: 'TestOrigin',
                status: 'AVAILABLE',
                motherId: null,
                fatherId: null,
                race: 'raceId123'
            });
            await testRabbit.save();

            mockReq.params = { id: testRabbit._id.toString() };
            mockReq.body = {
                name: 'UpdatedRabbit',
                breed: 'UpdatedBreed'
            };

            // Act
            await rabbitController.editRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Conejo editado exitosamente',
                rabbit: expect.objectContaining({
                    name: 'UpdatedRabbit',
                    breed: 'UpdatedBreed'
                })
            });
        });

        test('should return 404 when editing non-existent rabbit', async () => {
            // Arrange
            const nonExistentId = '507f1f77bcf86cd799439011';
            mockReq.params = { id: nonExistentId };
            mockReq.body = { name: 'UpdatedName' };

            // Act
            await rabbitController.editRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Conejo no encontrado'
            });
        });

        test('should return validation errors for invalid edit data', async () => {
            // Arrange
            const testRabbit = new Rabbit({
                code: 'R001',
                name: 'TestRabbit'
            });
            await testRabbit.save();

            validateRabbitData.mockReturnValue(['Validation error']);
            mockReq.params = { id: testRabbit._id.toString() };
            mockReq.body = { name: '' };

            // Act
            await rabbitController.editRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Validation error'
            });
        });

        test('should handle database errors during edit', async () => {
            // Arrange
            const testRabbit = new Rabbit({
                code: 'R001',
                name: 'TestRabbit'
            });
            await testRabbit.save();

            mockReq.params = { id: testRabbit._id.toString() };
            mockReq.body = { name: 'UpdatedName' };

            jest.spyOn(Rabbit.prototype, 'save').mockRejectedValue(new Error('Database error'));

            // Act
            await rabbitController.editRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor',
                error: 'Database error'
            });
        });
    });

    describe('deleteRabbit', () => {
        test('should delete rabbit successfully', async () => {
            // Arrange
            const testRabbit = new Rabbit({
                code: 'R001',
                name: 'TestRabbit'
            });
            await testRabbit.save();

            mockReq.params = { id: testRabbit._id.toString() };

            // Act
            await rabbitController.deleteRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Conejo eliminado exitosamente'
            });
        });

        test('should return 404 when deleting non-existent rabbit', async () => {
            // Arrange
            const nonExistentId = '507f1f77bcf86cd799439011';
            mockReq.params = { id: nonExistentId };

            // Act
            await rabbitController.deleteRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Conejo no encontrado'
            });
        });

        test('should handle database errors during deletion', async () => {
            // Arrange
            const testRabbit = new Rabbit({
                code: 'R001',
                name: 'TestRabbit'
            });
            await testRabbit.save();

            mockReq.params = { id: testRabbit._id.toString() };

            jest.spyOn(Rabbit.prototype, 'deleteOne').mockRejectedValue(new Error('Database error'));

            // Act
            await rabbitController.deleteRabbit(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor',
                error: 'Database error'
            });
        });
    });

    describe('getAllRabbits', () => {
        test('should get all rabbits successfully', async () => {
            // Arrange
            const testRabbit1 = new Rabbit({
                code: 'R001',
                name: 'TestRabbit1'
            });

            const testRabbit2 = new Rabbit({
                code: 'R002',
                name: 'TestRabbit2'
            });

            await testRabbit1.save();
            await testRabbit2.save();

            // Act
            await rabbitController.getAllRabbits(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                rabbits: expect.arrayContaining([
                    expect.objectContaining({ code: 'R001' }),
                    expect.objectContaining({ code: 'R002' })
                ])
            });
        });

        test('should handle database errors when getting all rabbits', async () => {
            // Arrange
            jest.spyOn(Rabbit, 'find').mockRejectedValue(new Error('Database error'));

            // Act
            await rabbitController.getAllRabbits(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor',
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
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                races: expect.arrayContaining([
                    expect.objectContaining({ name: 'Race1' }),
                    expect.objectContaining({ name: 'Race2' })
                ])
            });
        });

        test('should handle database errors when getting races', async () => {
            // Arrange
            jest.spyOn(Race, 'find').mockRejectedValue(new Error('Database error'));

            // Act
            await rabbitController.getAvailableRaces(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor',
                error: 'Database error'
            });
        });
    });
});