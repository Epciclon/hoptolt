const raceController = require('../../../src/controllers/raceController');
const Race = require('../../../src/models/race');

describe('Race Controller', () => {
    let mockReq, mockRes;

    beforeEach(async () => {
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

        // Reset all mocks
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    describe('registerRace', () => {
        test('should register race successfully', async () => {
            // Arrange
            mockReq.body = {
                name: 'Nueva Zelanda',
                description: 'Raza de tamaño mediano, ideal para producción de carne'
            };

            // Act
            await raceController.registerRace(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Raza registrada exitosamente.',
                race: expect.objectContaining({
                    name: 'Nueva Zelanda',
                    description: 'Raza de tamaño mediano, ideal para producción de carne'
                })
            });
        });

        test('should return error if name is missing', async () => {
            // Arrange
            mockReq.body = {
                description: 'Descripción válida'
            };

            // Act
            await raceController.registerRace(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Nombre y descripción son obligatorios.'
            });
        });

        test('should return error if description is missing', async () => {
            // Arrange
            mockReq.body = {
                name: 'Nombre válido'
            };

            // Act
            await raceController.registerRace(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Nombre y descripción son obligatorios.'
            });
        });

        test('should return error if name is too short', async () => {
            // Arrange
            mockReq.body = {
                name: 'A',
                description: 'Descripción válida'
            };

            // Act
            await raceController.registerRace(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'El nombre debe tener al menos 2 caracteres.'
            });
        });

        test('should return error if description is too short', async () => {
            // Arrange
            mockReq.body = {
                name: 'Nombre válido',
                description: 'Test'
            };

            // Act
            await raceController.registerRace(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'La descripción debe tener al menos 5 caracteres.'
            });
        });

        test('should return error if race name already exists', async () => {
            // Arrange
            const existingRace = new Race({
                name: 'Nueva Zelanda',
                description: 'Descripción existente'
            });
            await existingRace.save();

            mockReq.body = {
                name: 'Nueva Zelanda',
                description: 'Nueva descripción'
            };

            // Act
            await raceController.registerRace(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Ya existe una raza con ese nombre.'
            });
        });

        test('should handle database errors during registration', async () => {
            // Arrange
            mockReq.body = {
                name: 'Nueva Zelanda',
                description: 'Descripción válida'
            };

            jest.spyOn(Race.prototype, 'save').mockRejectedValue(new Error('Database error'));

            // Act
            await raceController.registerRace(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Error al registrar la raza.',
                error: 'Database error'
            });
        });

        test('should trim whitespace from name and description', async () => {
            // Arrange
            mockReq.body = {
                name: '  Nueva Zelanda  ',
                description: '  Descripción con espacios  '
            };

            // Act
            await raceController.registerRace(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Raza registrada exitosamente.',
                race: expect.objectContaining({
                    name: 'Nueva Zelanda',
                    description: 'Descripción con espacios'
                })
            });
        });
    });

    describe('getRaceByName', () => {
        test('should get race by name successfully', async () => {
            // Arrange
            const testRace = new Race({
                name: 'Nueva Zelanda',
                description: 'Raza de tamaño mediano'
            });
            await testRace.save();

            mockReq.query = { name: 'Nueva Zelanda' };

            // Act
            await raceController.getRaceByName(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                name: 'Nueva Zelanda',
                description: 'Raza de tamaño mediano'
            });
        });

        test('should return 404 when race not found', async () => {
            // Arrange
            mockReq.query = { name: 'Raza inexistente' };

            // Act
            await raceController.getRaceByName(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Raza no encontrada.'
            });
        });

        test('should return error if name is missing', async () => {
            // Arrange
            mockReq.query = {};

            // Act
            await raceController.getRaceByName(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Debe ingresar un nombre de raza válido (mínimo 2 caracteres).'
            });
        });

        test('should return error if name is too short', async () => {
            // Arrange
            mockReq.query = { name: 'A' };

            // Act
            await raceController.getRaceByName(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Debe ingresar un nombre de raza válido (mínimo 2 caracteres).'
            });
        });

        test('should handle database errors when getting race', async () => {
            // Arrange
            mockReq.query = { name: 'Nueva Zelanda' };
            jest.spyOn(Race, 'findOne').mockRejectedValue(new Error('Database error'));

            // Act
            await raceController.getRaceByName(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Error al consultar la raza.',
                error: 'Database error'
            });
        });

        test('should trim whitespace from name query', async () => {
            // Arrange
            const testRace = new Race({
                name: 'Nueva Zelanda',
                description: 'Raza de tamaño mediano'
            });
            await testRace.save();

            mockReq.query = { name: '  Nueva Zelanda  ' };

            // Act
            await raceController.getRaceByName(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                name: 'Nueva Zelanda',
                description: 'Raza de tamaño mediano'
            });
        });
    });

    describe('getAllRaces', () => {
        test('should get all races successfully', async () => {
            // Arrange
            const testRace1 = new Race({
                name: 'Nueva Zelanda',
                description: 'Descripción 1'
            });

            const testRace2 = new Race({
                name: 'California',
                description: 'Descripción 2'
            });

            await testRace1.save();
            await testRace2.save();

            // Act
            await raceController.getAllRaces(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ name: 'Nueva Zelanda' }),
                    expect.objectContaining({ name: 'California' })
                ])
            );
        });

        test('should return empty array when no races exist', async () => {
            // Act
            await raceController.getAllRaces(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith([]);
        });

        test('should handle database errors when getting all races', async () => {
            // Arrange
            jest.spyOn(Race, 'find').mockRejectedValue(new Error('Database error'));

            // Act
            await raceController.getAllRaces(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Error al obtener las razas.',
                error: 'Database error'
            });
        });
    });

    describe('editRaceDescription', () => {
        test('should edit race description successfully', async () => {
            // Arrange
            const testRace = new Race({
                name: 'Nueva Zelanda',
                description: 'Descripción original'
            });
            await testRace.save();

            mockReq.params = { name: 'Nueva Zelanda' };
            mockReq.body = { description: 'Nueva descripción actualizada' };

            // Act
            await raceController.editRaceDescription(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Raza editada exitosamente.',
                race: expect.objectContaining({
                    name: 'Nueva Zelanda',
                    description: 'Nueva descripción actualizada'
                })
            });
        });

        test('should return 404 when editing non-existent race', async () => {
            // Arrange
            mockReq.params = { name: 'Raza inexistente' };
            mockReq.body = { description: 'Nueva descripción' };

            // Act
            await raceController.editRaceDescription(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Raza no encontrada.'
            });
        });

        test('should return error if description is missing', async () => {
            // Arrange
            mockReq.params = { name: 'Nueva Zelanda' };
            mockReq.body = {};

            // Act
            await raceController.editRaceDescription(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'La descripción debe tener al menos 5 caracteres.'
            });
        });

        test('should return error if description is too short', async () => {
            // Arrange
            mockReq.params = { name: 'Nueva Zelanda' };
            mockReq.body = { description: 'Test' };

            // Act
            await raceController.editRaceDescription(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'La descripción debe tener al menos 5 caracteres.'
            });
        });

        test('should handle database errors during edit', async () => {
            // Arrange
            mockReq.params = { name: 'Nueva Zelanda' };
            mockReq.body = { description: 'Nueva descripción válida' };

            jest.spyOn(Race, 'findOneAndUpdate').mockRejectedValue(new Error('Database error'));

            // Act
            await raceController.editRaceDescription(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Error al editar la raza.',
                error: 'Database error'
            });
        });

        test('should trim whitespace from name and description', async () => {
            // Arrange
            const testRace = new Race({
                name: 'Nueva Zelanda',
                description: 'Descripción original'
            });
            await testRace.save();

            mockReq.params = { name: '  Nueva Zelanda  ' };
            mockReq.body = { description: '  Nueva descripción  ' };

            // Act
            await raceController.editRaceDescription(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Raza editada exitosamente.',
                race: expect.objectContaining({
                    name: 'Nueva Zelanda',
                    description: 'Nueva descripción'
                })
            });
        });
    });

    describe('deleteRace', () => {
        test('should delete race successfully', async () => {
            // Arrange
            const testRace = new Race({
                name: 'Nueva Zelanda',
                description: 'Descripción de prueba'
            });
            await testRace.save();

            mockReq.params = { name: 'Nueva Zelanda' };

            // Act
            await raceController.deleteRace(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Raza eliminada con éxito.'
            });
        });

        test('should return 404 when deleting non-existent race', async () => {
            // Arrange
            mockReq.params = { name: 'Raza inexistente' };

            // Act
            await raceController.deleteRace(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Raza no encontrada.'
            });
        });

        test('should handle database errors during deletion', async () => {
            // Arrange
            mockReq.params = { name: 'Nueva Zelanda' };
            jest.spyOn(Race, 'findOneAndDelete').mockRejectedValue(new Error('Database error'));

            // Act
            await raceController.deleteRace(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Error al eliminar la raza.',
                error: 'Database error'
            });
        });

        test('should trim whitespace from name parameter', async () => {
            // Arrange
            const testRace = new Race({
                name: 'Nueva Zelanda',
                description: 'Descripción de prueba'
            });
            await testRace.save();

            mockReq.params = { name: '  Nueva Zelanda  ' };

            // Act
            await raceController.deleteRace(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Raza eliminada con éxito.'
            });
        });
    });
});
