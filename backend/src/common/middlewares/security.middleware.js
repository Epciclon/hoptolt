const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 2000, // Incrementado de 100 a 2000 para permitir navegación normal y desarrollo fluido sin bloqueos
    message: {
        success: false,
        message: 'Demasiadas solicitudes desde esta IP. Intente nuevamente más tarde.'
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 intentos
    message: {
        success: false,
        message: 'Demasiados intentos de autenticación desde esta IP. Intente nuevamente en 15 minutos.'
    }
});

const registerLimiter = rateLimit({
    windowMs: 30 * 60 * 1000, // 30 minutos
    max: 3, // 3 intentos de registro por IP
    message: {
        success: false,
        message: 'Demasiados intentos de registro desde esta IP. Intente nuevamente en 30 minutos.'
    }
});

const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false
});

const inputSanitizer = (req, res, next) => {
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        return str
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim();
    };

    const sanitizeObject = (obj) => {
        if (!obj) return;
        for (const key of Object.keys(obj)) {
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
            if (typeof obj[key] === 'string') {
                obj[key] = sanitizeString(obj[key]);
            }
        }
    };

    sanitizeObject(req.body);
    sanitizeObject(req.query);
    sanitizeObject(req.params);

    next();
};

module.exports = { apiLimiter, authLimiter, registerLimiter, helmetConfig, inputSanitizer };
