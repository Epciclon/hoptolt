require('../../setup');

jest.mock('../../../src/modules/incident/incident.repository');
const incidentRepository = require('../../../src/modules/incident/incident.repository');
const incidentService = require('../../../src/modules/incident/incident.service');
const { Galpon, FarmMember, Cage } = require('../../../src/domain/models');

describe('IncidentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserRole', () => {
    it('returns owner when user owns the galpon', async () => {
      Galpon.findByPk.mockResolvedValue({ id: 1, profileId: 'owner1' });
      const res = await incidentService.getUserRole('owner1', 1);
      expect(res.role).toBe('owner');
    });

    it('returns worker when user is a farm member', async () => {
      Galpon.findByPk.mockResolvedValue({ id: 1, profileId: 'owner1' });
      FarmMember.findOne.mockResolvedValue({ id: 5, profileId: 'worker1', galponId: 1, role: 'worker' });
      const res = await incidentService.getUserRole('worker1', 1);
      expect(res.role).toBe('worker');
    });

    it('throws 404 when galpon does not exist', async () => {
      Galpon.findByPk.mockResolvedValue(null);
      await expect(incidentService.getUserRole('u1', 999)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 403 when user has no membership', async () => {
      Galpon.findByPk.mockResolvedValue({ id: 1, profileId: 'owner1' });
      FarmMember.findOne.mockResolvedValue(null);
      await expect(incidentService.getUserRole('stranger', 1)).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('createIncident', () => {
    beforeEach(() => {
      Galpon.findByPk.mockResolvedValue({ id: 1, profileId: 'owner1' });
      FarmMember.findOne.mockResolvedValue({ id: 5, profileId: 'worker1', galponId: 1, role: 'worker' });
      Cage.findAll = jest.fn().mockResolvedValue([{ id: 2, number: 14, type: 'engorde' }]);
      incidentRepository.create.mockResolvedValue({ id: 100 });
      incidentRepository.findById.mockResolvedValue({ id: 100, title: 'Falta agua', cages: [{ id: 2, number: 14, type: 'engorde' }] });
    });

    it('creates an incident with selected cages', async () => {
      const result = await incidentService.createIncident(
        { id: 'worker1' },
        1,
        { module: 'alimentacion', cageIds: [2], title: 'Falta agua', description: 'Bebedero obstruido' }
      );
      expect(incidentRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        galponId: 1,
        profileId: 'worker1',
        module: 'alimentacion',
        title: 'Falta agua'
      }));
      expect(result.id).toBe(100);
    });

    it('throws 400 when title is empty', async () => {
      await expect(
        incidentService.createIncident({ id: 'worker1' }, 1, { title: '  ', description: 'Detalle' })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 400 when description is empty', async () => {
      await expect(
        incidentService.createIncident({ id: 'worker1' }, 1, { title: 'Motivo', description: '' })
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });
});

