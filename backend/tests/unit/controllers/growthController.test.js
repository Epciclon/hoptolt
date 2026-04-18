const growthController = require('../../../src/controllers/growthController');
const Rabbit = require('../../../src/models/rabbit');
const AssignRabbit = require('../../../src/models/assignRabbit');
const Cage = require('../../../src/models/cage');
const Race = require('../../../src/models/race');
const Vaccination = require('../../../src/models/vaccination');
const Deworming = require('../../../src/models/deworming');

// Mock de los modelos
jest.mock('../../../src/models/rabbit');
jest.mock('../../../src/models/assignRabbit');
jest.mock('../../../src/models/cage');
jest.mock('../../../src/models/race');
jest.mock('../../../src/models/vaccination');
jest.mock('../../../src/models/deworming');

describe('GrowthController', () => {
    let req, res;

    // Mock helper functions
    const mockRequest = (params = {}, body = {}) => ({ params, body });
    const mockResponse = () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res;
    };

    beforeEach(() => {
        req = mockRequest();
        res = mockResponse();
        jest.clearAllMocks();
    });

    describe('updateAgeAndGetRabbits', () => {
        test('should return 404 when no rabbits exist', async () => {
            Rabbit.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue([])
            });

            await growthController.updateAgeAndGetRabbits(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'No se encontraron conejos en el sistema'
            });
        });

        test('should successfully update ages and return rabbits with medical records', async () => {
            const mockRabbits = [
                {
                    _id: 'rabbit1',
                    code: 'R001',
                    race: 'Nueva Zelanda',
                    sex: 'hembra',
                    age: 6,
                    initialAge: 4,
                    weight: 3.2,
                    createdAt: new Date(Date.now() - 62 * 24 * 60 * 60 * 1000), // 2 months ago
                    save: jest.fn().mockResolvedValue()
                },
                {
                    _id: 'rabbit2',
                    code: 'R002',
                    race: 'California',
                    sex: 'macho',
                    age: 5,
                    initialAge: 5,
                    weight: 3.8,
                    createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 1 month ago
                    save: jest.fn().mockResolvedValue()
                }
            ];

            const mockAssignments = [
                { rabbitCode: 'R001', cageNumber: 'J001', status: 'asignado' }
            ];

            const mockRaces = [
                { name: 'Nueva Zelanda', characteristics: 'Raza productiva' },
                { name: 'California', characteristics: 'Raza mixta' }
            ];

            const mockVaccination = {
                codigo: 'R001',
                lastMixomatosisDate: new Date('2024-01-15'),
                lastVhdDate: new Date('2024-01-10')
            };

            const mockDeworming = {
                codigo: 'R001',
                lastDewormingDate: new Date('2024-01-20')
            };

            Rabbit.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockRabbits)
            });
            AssignRabbit.find.mockResolvedValue(mockAssignments);
            Race.find.mockResolvedValue(mockRaces);
            Vaccination.findOne.mockImplementation((query) => {
                if (query.codigo === 'R001') return Promise.resolve(mockVaccination);
                return Promise.resolve(null);
            });
            Deworming.findOne.mockImplementation((query) => {
                if (query.codigo === 'R001') return Promise.resolve(mockDeworming);
                return Promise.resolve(null);
            });

            await growthController.updateAgeAndGetRabbits(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: expect.stringContaining('La edad de los conejos ha sido actualizada'),
                data: {
                    rabbits: expect.arrayContaining([
                        expect.objectContaining({
                            code: 'R001',
                            race: expect.objectContaining({ name: 'Nueva Zelanda' }),
                            cage: { cageNumber: 'J001' },
                            lastVaccination: expect.any(String),
                            lastDeworming: expect.any(String)
                        }),
                        expect.objectContaining({
                            code: 'R002',
                            race: expect.objectContaining({ name: 'California' }),
                            cage: null,
                            lastVaccination: 'Sin registros',
                            lastDeworming: 'Sin registros'
                        })
                    ]),
                    updatedCount: expect.any(Number),
                    totalCount: 2
                }
            });
        });

        test('should initialize initialAge when not set', async () => {
            const mockRabbit = {
                _id: 'rabbit1',
                code: 'R001',
                race: 'Nueva Zelanda',
                sex: 'hembra',
                age: 6,
                initialAge: null,
                weight: 3.2,
                createdAt: new Date(),
                save: jest.fn().mockResolvedValue()
            };

            Rabbit.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue([mockRabbit])
            });
            AssignRabbit.find.mockResolvedValue([]);
            Race.find.mockResolvedValue([]);
            Vaccination.findOne.mockResolvedValue(null);
            Deworming.findOne.mockResolvedValue(null);

            await growthController.updateAgeAndGetRabbits(req, res);

            expect(mockRabbit.save).toHaveBeenCalled();
            expect(mockRabbit.initialAge).toBe(6);
        });

        test('should handle case when ages are already up to date', async () => {
            const mockRabbit = {
                _id: 'rabbit1',
                code: 'R001',
                race: 'Nueva Zelanda',
                sex: 'hembra',
                age: 5,
                initialAge: 5,
                weight: 3.2,
                createdAt: new Date(), // Today - no months passed
                save: jest.fn().mockResolvedValue()
            };

            Rabbit.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue([mockRabbit])
            });
            AssignRabbit.find.mockResolvedValue([]);
            Race.find.mockResolvedValue([]);
            Vaccination.findOne.mockResolvedValue(null);
            Deworming.findOne.mockResolvedValue(null);

            await growthController.updateAgeAndGetRabbits(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'No es necesario actualizar la edad de: R001',
                data: expect.objectContaining({
                    totalCount: 1
                })
            });
        });

        test('should handle months calculation with day adjustment', async () => {
            // Create a date where current day is less than registration day
            const pastDate = new Date('2024-01-15'); // 15th of month
            const currentDate = new Date('2024-03-10'); // 10th of month (day < registration day)
            
            // Mock Date constructor
            const originalDate = global.Date;
            global.Date = jest.fn().mockImplementation((dateString) => {
                if (!dateString) return currentDate;
                return new originalDate(dateString);
            });
            global.Date.now = originalDate.now;

            const mockRabbit = {
                _id: 'rabbit1',
                code: 'R001',
                race: 'Nueva Zelanda',
                sex: 'hembra',
                age: 4,
                initialAge: 4,
                weight: 3.2,
                createdAt: pastDate,
                save: jest.fn().mockResolvedValue()
            };

            Rabbit.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue([mockRabbit])
            });
            AssignRabbit.find.mockResolvedValue([]);
            Race.find.mockResolvedValue([]);
            Vaccination.findOne.mockResolvedValue(null);
            Deworming.findOne.mockResolvedValue(null);

            await growthController.updateAgeAndGetRabbits(req, res);

            // Restore original Date
            global.Date = originalDate;

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true
                })
            );
        });

        test('should handle empty message scenario', async () => {
            // Mock empty arrays to trigger !ageUpdateMessage condition
            Rabbit.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue([])
            });

            await growthController.updateAgeAndGetRabbits(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('should handle case when no update message is needed', async () => {
            const mockRabbit = {
                _id: 'rabbit1',
                code: 'R001',
                race: 'Nueva Zelanda',
                sex: 'hembra',
                age: 5,
                initialAge: 5,
                weight: 3.2,
                createdAt: new Date(),
                save: jest.fn().mockResolvedValue()
            };

            // Mock the scenario where no message is generated
            Rabbit.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue([mockRabbit])
            });
            AssignRabbit.find.mockResolvedValue([]);
            Race.find.mockResolvedValue([]);
            Vaccination.findOne.mockResolvedValue(null);
            Deworming.findOne.mockResolvedValue(null);

            await growthController.updateAgeAndGetRabbits(req, res);

            // Should still return success but with different message handling
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true
                })
            );
        });

        test('should handle database errors', async () => {
            Rabbit.find.mockReturnValue({
                sort: jest.fn().mockRejectedValue(new Error('Database error'))
            });

            await growthController.updateAgeAndGetRabbits(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor al procesar la solicitud'
            });
        });
    });

    describe('updateWeight', () => {
        test('should successfully update weight of rabbits', async () => {
            const mockRabbits = [
                {
                    _id: 'rabbit1',
                    code: 'R001',
                    weight: 3.0,
                    save: jest.fn().mockResolvedValue()
                },
                {
                    _id: 'rabbit2',
                    code: 'R002',
                    weight: 2.5,
                    save: jest.fn().mockResolvedValue()
                }
            ];

            Rabbit.find.mockResolvedValue(mockRabbits);

            req.body = {
                rabbitIds: ['rabbit1', 'rabbit2'],
                weightChange: 0.5
            };

            await growthController.updateWeight(req, res);

            expect(mockRabbits[0].weight).toBe(3.5);
            expect(mockRabbits[1].weight).toBe(3.0);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Se actualizó el peso de 2 conejo(s) exitosamente',
                data: {
                    successful: expect.arrayContaining([
                        expect.objectContaining({
                            code: 'R001',
                            previousWeight: 3.0,
                            newWeight: 3.5,
                            change: 0.5
                        }),
                        expect.objectContaining({
                            code: 'R002',
                            previousWeight: 2.5,
                            newWeight: 3.0,
                            change: 0.5
                        })
                    ]),
                    totalUpdated: 2,
                    totalRequested: 2
                }
            });
        });

        test('should return 400 when rabbitIds is invalid', async () => {
            req.body = {
                rabbitIds: [],
                weightChange: 0.5
            };

            await growthController.updateWeight(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Debe proporcionar una lista válida de IDs de conejos'
            });
        });

        test('should return 400 when weightChange is zero', async () => {
            req.body = {
                rabbitIds: ['rabbit1'],
                weightChange: 0
            };

            await growthController.updateWeight(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'El cambio de peso debe ser un número diferente de cero'
            });
        });

        test('should return 400 when weightChange exceeds maximum', async () => {
            req.body = {
                rabbitIds: ['rabbit1'],
                weightChange: 5.0
            };

            await growthController.updateWeight(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'El cambio de peso no puede ser mayor a 4.5 kg en valor absoluto'
            });
        });

        test('should return 404 when no rabbits found', async () => {
            Rabbit.find.mockResolvedValue([]);

            req.body = {
                rabbitIds: ['rabbit1'],
                weightChange: 0.5
            };

            await growthController.updateWeight(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'No se encontraron conejos con los IDs proporcionados'
            });
        });

        test('should reject weight update below minimum threshold', async () => {
            const mockRabbit = {
                _id: 'rabbit1',
                code: 'R001',
                weight: 2.2,
                save: jest.fn().mockResolvedValue()
            };

            Rabbit.find.mockResolvedValue([mockRabbit]);

            req.body = {
                rabbitIds: ['rabbit1'],
                weightChange: -0.5 // Would result in 1.7 kg, below 2.0 kg minimum
            };

            await growthController.updateWeight(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    errors: expect.arrayContaining([
                        expect.objectContaining({
                            code: 'R001',
                            message: expect.stringContaining('Peso resultante (1.70 kg) está por debajo del mínimo permitido')
                        })
                    ])
                })
            );
        });

        test('should reject weight update above maximum absolute weight', async () => {
            const mockRabbit = {
                _id: 'rabbit1',
                code: 'R001',
                weight: 4.8,
                save: jest.fn().mockResolvedValue()
            };

            Rabbit.find.mockResolvedValue([mockRabbit]);

            req.body = {
                rabbitIds: ['rabbit1'],
                weightChange: 0.5 // Would result in 5.3 kg, above 5.0 kg maximum
            };

            await growthController.updateWeight(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    errors: expect.arrayContaining([
                        expect.objectContaining({
                            code: 'R001',
                            message: expect.stringContaining('Peso resultante (5.30 kg) excede el máximo absoluto permitido')
                        })
                    ])
                })
            );
        });

        test('should generate warning for weight above warning threshold', async () => {
            const mockRabbit = {
                _id: 'rabbit1',
                code: 'R001',
                weight: 4.2,
                save: jest.fn().mockResolvedValue()
            };

            Rabbit.find.mockResolvedValue([mockRabbit]);

            req.body = {
                rabbitIds: ['rabbit1'],
                weightChange: 0.5 // Would result in 4.7 kg, above 4.5 kg warning threshold
            };

            await growthController.updateWeight(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    warnings: expect.arrayContaining([
                        expect.objectContaining({
                            code: 'R001',
                            message: expect.stringContaining('ALERTA: Peso resultante (4.70 kg) supera el límite recomendado')
                        })
                    ]),
                    warningMessage: 'Advertencias encontradas'
                })
            );
        });

        test('should handle individual rabbit save errors', async () => {
            const mockRabbit = {
                _id: 'rabbit1',
                code: 'R001',
                weight: 3.0,
                save: jest.fn().mockRejectedValue(new Error('Save failed'))
            };

            Rabbit.find.mockResolvedValue([mockRabbit]);

            req.body = {
                rabbitIds: ['rabbit1'],
                weightChange: 0.5
            };

            await growthController.updateWeight(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    errors: expect.arrayContaining([
                        expect.objectContaining({
                            code: 'R001',
                            error: 'Save failed'
                        })
                    ])
                })
            );
        });

        test('should handle database errors', async () => {
            Rabbit.find.mockRejectedValue(new Error('Database error'));

            req.body = {
                rabbitIds: ['rabbit1'],
                weightChange: 0.5
            };

            await growthController.updateWeight(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor al actualizar el peso'
            });
        });

        test('should handle missing rabbitIds', async () => {
            req.body = {
                weightChange: 0.5
            };

            await growthController.updateWeight(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Debe proporcionar una lista válida de IDs de conejos'
            });
        });

        test('should handle non-array rabbitIds', async () => {
            req.body = {
                rabbitIds: 'rabbit1',
                weightChange: 0.5
            };

            await growthController.updateWeight(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Debe proporcionar una lista válida de IDs de conejos'
            });
        });

        test('should handle undefined weightChange', async () => {
            req.body = {
                rabbitIds: ['rabbit1']
            };

            await growthController.updateWeight(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'El cambio de peso debe ser un número diferente de cero'
            });
        });

        test('should handle null weightChange', async () => {
            req.body = {
                rabbitIds: ['rabbit1'],
                weightChange: null
            };

            await growthController.updateWeight(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'El cambio de peso debe ser un número diferente de cero'
            });
        });

        test('should handle NaN weightChange', async () => {
            req.body = {
                rabbitIds: ['rabbit1'],
                weightChange: 'not a number'
            };

            await growthController.updateWeight(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'El cambio de peso debe ser un número diferente de cero'
            });
        });
    });
});
