require('../../setup');

jest.mock('../../../src/modules/vaccination/vaccination.repository');
jest.mock('../../../src/common/helpers/notification.helper', () => ({
  notifyOwnerOnWorkerAction: jest.fn().mockResolvedValue(undefined),
}));

const vaccinationRepository = require('../../../src/modules/vaccination/vaccination.repository');
const vaccinationService = require('../../../src/modules/vaccination/vaccination.service');
const { Rabbit, Assignment, Galpon, FarmMember, Reproduction } = require('../../../src/domain/models');

describe('VaccinationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerVaccination', () => {
    beforeEach(() => {
      Galpon.findByPk.mockResolvedValue({ id: 1, vaccines: [{ name: 'Mixomatosis', period: 180 }] });
      Rabbit.findAll = jest.fn().mockResolvedValue([{ id: 1, code: 'R001', name: 'Bunny', galponId: 1 }]);
      Assignment.findAll = jest.fn().mockResolvedValue([{ rabbitId: 1, status: 'asignado' }]);
      Reproduction.findAll = jest.fn().mockResolvedValue([]);
      const { Vaccination } = require('../../../src/domain/models');
      Vaccination.findAll = jest.fn().mockResolvedValue([]);
      vaccinationRepository.create.mockResolvedValue({ id: 1, rabbitId: 1, vaccines: ['Mixomatosis'] });
    });

    it('registers vaccination for valid rabbits', async () => {
      const result = await vaccinationService.registerVaccination({ rabbitIds: [1], vaccines: ['Mixomatosis'] }, 1, 'p1');
      expect(result).toHaveLength(1);
      expect(vaccinationRepository.create).toHaveBeenCalled();
    });

    it('throws when galpon not found', async () => {
      Galpon.findByPk.mockResolvedValue(null);
      await expect(vaccinationService.registerVaccination({ rabbitIds: [1], vaccines: ['Mixomatosis'] }, 999, 'p1')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws when rabbit is lactating', async () => {
      Reproduction.findAll = jest.fn().mockResolvedValue([{ femaleId: 1, status: 'lactancia' }]);
      await expect(vaccinationService.registerVaccination({ rabbitIds: [1], vaccines: ['Mixomatosis'] }, 1, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws when rabbit is not assigned', async () => {
      Assignment.findAll = jest.fn().mockResolvedValue([]);
      await expect(vaccinationService.registerVaccination({ rabbitIds: [1], vaccines: ['Mixomatosis'] }, 1, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('getVaccinations', () => {
    it('returns paginated results', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 1, status: 'active' });
      vaccinationRepository.findByGalponId.mockResolvedValue([{ id: 1 }]);
      vaccinationRepository.countByGalponId.mockResolvedValue(1);

      const result = await vaccinationService.getVaccinations(1, 'p1', 1, 10, {});
      expect(result.data).toHaveLength(1);
    });

    it('returns empty when no galponId', async () => {
      const result = await vaccinationService.getVaccinations(null, 'p1');
      expect(result.data).toEqual([]);
    });
  });

  describe('getVaccinationsByRabbit', () => {
    it('returns vaccinations by rabbit', async () => {
      vaccinationRepository.findByRabbitId.mockResolvedValue([{ id: 1, vaccines: ['Mixomatosis'] }]);
      const result = await vaccinationService.getVaccinationsByRabbit(1);
      expect(result).toHaveLength(1);
    });
  });
});
