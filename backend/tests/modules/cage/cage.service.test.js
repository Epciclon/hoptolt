require('../../setup');

jest.mock('../../../src/modules/cage/cage.repository');
jest.mock('../../../src/modules/assignment/assignment.repository');
jest.mock('../../../src/modules/galpon/galpon.repository');

const cageRepository = require('../../../src/modules/cage/cage.repository');
const assignmentRepository = require('../../../src/modules/assignment/assignment.repository');
const galponRepository = require('../../../src/modules/galpon/galpon.repository');
const cageService = require('../../../src/modules/cage/cage.service');
const { FarmMember } = require('../../../src/domain/models');

describe('CageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerCage', () => {
    beforeEach(() => {
      FarmMember.findOne.mockResolvedValue({ id: 1, role: 'owner', status: 'active' });
    });

    it('creates cage when all validations pass', async () => {
      galponRepository.findById.mockResolvedValue({ id: 1, totalCapacity: 50 });
      cageRepository.countByGalponId.mockResolvedValue(5);
      cageRepository.findByNumberAndGalpon.mockResolvedValue(null);
      cageRepository.create.mockResolvedValue({ id: 1, number: 10, type: 'engorde' });

      const result = await cageService.registerCage({ number: 10, type: 'engorde', capacity: 8, galponId: 1 }, 'p1');
      expect(result.id).toBe(1);
    });

    it('throws when galpon does not exist', async () => {
      galponRepository.findById.mockResolvedValue(null);
      await expect(cageService.registerCage({ number: 10, galponId: 999 }, 'p1')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws when capacity reached', async () => {
      galponRepository.findById.mockResolvedValue({ id: 1, totalCapacity: 10 });
      cageRepository.countByGalponId.mockResolvedValue(10);
      await expect(cageService.registerCage({ number: 11, capacity: 8, galponId: 1 }, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws when cage number duplicate', async () => {
      galponRepository.findById.mockResolvedValue({ id: 1, totalCapacity: 50 });
      cageRepository.countByGalponId.mockResolvedValue(5);
      cageRepository.findByNumberAndGalpon.mockResolvedValue({ id: 2, number: 10 });
      await expect(cageService.registerCage({ number: 10, capacity: 8, galponId: 1 }, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('getCageById', () => {
    it('returns cage with occupancy info', async () => {
      cageRepository.findById.mockResolvedValue({ id: 1, galponId: 1, capacity: 8, get: jest.fn().mockReturnValue({ id: 1, capacity: 8 }) });
      FarmMember.findOne.mockResolvedValue({ id: 1, status: 'active' });
      assignmentRepository.countActiveByCageId.mockResolvedValue(3);

      const result = await cageService.getCageById(1, 1, 'p1');
      expect(result.assignedCount).toBe(3);
      expect(result.occupancyStatus).toBe('parcial');
    });

    it('throws 404 when cage not found', async () => {
      cageRepository.findById.mockResolvedValue(null);
      await expect(cageService.getCageById(999, 1, 'p1')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getAllCages', () => {
    it('returns paginated results with occupancy', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 1, status: 'active' });
      cageRepository.findByGalponId.mockResolvedValue([{ id: 1, capacity: 8, get: jest.fn().mockReturnValue({ id: 1, capacity: 8 }) }]);
      cageRepository.countByGalponId.mockResolvedValue(1);
      assignmentRepository.countActiveByCageId.mockResolvedValue(0);

      const result = await cageService.getAllCages(1, 'p1');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].occupancyStatus).toBe('disponible');
    });

    it('returns empty when no galponId', async () => {
      const result = await cageService.getAllCages(null, 'p1');
      expect(result.data).toEqual([]);
    });
  });

  describe('editCage', () => {
    it('updates cage', async () => {
      const mockCage = { id: 1, galponId: 1, status: 'operativa' };
      cageRepository.findById.mockResolvedValue(mockCage);
      FarmMember.findOne.mockResolvedValue({ id: 1, status: 'active' });
      cageRepository.update.mockResolvedValue({ ...mockCage, type: 'reproducción' });

      const result = await cageService.editCage(1, { type: 'reproducción' }, 'p1');
      expect(cageRepository.update).toHaveBeenCalled();
    });

    it('prevents maintenance status when rabbits assigned', async () => {
      cageRepository.findById.mockResolvedValue({ id: 1, galponId: 1, status: 'operativa' });
      FarmMember.findOne.mockResolvedValue({ id: 1, status: 'active' });
      assignmentRepository.countActiveByCageId.mockResolvedValue(3);

      await expect(cageService.editCage(1, { status: 'mantenimiento' }, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('deleteCage', () => {
    it('deletes cage', async () => {
      cageRepository.findById.mockResolvedValue({ id: 1, galponId: 1 });
      FarmMember.findOne.mockResolvedValue({ id: 1, status: 'active' });
      assignmentRepository.countActiveByCageId.mockResolvedValue(0);
      cageRepository.delete = jest.fn().mockResolvedValue(true);

      await cageService.deleteCage(1, 'p1');
      expect(cageRepository.delete).toHaveBeenCalled();
    });

    it('prevents deletion when rabbits assigned', async () => {
      cageRepository.findById.mockResolvedValue({ id: 1, galponId: 1 });
      FarmMember.findOne.mockResolvedValue({ id: 1, status: 'active' });
      assignmentRepository.countActiveByCageId.mockResolvedValue(2);

      await expect(cageService.deleteCage(1, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });
  });
});
