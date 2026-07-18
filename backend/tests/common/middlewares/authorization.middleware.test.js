jest.mock('../../../src/domain/models', () => ({
  FarmMember: { findOne: jest.fn() },
  WorkerPermission: { findOne: jest.fn() }
}));

const { requirePermission } = require('../../../src/common/middlewares/authorization.middleware');

describe('requirePermission', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let FarmMember;
  let WorkerPermission;

  beforeEach(() => {
    mockReq = { user: {} };
    mockRes = {};
    mockNext = jest.fn();
    const models = require('../../../src/domain/models');
    FarmMember = models.FarmMember;
    WorkerPermission = models.WorkerPermission;
  });

  describe('races module', () => {
    it('should skip all checks for races module with canRead', async () => {
      const middleware = requirePermission('races', 'canRead');
      mockReq.user = { id: 'profile-1' };

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(FarmMember.findOne).not.toHaveBeenCalled();
      expect(WorkerPermission.findOne).not.toHaveBeenCalled();
    });

    it('should skip all checks for races module with canCreate', async () => {
      const middleware = requirePermission('races', 'canCreate');

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(FarmMember.findOne).not.toHaveBeenCalled();
    });

    it('should skip all checks for races module even when no activeGalponId', async () => {
      const middleware = requirePermission('races', 'canRead');
      mockReq.user = { id: 'profile-1', activeGalponId: null };

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('activeGalponId validation', () => {
    it('should return 403 when activeGalponId is null', async () => {
      const middleware = requirePermission('cages', 'canRead');
      mockReq.user = { id: 'profile-1', activeGalponId: null };

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('galpón activo'),
          statusCode: 403
        })
      );
    });

    it('should return 403 when activeGalponId is undefined', async () => {
      const middleware = requirePermission('cages', 'canRead');
      mockReq.user = { id: 'profile-1' };

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 403 })
      );
    });
  });

  describe('membership validation', () => {
    it('should return 403 when no membership found', async () => {
      FarmMember.findOne.mockResolvedValue(null);
      const middleware = requirePermission('cages', 'canRead');
      mockReq.user = { id: 'profile-1', activeGalponId: 1 };

      await middleware(mockReq, mockRes, mockNext);

      expect(FarmMember.findOne).toHaveBeenCalledWith({
        where: { profileId: 'profile-1', galponId: 1, status: 'active' }
      });
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('No tiene acceso'),
          statusCode: 403
        })
      );
    });

    it('should query FarmMember with correct profileId and galponId', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 'member-1', role: 'owner' });
      const middleware = requirePermission('rabbits', 'canRead');
      mockReq.user = { id: 'my-profile', activeGalponId: 42 };

      await middleware(mockReq, mockRes, mockNext);

      expect(FarmMember.findOne).toHaveBeenCalledWith({
        where: { profileId: 'my-profile', galponId: 42, status: 'active' }
      });
    });
  });

  describe('owner role', () => {
    it('should call next() when membership role is owner', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 'member-1', role: 'owner' });
      const middleware = requirePermission('cages', 'canRead');
      mockReq.user = { id: 'profile-1', activeGalponId: 1 };

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(WorkerPermission.findOne).not.toHaveBeenCalled();
    });

    it('should grant access to owner regardless of module', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 'member-1', role: 'owner' });
      const middleware = requirePermission('deworming', 'canDelete');
      mockReq.user = { id: 'profile-1', activeGalponId: 1 };

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('worker permissions', () => {
    it('should call next() when worker has the required permission', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 'member-1', role: 'worker' });
      WorkerPermission.findOne.mockResolvedValue({ canRead: true, canCreate: false });
      const middleware = requirePermission('cages', 'canRead');
      mockReq.user = { id: 'profile-1', activeGalponId: 1 };

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should return 403 when worker does not have the required permission', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 'member-1', role: 'worker' });
      WorkerPermission.findOne.mockResolvedValue(null);
      const middleware = requirePermission('cages', 'canRead');
      mockReq.user = { id: 'profile-1', activeGalponId: 1 };

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('No tiene permisos'),
          statusCode: 403
        })
      );
    });

    it('should return 403 when worker has permission but not for the required action', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 'member-1', role: 'worker' });
      WorkerPermission.findOne.mockResolvedValue({ canRead: false, canCreate: true, canUpdate: false, canDelete: false });
      const middleware = requirePermission('cages', 'canRead');
      mockReq.user = { id: 'profile-1', activeGalponId: 1 };

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 403 })
      );
    });

    it('should include correct action name in error for canRead', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 'member-1', role: 'worker' });
      WorkerPermission.findOne.mockResolvedValue(null);
      const middleware = requirePermission('cages', 'canRead');
      mockReq.user = { id: 'profile-1', activeGalponId: 1 };

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('leer') })
      );
    });

    it('should include correct action name in error for canCreate', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 'member-1', role: 'worker' });
      WorkerPermission.findOne.mockResolvedValue(null);
      const middleware = requirePermission('cages', 'canCreate');
      mockReq.user = { id: 'profile-1', activeGalponId: 1 };

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('crear') })
      );
    });
  });

  describe('spanish/english module name mapping', () => {
    it('should first try spanish module name from mapping', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 'member-1', role: 'worker' });
      WorkerPermission.findOne.mockResolvedValue(null);
      const middleware = requirePermission('feeding', 'canRead');
      mockReq.user = { id: 'profile-1', activeGalponId: 1 };

      await middleware(mockReq, mockRes, mockNext);

      expect(WorkerPermission.findOne).toHaveBeenNthCalledWith(1, {
        where: { farmMemberId: 'member-1', moduleName: 'alimentacion' }
      });
    });

    it('should fall back to english module name when spanish lookup fails', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 'member-1', role: 'worker' });
      WorkerPermission.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ canRead: true });
      const middleware = requirePermission('feeding', 'canRead');
      mockReq.user = { id: 'profile-1', activeGalponId: 1 };

      await middleware(mockReq, mockRes, mockNext);

      expect(WorkerPermission.findOne).toHaveBeenNthCalledWith(2, {
        where: { farmMemberId: 'member-1', moduleName: 'feeding' }
      });
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should skip spanish lookup when module has no spanish mapping', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 'member-1', role: 'worker' });
      WorkerPermission.findOne.mockResolvedValue({ canRead: true });
      const middleware = requirePermission('unknownModule', 'canRead');
      mockReq.user = { id: 'profile-1', activeGalponId: 1 };

      await middleware(mockReq, mockRes, mockNext);

      expect(WorkerPermission.findOne).toHaveBeenCalledTimes(1);
      expect(WorkerPermission.findOne).toHaveBeenCalledWith({
        where: { farmMemberId: 'member-1', moduleName: 'unknownModule' }
      });
    });

    it('should try all spanish mapped modules correctly', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 'member-1', role: 'worker' });
      WorkerPermission.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ canRead: true });
      const middleware = requirePermission('vaccination', 'canRead');
      mockReq.user = { id: 'profile-1', activeGalponId: 1 };

      await middleware(mockReq, mockRes, mockNext);

      expect(WorkerPermission.findOne).toHaveBeenNthCalledWith(1, {
        where: { farmMemberId: 'member-1', moduleName: 'vacunacion' }
      });
    });
  });

  describe('control modules auto-grant assignments.canRead', () => {
    it('should auto-grant assignments.canRead when worker has any control module permission', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 'member-1', role: 'worker' });
      WorkerPermission.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ canRead: true, moduleName: 'feeding' });

      const middleware = requirePermission('assignments', 'canRead');
      mockReq.user = { id: 'profile-1', activeGalponId: 1 };

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should not auto-grant assignments.canRead when worker has no control module permission', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 'member-1', role: 'worker' });
      WorkerPermission.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const middleware = requirePermission('assignments', 'canRead');
      mockReq.user = { id: 'profile-1', activeGalponId: 1 };

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 403 })
      );
    });

    it('should not auto-grant assignments.canCreate (only canRead)', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 'member-1', role: 'worker' });
      WorkerPermission.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const middleware = requirePermission('assignments', 'canCreate');
      mockReq.user = { id: 'profile-1', activeGalponId: 1 };

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 403 })
      );
    });

    it('should not auto-grant assignments.canRead when worker already has direct permission', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 'member-1', role: 'worker' });
      WorkerPermission.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ canRead: true, canCreate: false });

      const middleware = requirePermission('assignments', 'canRead');
      mockReq.user = { id: 'profile-1', activeGalponId: 1 };

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(WorkerPermission.findOne).toHaveBeenCalledTimes(2);
    });

    it('should query CONTROL_MODULES when checking auto-grant', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 'member-1', role: 'worker' });
      WorkerPermission.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ canRead: true, moduleName: 'feeding' });

      const middleware = requirePermission('assignments', 'canRead');
      mockReq.user = { id: 'profile-1', activeGalponId: 1 };

      await middleware(mockReq, mockRes, mockNext);

      const thirdCall = WorkerPermission.findOne.mock.calls[2];
      const whereArg = thirdCall[0].where;
      expect(whereArg.moduleName).toEqual(
        expect.arrayContaining(['feeding', 'vaccination', 'deworming', 'cleaning', 'mortality', 'reproduction'])
      );
    });
  });
});
