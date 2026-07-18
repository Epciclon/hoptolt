jest.mock('../../../src/modules/farmMember/farmMember.service');
const farmMemberService = require('../../../src/modules/farmMember/farmMember.service');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const farmMemberController = require('../../../src/modules/farmMember/farmMember.controller');

describe('FarmMemberController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
    next = jest.fn();
  });

  describe('getWorkersByGalpon', () => {
    it('should call getWorkersByGalpon and return 200', async () => {
      req = { params: { galponId: '1' }, user: { id: 'user1' } };
      farmMemberService.getWorkersByGalpon.mockResolvedValue([{ id: 1, role: 'worker' }]);

      await farmMemberController.getWorkersByGalpon(req, res, next);

      expect(farmMemberService.getWorkersByGalpon).toHaveBeenCalledWith(1, 'user1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getAllMembersByGalpon', () => {
    it('should call getAllMembersByGalpon and return 200', async () => {
      req = { params: { galponId: '1' } };
      farmMemberService.getAllMembersByGalpon.mockResolvedValue([
        { id: 1, role: 'owner' },
        { id: 2, role: 'worker' }
      ]);

      await farmMemberController.getAllMembersByGalpon(req, res, next);

      expect(farmMemberService.getAllMembersByGalpon).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        members: expect.any(Array)
      }));
    });
  });

  describe('getMembershipsForMe', () => {
    it('should call getMembershipsForUser and return 200', async () => {
      req = { user: { id: 'user1' } };
      farmMemberService.getMembershipsForUser.mockResolvedValue([{ id: 1, role: 'owner' }]);

      await farmMemberController.getMembershipsForMe(req, res, next);

      expect(farmMemberService.getMembershipsForUser).toHaveBeenCalledWith('user1');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getWorkerById', () => {
    it('should call getWorkerById and return 200', async () => {
      req = { params: { id: '1' }, user: { id: 'user1' } };
      farmMemberService.getWorkerById.mockResolvedValue({ id: 1, role: 'worker' });

      await farmMemberController.getWorkerById(req, res, next);

      expect(farmMemberService.getWorkerById).toHaveBeenCalledWith(1, 'user1');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateWorker', () => {
    it('should call updateWorker and return 200', async () => {
      req = { params: { id: '1' }, body: { role: 'supervisor' }, user: { id: 'user1' } };
      farmMemberService.updateWorker.mockResolvedValue({ id: 1, role: 'supervisor' });

      await farmMemberController.updateWorker(req, res, next);

      expect(farmMemberService.updateWorker).toHaveBeenCalledWith(1, { role: 'supervisor' }, 'user1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('removeWorker', () => {
    it('should call removeWorker and return 200', async () => {
      req = { params: { id: '1' }, user: { id: 'user1' } };
      farmMemberService.removeWorker.mockResolvedValue();

      await farmMemberController.removeWorker(req, res, next);

      expect(farmMemberService.removeWorker).toHaveBeenCalledWith(1, 'user1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
