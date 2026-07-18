require('../../setup');

jest.mock('../../../src/modules/assignment/assignment.repository');
jest.mock('../../../src/modules/cage/cage.repository');
jest.mock('../../../src/modules/rabbit/rabbit.repository');
jest.mock('../../../src/modules/notification/notification.service', () => ({
  createRabbitAssignmentNotification: jest.fn().mockResolvedValue(undefined),
}));

const assignmentRepository = require('../../../src/modules/assignment/assignment.repository');
const cageRepository = require('../../../src/modules/cage/cage.repository');
const rabbitRepository = require('../../../src/modules/rabbit/rabbit.repository');
const assignmentService = require('../../../src/modules/assignment/assignment.service');
const notificationService = require('../../../src/modules/notification/notification.service');

describe('AssignmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateCompatibility', () => {
    it('allows compatible rabbits in engorde cage', () => {
      const cage = { type: 'engorde' };
      const rabbits = [
        { purpose: 'Engorde', sex: 'macho', birthDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
      ];
      const result = assignmentService.validateCompatibility(cage, rabbits, []);
      expect(result).toEqual([]);
    });

    it('throws when mixing purposes in engorde', () => {
      const cage = { type: 'engorde' };
      const rabbits = [
        { purpose: 'Engorde', sex: 'macho', birthDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
        { purpose: 'Reproducción', sex: 'hembra', birthDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
      ];
      expect(() => assignmentService.validateCompatibility(cage, rabbits, [])).toThrow();
    });

    it('throws when mixing sexes in engorde', () => {
      const cage = { type: 'engorde' };
      const rabbits = [
        { purpose: 'Engorde', sex: 'macho', birthDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
        { purpose: 'Engorde', sex: 'hembra', birthDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
      ];
      expect(() => assignmentService.validateCompatibility(cage, rabbits, [])).toThrow();
    });

    it('throws when engorde rabbits have >1 month age gap', () => {
      const cage = { type: 'engorde' };
      const rabbits = [
        { purpose: 'Engorde', sex: 'macho', birthDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
        { purpose: 'Engorde', sex: 'macho', birthDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
      ];
      expect(() => assignmentService.validateCompatibility(cage, rabbits, [])).toThrow();
    });

    it('throws when assigning Engorde rabbit to reproducción cage', () => {
      const cage = { type: 'reproducción' };
      const rabbits = [{ purpose: 'Engorde', sex: 'macho' }];
      expect(() => assignmentService.validateCompatibility(cage, rabbits, [])).toThrow();
    });
  });

  describe('assignRabbits', () => {
    beforeEach(() => {
      cageRepository.findById.mockResolvedValue({ id: 1, galponId: 1, status: 'operativa', capacity: 8 });
      rabbitRepository.findById.mockResolvedValue({ id: 1, code: 'R001', name: 'Bunny', galponId: 1, purpose: 'Engorde', sex: 'macho', birthDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() });
      assignmentRepository.countActiveByCageId.mockResolvedValue(0);
      assignmentRepository.findActiveByRabbitId.mockResolvedValue(null);
      assignmentRepository.findActiveByCageId.mockResolvedValue([]);
      assignmentRepository.create.mockResolvedValue({ id: 1, cageId: 1, rabbitId: 1, status: 'asignado' });
    });

    it('assigns rabbits to cage', async () => {
      const result = await assignmentService.assignRabbits({ cageId: 1, rabbitIds: [1] }, 1);
      expect(result.assignments).toHaveLength(1);
      expect(notificationService.createRabbitAssignmentNotification).toHaveBeenCalled();
    });

    it('throws when no rabbitIds provided', async () => {
      await expect(assignmentService.assignRabbits({ cageId: 1, rabbitIds: [] }, 1)).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws when cage not found', async () => {
      cageRepository.findById.mockResolvedValue(null);
      await expect(assignmentService.assignRabbits({ cageId: 999, rabbitIds: [1] }, 1)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws when cage not in galpon', async () => {
      cageRepository.findById.mockResolvedValue({ id: 1, galponId: 999, status: 'operativa' });
      await expect(assignmentService.assignRabbits({ cageId: 1, rabbitIds: [1] }, 1)).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws when cage not operative', async () => {
      cageRepository.findById.mockResolvedValue({ id: 1, galponId: 1, status: 'mantenimiento' });
      await expect(assignmentService.assignRabbits({ cageId: 1, rabbitIds: [1] }, 1)).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws when capacity exceeded', async () => {
      cageRepository.findById.mockResolvedValue({ id: 1, galponId: 1, status: 'operativa', capacity: 1 });
      assignmentRepository.countActiveByCageId.mockResolvedValue(1);
      await expect(assignmentService.assignRabbits({ cageId: 1, rabbitIds: [1] }, 1)).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('getAssignedRabbits', () => {
    it('returns assigned rabbits with lactating status', async () => {
      assignmentRepository.findByGalponId.mockResolvedValue([{ rabbitId: 1, rabbit: { id: 1, code: 'R001', name: 'Bunny', age: 6, weight: 2.5, race: 'X', imageUrl: null }, cage: { number: 5, type: 'engorde', id: 1 } }]);
      jest.isolateModules(() => {
        jest.mock('../../../src/modules/reproduction/reproduction.repository', () => ({
          findLactatingFemaleIds: jest.fn().mockResolvedValue(new Set()),
        }));
      });
      const result = await assignmentService.getAssignedRabbits(1);
      expect(result).toHaveLength(1);
    });
  });

  describe('getAvailableRabbits', () => {
    it('returns unassigned rabbits', async () => {
      rabbitRepository.findByGalpon.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      assignmentRepository.findByGalponId.mockResolvedValue([{ rabbitId: 1 }]);
      const result = await assignmentService.getAvailableRabbits(1);
      expect(result).toHaveLength(1);
    });
  });

  describe('getOperativeCages', () => {
    it('returns operative cages with occupancy', async () => {
      const cageRepo = require('../../../src/modules/cage/cage.repository');
      cageRepo.findByStatus = jest.fn().mockResolvedValue([{ id: 1, galponId: 1, capacity: 8, get: () => ({ id: 1, capacity: 8 }) }]);
      assignmentRepository.findByGalponId.mockResolvedValue([{ cageId: 1, rabbitId: 1 }]);
      const result = await assignmentService.getOperativeCages(1);
      expect(result).toHaveLength(1);
    });
  });

  describe('unassignRabbit', () => {
    it('updates assignment status to liberado', async () => {
      assignmentRepository.findById.mockResolvedValue({ id: 1, rabbitId: 1, cageId: 1 });
      assignmentRepository.update.mockResolvedValue({ id: 1, status: 'liberado' });
      rabbitRepository.findById.mockResolvedValue({ id: 1, code: 'R001', name: 'Bunny' });

      await assignmentService.unassignRabbit(1);
      expect(assignmentRepository.update).toHaveBeenCalled();
    });

    it('throws when assignment not found', async () => {
      assignmentRepository.findById.mockResolvedValue(null);
      await expect(assignmentService.unassignRabbit(999)).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
