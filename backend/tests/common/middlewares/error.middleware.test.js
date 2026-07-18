const AppError = require('../../../src/errors/AppError');
const errorMiddleware = require('../../../src/common/middlewares/error.middleware');

describe('errorMiddleware', () => {
    let req, res, next;
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        process.env.NODE_ENV = 'production';
    });

    afterAll(() => {
        process.env.NODE_ENV = originalEnv;
    });

    describe('operational errors', () => {
        it('should respond with the error statusCode and message', () => {
            const error = new AppError('Resource not found', 404);
            errorMiddleware(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Resource not found'
            });
        });

        it('should set default statusCode to 500 when not provided', () => {
            const error = new Error('Something broke');
            errorMiddleware(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Something broke'
            });
        });
    });

    describe('non-operational errors in production', () => {
        it('should return 500 with generic message', () => {
            const error = new Error('Database connection failed');
            error.statusCode = 500;
            error.isOperational = false;
            errorMiddleware(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor'
            });
        });
    });

    describe('non-operational errors in development', () => {
        beforeEach(() => {
            process.env.NODE_ENV = 'development';
        });

        it('should include status and stack trace in development', () => {
            const error = new Error('Debug error');
            error.statusCode = 500;
            errorMiddleware(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    status: 'error',
                    message: 'Debug error',
                    stack: expect.any(String)
                })
            );
        });
    });

    describe('SequelizeValidationError', () => {
        it('should map validation errors to AppError with joined messages', () => {
            const error = {
                name: 'SequelizeValidationError',
                message: 'Validation error',
                statusCode: 400,
                errors: [
                    { message: 'Name is required' },
                    { message: 'Age must be a number' }
                ]
            };

            errorMiddleware(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Name is required, Age must be a number'
            });
        });

        it('should return generic validation message when errors array is empty', () => {
            const error = {
                name: 'SequelizeValidationError',
                message: 'Validation error',
                statusCode: 400,
                errors: []
            };

            errorMiddleware(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Error de validación.'
            });
        });
    });

    describe('SequelizeUniqueConstraintError', () => {
        it('should map unique constraint error with field name', () => {
            const error = {
                name: 'SequelizeUniqueConstraintError',
                message: 'Validation error',
                statusCode: 400,
                errors: [
                    { path: 'email', message: 'email must be unique' }
                ]
            };

            errorMiddleware(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Ya existe un registro con este email.'
            });
        });

        it('should return generic message when errors array is empty', () => {
            const error = {
                name: 'SequelizeUniqueConstraintError',
                message: 'Validation error',
                statusCode: 400,
                errors: []
            };

            errorMiddleware(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Ya existe un registro con estos valores.'
            });
        });
    });
});
