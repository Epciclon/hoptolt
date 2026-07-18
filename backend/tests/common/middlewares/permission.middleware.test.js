jest.mock('../../../src/domain/models', () => ({
  Profile: { findByPk: jest.fn() },
  Galpon: { findByPk: jest.fn() },
  FarmMember: { findOne: jest.fn() }
}));

const { checkPermission, checkModuleAccess, filterByWorkerCages } = require('../../../src/common/middlewares/permission.middleware');

describe('permission middlewares', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let Profile;
  let Galpon;
  let FarmMember;

  beforeEach(() => {
    mockReq = { user: { id: 'profile-1' }, params: {}, body: {} };
    mockRes = {};
    mockNext = jest.fn();
    const models = require('../../../src/domain/models');
    Profile = models.Profile;
    Galpon = models.Galpon;
    FarmMember = models.FarmMember;
  });

  describe('getMembershipData (tested via checkPermission)', () => {
    it('should return 403 when Profile.findByPk returns profile without activeGalponId', async () => {
      Profile.findByPk.mockResolvedValue({ id: 'profile-1', activeGalponId: null });

      const middleware = checkPermission('cages', 'canRead');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('galpón activo'),
          statusCode: 403
        })
      );
    });

    it('should return 403 when Profile.findByPk returns null', async () => {
      Profile.findByPk.mockResolvedValue(null);

      const middleware = checkPermission('cages', 'canRead');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 403 })
      );
    });

    it('should return 403 when FarmMember.findOne returns null (no membership)', async () => {
      Profile.findByPk.mockResolvedValue({ id: 'profile-1', activeGalponId: 1 });
      Galpon.findByPk.mockResolvedValue({ id: 1, profileId: 'other-profile' });
      FarmMember.findOne.mockResolvedValue(null);

      const middleware = checkPermission('cages', 'canRead');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('No tienes acceso'),
          statusCode: 403
        })
      );
    });

    it('should query FarmMember with role worker and include permissions', async () => {
      Profile.findByPk.mockResolvedValue({ id: 'profile-1', activeGalponId: 5 });
      Galpon.findByPk.mockResolvedValue({ id: 5, profileId: 'other-profile' });
      FarmMember.findOne.mockResolvedValue({
        id: 'member-1',
        role: 'worker',
        permissions: [],
        workerCages: []
      });

      const middleware = checkPermission('cages', 'canRead');
      await middleware(mockReq, mockRes, mockNext);

      expect(FarmMember.findOne).toHaveBeenCalledWith({
        where: {
          profileId: 'profile-1',
          galponId: 5,
          status: 'active',
          role: 'worker'
        },
        include: [{ association: 'permissions' }]
      });
    });
  });

  describe('checkPermission', () => {
    it('should call next() when user is owner (galpon.profileId matches)', async () => {
      Profile.findByPk.mockResolvedValue({ id: 'profile-1', activeGalponId: 1 });
      Galpon.findByPk.mockResolvedValue({ id: 1, profileId: 'profile-1' });

      const middleware = checkPermission('cages', 'canRead');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(FarmMember.findOne).not.toHaveBeenCalled();
    });

    it('should call next() when worker has the required permission', async () => {
      Profile.findByPk.mockResolvedValue({ id: 'profile-1', activeGalponId: 1 });
      Galpon.findByPk.mockResolvedValue({ id: 1, profileId: 'other-profile' });
      FarmMember.findOne.mockResolvedValue({
        id: 'member-1',
        role: 'worker',
        permissions: [
          { moduleName: 'cages', canRead: true, canCreate: false, canUpdate: false, canDelete: false }
        ],
        workerCages: [{ cageId: 10 }, { cageId: 20 }]
      });

      const middleware = checkPermission('cages', 'canRead');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should set req.activeGalponId and req.workerCages for authorized worker', async () => {
      Profile.findByPk.mockResolvedValue({ id: 'profile-1', activeGalponId: 3 });
      Galpon.findByPk.mockResolvedValue({ id: 3, profileId: 'other-profile' });
      FarmMember.findOne.mockResolvedValue({
        id: 'member-1',
        role: 'worker',
        permissions: [
          { moduleName: 'cages', canRead: true, canCreate: false, canUpdate: false, canDelete: false }
        ],
        workerCages: [{ cageId: 10 }, { cageId: 20 }]
      });

      const middleware = checkPermission('cages', 'canRead');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockReq.activeGalponId).toBe(3);
      expect(mockReq.workerCages).toEqual([10, 20]);
    });

    it('should set req.workerCages to empty array when workerCages is undefined', async () => {
      Profile.findByPk.mockResolvedValue({ id: 'profile-1', activeGalponId: 1 });
      Galpon.findByPk.mockResolvedValue({ id: 1, profileId: 'other-profile' });
      FarmMember.findOne.mockResolvedValue({
        id: 'member-1',
        role: 'worker',
        permissions: [
          { moduleName: 'cages', canRead: true, canCreate: false, canUpdate: false, canDelete: false }
        ]
      });

      const middleware = checkPermission('cages', 'canRead');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockReq.workerCages).toEqual([]);
    });

    it('should return 403 when worker lacks the specific action permission', async () => {
      Profile.findByPk.mockResolvedValue({ id: 'profile-1', activeGalponId: 1 });
      Galpon.findByPk.mockResolvedValue({ id: 1, profileId: 'other-profile' });
      FarmMember.findOne.mockResolvedValue({
        id: 'member-1',
        role: 'worker',
        permissions: [
          { moduleName: 'cages', canRead: false, canCreate: true, canUpdate: false, canDelete: false }
        ],
        workerCages: []
      });

      const middleware = checkPermission('cages', 'canRead');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('canRead'),
          statusCode: 403
        })
      );
    });

    it('should return 403 when worker has no permission for the module', async () => {
      Profile.findByPk.mockResolvedValue({ id: 'profile-1', activeGalponId: 1 });
      Galpon.findByPk.mockResolvedValue({ id: 1, profileId: 'other-profile' });
      FarmMember.findOne.mockResolvedValue({
        id: 'member-1',
        role: 'worker',
        permissions: [
          { moduleName: 'feeding', canRead: true }
        ],
        workerCages: []
      });

      const middleware = checkPermission('cages', 'canRead');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 403 })
      );
    });
  });

  describe('checkModuleAccess', () => {
    it('should call next() when user is owner', async () => {
      Profile.findByPk.mockResolvedValue({ id: 'profile-1', activeGalponId: 1 });
      Galpon.findByPk.mockResolvedValue({ id: 1, profileId: 'profile-1' });

      const middleware = checkModuleAccess('cages');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next() when worker has any permission in the module', async () => {
      Profile.findByPk.mockResolvedValue({ id: 'profile-1', activeGalponId: 1 });
      Galpon.findByPk.mockResolvedValue({ id: 1, profileId: 'other-profile' });
      FarmMember.findOne.mockResolvedValue({
        id: 'member-1',
        role: 'worker',
        permissions: [
          { moduleName: 'cages', canRead: false, canCreate: true, canUpdate: false, canDelete: false }
        ],
        workerCages: []
      });

      const middleware = checkModuleAccess('cages');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should return 403 when worker has no permission for the module', async () => {
      Profile.findByPk.mockResolvedValue({ id: 'profile-1', activeGalponId: 1 });
      Galpon.findByPk.mockResolvedValue({ id: 1, profileId: 'other-profile' });
      FarmMember.findOne.mockResolvedValue({
        id: 'member-1',
        role: 'worker',
        permissions: [],
        workerCages: []
      });

      const middleware = checkModuleAccess('cages');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('No tienes acceso al módulo'),
          statusCode: 403
        })
      );
    });

    it('should return 403 when worker has permission entry but all actions are false', async () => {
      Profile.findByPk.mockResolvedValue({ id: 'profile-1', activeGalponId: 1 });
      Galpon.findByPk.mockResolvedValue({ id: 1, profileId: 'other-profile' });
      FarmMember.findOne.mockResolvedValue({
        id: 'member-1',
        role: 'worker',
        permissions: [
          { moduleName: 'cages', canRead: false, canCreate: false, canUpdate: false, canDelete: false }
        ],
        workerCages: []
      });

      const middleware = checkModuleAccess('cages');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('No tienes permisos en el módulo'),
          statusCode: 403
        })
      );
    });

    it('should set req.activeGalponId and req.workerCages on successful access', async () => {
      Profile.findByPk.mockResolvedValue({ id: 'profile-1', activeGalponId: 7 });
      Galpon.findByPk.mockResolvedValue({ id: 7, profileId: 'other-profile' });
      FarmMember.findOne.mockResolvedValue({
        id: 'member-1',
        role: 'worker',
        permissions: [
          { moduleName: 'cages', canRead: true, canCreate: false, canUpdate: false, canDelete: false }
        ],
        workerCages: [{ cageId: 5 }, { cageId: 6 }]
      });

      const middleware = checkModuleAccess('cages');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockReq.activeGalponId).toBe(7);
      expect(mockReq.workerCages).toEqual([5, 6]);
    });
  });

  describe('filterByWorkerCages', () => {
    it('should call next() when user role is owner', () => {
      const middleware = filterByWorkerCages();
      mockReq.user = { role: 'owner' };

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next() when no cageId is present in request', () => {
      const middleware = filterByWorkerCages();
      mockReq.user = { role: 'worker' };
      mockReq.workerCages = [1, 2, 3];
      mockReq.params = {};

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next() when worker has access to the requested cage via params', () => {
      const middleware = filterByWorkerCages();
      mockReq.user = { role: 'worker' };
      mockReq.workerCages = [1, 2, 3];
      mockReq.params = { cageId: '2' };

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next() when worker has access to the requested cage via body', () => {
      const middleware = filterByWorkerCages();
      mockReq.user = { role: 'worker' };
      mockReq.workerCages = [1, 2, 3];
      mockReq.params = {};
      mockReq.body = { cageId: '3' };

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should throw 403 when worker does not have access to the requested cage', () => {
      const middleware = filterByWorkerCages();
      mockReq.user = { role: 'worker' };
      mockReq.workerCages = [1, 2, 3];
      mockReq.params = { cageId: '999' };

      expect(() => middleware(mockReq, mockRes, mockNext)).toThrow(
        expect.objectContaining({ statusCode: 403 })
      );
    });

    it('should use custom cageIdParam from body', () => {
      const middleware = filterByWorkerCages('customCageId');
      mockReq.user = { role: 'worker' };
      mockReq.workerCages = [10, 20];
      mockReq.params = {};
      mockReq.body = { customCageId: '20' };

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should throw 403 when custom cageIdParam does not match', () => {
      const middleware = filterByWorkerCages('customCageId');
      mockReq.user = { role: 'worker' };
      mockReq.workerCages = [10, 20];
      mockReq.params = {};
      mockReq.body = { customCageId: '999' };

      expect(() => middleware(mockReq, mockRes, mockNext)).toThrow(
        expect.objectContaining({ statusCode: 403 })
      );
    });

    it('should prefer params over body when both are present', () => {
      const middleware = filterByWorkerCages();
      mockReq.user = { role: 'worker' };
      mockReq.workerCages = [1, 2, 3];
      mockReq.params = { cageId: '1' };
      mockReq.body = { cageId: '999' };

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should treat workerCages as empty array when not set on req', () => {
      const middleware = filterByWorkerCages();
      mockReq.user = { role: 'worker' };
      mockReq.params = { cageId: '1' };

      expect(() => middleware(mockReq, mockRes, mockNext)).toThrow(
        expect.objectContaining({ statusCode: 403 })
      );
    });

    it('should throw 403 when cageId param is provided but workerCages is empty', () => {
      const middleware = filterByWorkerCages();
      mockReq.user = { role: 'worker' };
      mockReq.workerCages = [];
      mockReq.params = { cageId: '1' };

      expect(() => middleware(mockReq, mockRes, mockNext)).toThrow(
        expect.objectContaining({ statusCode: 403 })
      );
    });
  });
});
