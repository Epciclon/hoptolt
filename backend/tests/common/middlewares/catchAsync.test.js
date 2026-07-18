const catchAsync = require('../../../src/common/middlewares/catchAsync');

describe('catchAsync', () => {
    let req, res, next;

    beforeEach(() => {
        req = {};
        res = {};
        next = jest.fn();
    });

    it('should call next with error when the wrapped function rejects', async () => {
        const error = new Error('Async error');
        const fn = jest.fn().mockRejectedValue(error);
        const wrapped = catchAsync(fn);

        await wrapped(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
    });

    it('should not call next when the wrapped function resolves', async () => {
        const fn = jest.fn().mockResolvedValue('success');
        const wrapped = catchAsync(fn);

        await wrapped(req, res, next);

        expect(next).not.toHaveBeenCalled();
    });

    it('should pass req, res, and next to the wrapped function', async () => {
        const fn = jest.fn().mockResolvedValue();
        const wrapped = catchAsync(fn);

        await wrapped(req, res, next);

        expect(fn).toHaveBeenCalledWith(req, res, next);
    });

    it('should not return a value (middleware pattern)', async () => {
        const fn = jest.fn().mockResolvedValue('result');
        const wrapped = catchAsync(fn);

        const result = wrapped(req, res, next);

        expect(result).toBeUndefined();
    });
});
