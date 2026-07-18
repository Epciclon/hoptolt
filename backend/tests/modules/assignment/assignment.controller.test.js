jest.mock('../../../src/modules/assignment/assignment.service');
const assignmentService = require('../../../src/modules/assignment/assignment.service');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const assignmentController = require('../../../src/modules/assignment/assignment.controller');

describe('AssignmentController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
    next = jest.fn();
  });

  describe('assignRabbits', () => {
    it('should call assignRabbits and return 201', async () => {
      req = {
        body: { assignments: [{ rabbitId: 1, cageId: 1 }] },
        galponId: 1
      };
      assignmentService.assignRabbits.mockResolvedValue({
        assignments: [{ id: 'a1' }],
        warnings: []
      });

      await assignmentController.assignRabbits(req, res, next);

      expect(assignmentService.assignRabbits).toHaveBeenCalledWith(req.body, 1);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        assignments: expect.any(Array),
        warnings: expect.any(Array)
      }));
    });
  });

  describe('getAssignments', () => {
    it('should call getAssignments and return 200', async () => {
      req = { galponId: 1 };
      assignmentService.getAssignments.mockResolvedValue([{ id: 'a1' }]);

      await assignmentController.getAssignments(req, res, next);

      expect(assignmentService.getAssignments).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getAssignedRabbits', () => {
    it('should call getAssignedRabbits and return 200', async () => {
      req = { galponId: 1 };
      assignmentService.getAssignedRabbits.mockResolvedValue([{ id: 1, code: 'R1' }]);

      await assignmentController.getAssignedRabbits(req, res, next);

      expect(assignmentService.getAssignedRabbits).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, rabbits: [{ id: 1, code: 'R1' }] });
    });
  });

  describe('getAvailableRabbits', () => {
    it('should call getAvailableRabbits and return 200', async () => {
      req = { galponId: 1 };
      assignmentService.getAvailableRabbits.mockResolvedValue([{ id: 1, code: 'R1' }]);

      await assignmentController.getAvailableRabbits(req, res, next);

      expect(assignmentService.getAvailableRabbits).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getOperativeCages', () => {
    it('should call getOperativeCages and return 200', async () => {
      req = { galponId: 1 };
      assignmentService.getOperativeCages.mockResolvedValue([{ id: 1, number: 'C1' }]);

      await assignmentController.getOperativeCages(req, res, next);

      expect(assignmentService.getOperativeCages).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('unassignRabbit', () => {
    it('should call unassignRabbit and return 200', async () => {
      req = { params: { id: '1' } };
      assignmentService.unassignRabbit.mockResolvedValue();

      await assignmentController.unassignRabbit(req, res, next);

      expect(assignmentService.unassignRabbit).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
