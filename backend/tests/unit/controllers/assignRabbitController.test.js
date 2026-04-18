const assignRabbitController = require('../../../src/controllers/assignRabbitController');
const AssignRabbit = require('../../../src/models/assignRabbit');
const Cage = require('../../../src/models/cage');

// Mock de los modelos
jest.mock('../../../src/models/assignRabbit');
jest.mock('../../../src/models/cage');

describe('AssignRabbitController', () => {
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

    describe('assignRabbit', () => {
        test('should successfully assign rabbit to cage', async () => {
            const cageData = {
                number: 'J001',
                type: 'reproductora',
                capacity: 2
            };
            
            Cage.findOne.mockResolvedValue(cageData);
            AssignRabbit.countDocuments.mockResolvedValue(0);
            AssignRabbit.findOne.mockResolvedValue(null);
            
            const mockSave = jest.fn().mockResolvedValue({
                cageNumber: 'J001',
                cageType: 'reproductora',
                cageCapacity: 2,
                rabbitCode: 'R001',
                status: 'asignado'
            });
            AssignRabbit.mockImplementation(() => ({ save: mockSave }));

            req.body = {
                cageNumber: 'J001',
                rabbitCode: 'R001'
            };

            await assignRabbitController.assignRabbit(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Asignación registrada exitosamente.',
                assign: expect.any(Object)
            });
        });

        test('should return 400 when cage does not exist', async () => {
            Cage.findOne.mockResolvedValue(null);

            req.body = {
                cageNumber: 'J999',
                rabbitCode: 'R001'
            };

            await assignRabbitController.assignRabbit(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'La jaula seleccionada no existe.'
            });
        });

        test('should return 400 when rabbitCode is not provided', async () => {
            const cageData = {
                number: 'J001',
                type: 'reproductora',
                capacity: 2
            };
            
            Cage.findOne.mockResolvedValue(cageData);

            req.body = {
                cageNumber: 'J001'
                // rabbitCode missing
            };

            await assignRabbitController.assignRabbit(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Debe proporcionar el código del conejo.'
            });
        });

        test('should return 400 when cage capacity is exceeded', async () => {
            const cageData = {
                number: 'J001',
                type: 'reproductora',
                capacity: 2
            };
            
            Cage.findOne.mockResolvedValue(cageData);
            AssignRabbit.countDocuments.mockResolvedValue(2); // Already at capacity

            req.body = {
                cageNumber: 'J001',
                rabbitCode: 'R001'
            };

            await assignRabbitController.assignRabbit(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'La capacidad de la jaula ha sido superada.'
            });
        });

        test('should return 400 when rabbit is already assigned', async () => {
            const cageData = {
                number: 'J001',
                type: 'reproductora',
                capacity: 2
            };
            
            Cage.findOne.mockResolvedValue(cageData);
            AssignRabbit.countDocuments.mockResolvedValue(0);
            AssignRabbit.findOne.mockResolvedValue({
                rabbitCode: 'R001',
                cageNumber: 'J002',
                status: 'asignado'
            });

            req.body = {
                cageNumber: 'J001',
                rabbitCode: 'R001'
            };

            await assignRabbitController.assignRabbit(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'El conejo ya está asignado a una jaula.'
            });
        });

        test('should return 500 when database error occurs', async () => {
            Cage.findOne.mockRejectedValue(new Error('Database connection failed'));

            req.body = {
                cageNumber: 'J001',
                rabbitCode: 'R001'
            };

            await assignRabbitController.assignRabbit(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al asignar conejo a jaula.',
                error: 'Database connection failed'
            });
        });
    });

    describe('getAssignments', () => {
        test('should return all assignments successfully', async () => {
            const mockAssignments = [
                {
                    cageNumber: 'J001',
                    rabbitCode: 'R001',
                    status: 'asignado'
                },
                {
                    cageNumber: 'J002',
                    rabbitCode: 'R002',
                    status: 'asignado'
                }
            ];

            AssignRabbit.find.mockResolvedValue(mockAssignments);

            await assignRabbitController.getAssignments(req, res);

            expect(AssignRabbit.find).toHaveBeenCalledWith({ status: 'asignado' });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockAssignments);
        });

        test('should return empty array when no assignments exist', async () => {
            AssignRabbit.find.mockResolvedValue([]);

            await assignRabbitController.getAssignments(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([]);
        });

        test('should return 500 when database error occurs', async () => {
            AssignRabbit.find.mockRejectedValue(new Error('Database error'));

            await assignRabbitController.getAssignments(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al obtener asignaciones.',
                error: 'Database error'
            });
        });
    });

    describe('unassignRabbit', () => {
        test('should successfully unassign rabbit from cage', async () => {
            const mockAssignment = {
                rabbitCode: 'R001',
                cageNumber: 'J001',
                status: 'asignado'
            };

            AssignRabbit.findOne.mockResolvedValue(mockAssignment);
            AssignRabbit.deleteOne.mockResolvedValue({ deletedCount: 1 });

            req.body = {
                rabbitCode: 'R001'
            };

            await assignRabbitController.unassignRabbit(req, res);

            expect(AssignRabbit.findOne).toHaveBeenCalledWith({
                rabbitCode: 'R001',
                status: 'asignado'
            });
            expect(AssignRabbit.deleteOne).toHaveBeenCalledWith({
                rabbitCode: 'R001',
                status: 'asignado'
            });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Asignación eliminada exitosamente.'
            });
        });

        test('should return 404 when rabbit is not assigned', async () => {
            AssignRabbit.findOne.mockResolvedValue(null);

            req.body = {
                rabbitCode: 'R001'
            };

            await assignRabbitController.unassignRabbit(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'El conejo no está asignado a ninguna jaula.'
            });
        });

        test('should return 500 when database error occurs', async () => {
            AssignRabbit.findOne.mockRejectedValue(new Error('Database error'));

            req.body = {
                rabbitCode: 'R001'
            };

            await assignRabbitController.unassignRabbit(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al quitar asignación.',
                error: 'Database error'
            });
        });
    });

    describe('deleteAssignmentByRabbitCode', () => {
        test('should successfully delete assignment by rabbit code', async () => {
            const mockAssignment = {
                rabbitCode: 'R001',
                cageNumber: 'J001',
                status: 'asignado'
            };

            AssignRabbit.findOne.mockResolvedValue(mockAssignment);
            AssignRabbit.deleteOne.mockResolvedValue({ deletedCount: 1 });

            req.params = {
                rabbitCode: 'R001'
            };

            await assignRabbitController.deleteAssignmentByRabbitCode(req, res);

            expect(AssignRabbit.findOne).toHaveBeenCalledWith({
                rabbitCode: 'R001',
                status: 'asignado'
            });
            expect(AssignRabbit.deleteOne).toHaveBeenCalledWith({
                rabbitCode: 'R001',
                status: 'asignado'
            });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Asignación eliminada exitosamente.'
            });
        });

        test('should return 404 when rabbit is not assigned', async () => {
            AssignRabbit.findOne.mockResolvedValue(null);

            req.params = {
                rabbitCode: 'R001'
            };

            await assignRabbitController.deleteAssignmentByRabbitCode(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'El conejo no está asignado a ninguna jaula.'
            });
        });

        test('should return 500 when database error occurs', async () => {
            AssignRabbit.findOne.mockRejectedValue(new Error('Database error'));

            req.params = {
                rabbitCode: 'R001'
            };

            await assignRabbitController.deleteAssignmentByRabbitCode(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al eliminar asignación.',
                error: 'Database error'
            });
        });
    });
});
