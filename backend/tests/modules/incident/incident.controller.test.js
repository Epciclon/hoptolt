jest.mock('../../../src/modules/incident/incident.service');
const incidentService = require('../../../src/modules/incident/incident.service');
const incidentController = require('../../../src/modules/incident/incident.controller');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('IncidentController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
    next = jest.fn();
  });

  describe('createIncident', () => {
    it('should create an incident and return 201', async () => {
      req = {
        user: { id: 'u1' },
        galponId: 1,
        body: { title: 'Falta alimento', description: 'Se agotó el balanceado', module: 'alimentacion' }
      };
      incidentService.createIncident.mockResolvedValue({
        id: 10,
        galponId: 1,
        profileId: 'u1',
        title: 'Falta alimento',
        description: 'Se agotó el balanceado',
        status: 'pending'
      });

      await incidentController.createIncident(req, res, next);

      expect(incidentService.createIncident).toHaveBeenCalledWith(req.user, 1, req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        incident: expect.objectContaining({ id: 10, title: 'Falta alimento' })
      }));
    });
  });

  describe('getIncidents', () => {
    it('should return paginated incidents and userRole', async () => {
      req = { user: { id: 'u1' }, galponId: 1, query: { page: '1' } };
      incidentService.getIncidents.mockResolvedValue({
        incidents: [{ id: 1, title: 'Novedad 1', status: 'pending' }],
        pagination: { total: 1, page: 1, limit: 12, totalPages: 1 },
        userRole: 'owner'
      });

      await incidentController.getIncidents(req, res, next);

      expect(incidentService.getIncidents).toHaveBeenCalledWith(req.user, 1, req.query);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        userRole: 'owner',
        incidents: expect.any(Array)
      }));
    });
  });

  describe('getCounts', () => {
    it('should return incident counts', async () => {
      req = { user: { id: 'u1' }, galponId: 1 };
      incidentService.getCounts.mockResolvedValue({ unread: 2, pending: 3, resolved: 5 });

      await incidentController.getCounts(req, res, next);

      expect(incidentService.getCounts).toHaveBeenCalledWith(req.user, 1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        counts: { unread: 2, pending: 3, resolved: 5 }
      });
    });
  });

  describe('getIncidentById', () => {
    it('should return incident by id', async () => {
      req = { user: { id: 'u1' }, galponId: 1, params: { id: '10' } };
      incidentService.getById.mockResolvedValue({ id: 10, title: 'Test' });

      await incidentController.getIncidentById(req, res, next);

      expect(incidentService.getById).toHaveBeenCalledWith(req.user, 1, '10');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('respondToIncident', () => {
    it('should respond to incident and return 200', async () => {
      req = {
        user: { id: 'owner1' },
        galponId: 1,
        params: { id: '10' },
        body: { response: 'Revisado' }
      };
      incidentService.respondToIncident.mockResolvedValue({ id: 10, ownerResponse: 'Revisado', status: 'reviewed' });

      await incidentController.respondToIncident(req, res, next);

      expect(incidentService.respondToIncident).toHaveBeenCalledWith(req.user, 1, '10', req.body);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('markAsRead', () => {
    it('should mark incident as read and return 200', async () => {
      req = { user: { id: 'u1' }, galponId: 1, params: { id: '10' } };
      incidentService.markAsRead.mockResolvedValue({ updated: true });

      await incidentController.markAsRead(req, res, next);

      expect(incidentService.markAsRead).toHaveBeenCalledWith(req.user, 1, '10');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteIncident', () => {
    it('should delete incident and return 200', async () => {
      req = { user: { id: 'owner1' }, galponId: 1, params: { id: '10' } };
      incidentService.deleteIncident.mockResolvedValue({ deleted: true });

      await incidentController.deleteIncident(req, res, next);

      expect(incidentService.deleteIncident).toHaveBeenCalledWith(req.user, 1, '10');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});

