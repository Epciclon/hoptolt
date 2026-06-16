const AppError = require('../../errors/AppError');

const handleSequelizeValidationError = (err) => {
    if (!err.errors || err.errors.length === 0) {
        return new AppError('Error de validación.', 400);
    }
    const errors = err.errors.map(e => e.message);
    return new AppError(errors.join(', '), 400);
};

const handleSequelizeUniqueConstraintError = (err) => {
    if (!err.errors || err.errors.length === 0) {
        return new AppError('Ya existe un registro con estos valores.', 400);
    }
    const field = err.errors[0].path;
    return new AppError(`Ya existe un registro con este ${field}.`, 400);
};

const errorMiddleware = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    let error = Object.assign(new AppError(err.message, err.statusCode), err);

    if (err.name === 'SequelizeValidationError') error = handleSequelizeValidationError(err);
    if (err.name === 'SequelizeUniqueConstraintError') error = handleSequelizeUniqueConstraintError(err);

    if (process.env.NODE_ENV === 'development') {
        return res.status(error.statusCode || 500).json({
            success: false,
            status: error.status,
            message: error.message,
            stack: err.stack
        });
    }

    if (error.isOperational) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message
        });
    }

    console.error('ERROR NO OPERACIONAL:', err);
    return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
    });
};

module.exports = errorMiddleware;
