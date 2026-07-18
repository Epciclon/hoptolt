const AppError = require('../../src/errors/AppError');

describe('AppError', () => {
    it('should create an error with message and statusCode', () => {
        const err = new AppError('Test message', 400);
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('Test message');
        expect(err.statusCode).toBe(400);
    });

    it('should set status to "fail" for 4xx status codes', () => {
        const err400 = new AppError('Bad request', 400);
        expect(err400.status).toBe('fail');

        const err401 = new AppError('Unauthorized', 401);
        expect(err401.status).toBe('fail');

        const err404 = new AppError('Not found', 404);
        expect(err404.status).toBe('fail');
    });

    it('should set status to "error" for 5xx status codes', () => {
        const err500 = new AppError('Internal server error', 500);
        expect(err500.status).toBe('error');

        const err503 = new AppError('Service unavailable', 503);
        expect(err503.status).toBe('error');
    });

    it('should set status to "error" for non-4xx/5xx codes', () => {
        const err = new AppError('Redirect', 302);
        expect(err.status).toBe('error');
    });

    it('should set isOperational to true', () => {
        const err = new AppError('Test', 400);
        expect(err.isOperational).toBe(true);
    });

    it('should capture a stack trace', () => {
        const err = new AppError('Test', 500);
        expect(err.stack).toBeDefined();
        expect(err.stack).toContain('AppError');
    });

    it('should preserve the Error prototype chain', () => {
        const err = new AppError('Test', 401);
        expect(err instanceof Error).toBe(true);
        expect(err instanceof AppError).toBe(true);
    });

    it('should handle string status codes', () => {
        const err = new AppError('Test', '400');
        expect(err.status).toBe('fail');
        expect(err.statusCode).toBe('400');
    });
});
