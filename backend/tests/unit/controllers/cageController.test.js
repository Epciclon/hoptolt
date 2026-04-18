const cageController = require('../../../src/controllers/cageController');
const Cage = require('../../../src/models/cage');
const { validateCageData } = require('../../../src/utils/cageValidations');
const { createTestCage } = require('../../helpers/testHelpers');

// Mock dependencies
jest.mock('../../../src/utils/cageValidations');

describe('Cage Controller', () => {
    let mockReq, mockRes;

    beforeEach(async () => {
        await Cage.deleteMany({});
        
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
        validateCageData.mockReturnValue([]);
    });

    describe('registerCage', () => {
        test('should register cage successfully', async () => {
            // Arrange
            mockReq.body = {
                number: 1,
                type: 'engorde',
                capacity: 5
            };

            // Act
            await cageController.registerCage(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Jaula registrada con éxito',
                cage: expect.objectContaining({
                    number: 1,
                    type: 'engorde',
                    capacity: 5
                })
            });
        });

        test('should return validation errors for invalid data', async () => {
            // Arrange
            const validationErrors = ['El número es requerido'];
            validateCageData.mockReturnValue(validationErrors);

            // Act
            await cageController.registerCage(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                errors: validationErrors
            });
        });

        test('should return error for duplicate cage number', async () => {
            // Arrange
            await createTestCage({ number: 1 });

            mockReq.body = {
                number: 1,
                type: 'engorde',
                capacity: 5
            };

            // Act
            await cageController.registerCage(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                errors: ['El número de jaula ya existe.']
            });
        });

        test('should handle database errors during registration', async () => {
            // Arrange
            mockReq.body = {
                number: 1,
                type: 'engorde',
                capacity: 5
            };

            const saveSpy = jest.spyOn(Cage.prototype, 'save').mockRejectedValue(new Error('Database error'));

            // Act
            await cageController.registerCage(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Error en la base de datos',
                error: 'Database error'
            });

            // Cleanup
            saveSpy.mockRestore();
        });
    });

    describe('getCage', () => {
        let testCage;

        beforeEach(async () => {
            testCage = await createTestCage();
        });

        test('should get cage by number successfully', async () => {
            // Arrange
            mockReq.params = { number: testCage.number.toString() };

            // Act
            await cageController.getCage(mockReq, mockRes);

            // Assert
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    number: testCage.number,
                    type: testCage.type,
                    capacity: testCage.capacity
                })
            );
        });

        test('should return error for invalid cage number format', async () => {
            // Arrange
            mockReq.params = { number: 'invalid' };

            // Act
            await cageController.getCage(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Sólo números enteros positivos.'
            });
        });

        test('should return error for negative cage number', async () => {
            // Arrange
            mockReq.params = { number: '-1' };

            // Act
            await cageController.getCage(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Sólo números enteros positivos.'
            });
        });

        test('should return error for zero cage number', async () => {
            // Arrange
            mockReq.params = { number: '0' };

            // Act
            await cageController.getCage(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Sólo números enteros positivos.'
            });
        });

        test('should return 404 when cage not found', async () => {
            // Arrange
            mockReq.params = { number: '999' };

            // Act
            await cageController.getCage(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'No se encontraron jaulas.'
            });
        });

        test('should handle database errors when getting cage', async () => {
            // Arrange
            mockReq.params = { number: '1' };
            const findOneSpy = jest.spyOn(Cage, 'findOne').mockRejectedValue(new Error('Database error'));

            // Act
            await cageController.getCage(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Error en la base de datos',
                error: 'Database error'
            });

            // Cleanup
            findOneSpy.mockRestore();
        });
    });

    describe('getAllCages', () => {
        test('should get all cages successfully', async () => {
            // Arrange
            await createTestCage({ number: 1 });
            await createTestCage({ number: 2 });

            // Act
            await cageController.getAllCages(mockReq, mockRes);

            // Assert
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ number: 1 }),
                    expect.objectContaining({ number: 2 })
                ])
            );
        });

        test('should handle database errors when getting all cages', async () => {
            // Arrange
            const findSpy = jest.spyOn(Cage, 'find').mockRejectedValue(new Error('Database error'));

            // Act
            await cageController.getAllCages(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Error en la base de datos',
                error: 'Database error'
            });

            // Cleanup
            findSpy.mockRestore();
        });
    });

    describe('editCage', () => {
        test('should edit cage successfully', async () => {
            // Arrange
            await createTestCage({ number: 1, type: 'engorde', capacity: 5 });
            mockReq.params = { number: '1' };
            mockReq.body = {
                type: 'reproducción',
                capacity: 1
            };

            // Act
            await cageController.editCage(mockReq, mockRes);

            // Assert
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Jaula editada con éxito',
                cage: expect.objectContaining({
                    number: 1,
                    type: 'reproducción',
                    capacity: 1
                })
            });
        });

        test('should return validation errors for invalid edit data', async () => {
            // Arrange
            const validationErrors = ['Tipo inválido'];
            validateCageData.mockReturnValue(validationErrors);
            
            mockReq.params = { number: '1' };
            mockReq.body = {
                type: 'invalid',
                capacity: 1
            };

            // Act
            await cageController.editCage(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                errors: validationErrors
            });
        });

        test('should return 404 when editing non-existent cage', async () => {
            // Arrange
            mockReq.params = { number: '999' };
            mockReq.body = {
                type: 'engorde',
                capacity: 5
            };

            // Act
            await cageController.editCage(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'No se encontró la jaula.'
            });
        });

        test('should handle database errors during edit', async () => {
            // Arrange
            mockReq.params = { number: '1' };
            mockReq.body = {
                type: 'engorde',
                capacity: 5
            };

            const findOneAndUpdateSpy = jest.spyOn(Cage, 'findOneAndUpdate').mockRejectedValue(new Error('Database error'));

            // Act
            await cageController.editCage(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Error en la base de datos',
                error: 'Database error'
            });

            // Cleanup
            findOneAndUpdateSpy.mockRestore();
        });
    });

    describe('deleteCage', () => {
        test('should delete cage successfully', async () => {
            // Arrange
            await createTestCage({ number: 1 });
            mockReq.params = { number: '1' };

            // Act
            await cageController.deleteCage(mockReq, mockRes);

            // Assert
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Jaula eliminada correctamente.'
            });
        });

        test('should return 404 when deleting non-existent cage', async () => {
            // Arrange
            mockReq.params = { number: '999' };

            // Act
            await cageController.deleteCage(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'No se encontró la jaula.'
            });
        });

        test('should handle database errors during deletion', async () => {
            // Arrange
            mockReq.params = { number: '1' };
            const findOneAndDeleteSpy = jest.spyOn(Cage, 'findOneAndDelete').mockRejectedValue(new Error('Database error'));

            // Act
            await cageController.deleteCage(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Error en la base de datos',
                error: 'Database error'
            });

            // Cleanup
            findOneAndDeleteSpy.mockRestore();
        });
    });
});
