const { tenantFilter } = require('../../../src/common/middlewares/tenant.middleware');

describe('tenantFilter', () => {
    let req, res, next;

    beforeEach(() => {
        req = {};
        res = {};
        next = jest.fn();
    });

    it('should set req.tenantId from req.user.id when user exists', () => {
        req.user = { id: 'profile-123' };
        tenantFilter(req, res, next);

        expect(req.tenantId).toBe('profile-123');
        expect(next).toHaveBeenCalled();
    });

    it('should not set req.tenantId when req.user is undefined', () => {
        tenantFilter(req, res, next);

        expect(req.tenantId).toBeUndefined();
        expect(next).toHaveBeenCalled();
    });

    it('should not set req.tenantId when req.user has no id', () => {
        req.user = {};
        tenantFilter(req, res, next);

        expect(req.tenantId).toBeUndefined();
        expect(next).toHaveBeenCalled();
    });

    it('should call next without errors when successful', () => {
        req.user = { id: 'profile-456' };
        tenantFilter(req, res, next);

        expect(next).toHaveBeenCalledWith();
    });
});
