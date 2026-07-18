jest.mock('../../../src/domain/models', () => ({
    Galpon: {
        findByPk: jest.fn()
    }
}));

const { galponContext } = require('../../../src/common/middlewares/galponContext');
const AppError = require('../../../src/errors/AppError');

describe('galponContext', () => {
    let req, res, next;

    beforeEach(() => {
        req = { user: {} };
        res = {};
        next = jest.fn();
    });

    it('should set req.activeGalpon and req.galponId when activeGalponId is set and Galpon exists', async () => {
        const mockGalpon = { id: 1, name: 'Galpon A' };
        req.user.activeGalponId = 1;
        const { Galpon } = require('../../../src/domain/models');
        Galpon.findByPk.mockResolvedValue(mockGalpon);

        await galponContext(req, res, next);

        expect(req.activeGalpon).toBe(mockGalpon);
        expect(req.galponId).toBe(1);
        expect(next).toHaveBeenCalledWith();
    });

    it('should throw a 400 error when activeGalponId is missing', async () => {
        const { Galpon } = require('../../../src/domain/models');
        await galponContext(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        expect(next.mock.calls[0][0].statusCode).toBe(400);
        expect(next.mock.calls[0][0].message).toBe('No hay un galpón activo seleccionado.');
    });

    it('should throw a 404 error when Galpon is not found', async () => {
        req.user.activeGalponId = 999;
        const { Galpon } = require('../../../src/domain/models');
        Galpon.findByPk.mockResolvedValue(null);

        await galponContext(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        expect(next.mock.calls[0][0].statusCode).toBe(404);
        expect(next.mock.calls[0][0].message).toBe('El galpón activo no existe.');
    });

    it('should call findByPk with the activeGalponId', async () => {
        req.user.activeGalponId = 5;
        const { Galpon } = require('../../../src/domain/models');
        Galpon.findByPk.mockResolvedValue({ id: 5, name: 'Galpon E' });

        await galponContext(req, res, next);

        expect(Galpon.findByPk).toHaveBeenCalledWith(5);
    });

    it('should not call next if an error is thrown', async () => {
        req.user.activeGalponId = 1;
        const { Galpon } = require('../../../src/domain/models');
        Galpon.findByPk.mockRejectedValue(new Error('DB error'));

        await galponContext(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
        expect(req.activeGalpon).toBeUndefined();
    });
});
