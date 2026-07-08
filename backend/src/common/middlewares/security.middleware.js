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

    if (req.body) {
        for (const key of Object.keys(req.body)) {
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
            if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeString(req.body[key]);
            }
        }
    }

    if (req.query) {
        for (const key of Object.keys(req.query)) {
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
            if (typeof req.query[key] === 'string') {
                req.query[key] = sanitizeString(req.query[key]);
            }
        }
    }

    next();
};

module.exports = { apiLimiter, helmetConfig, inputSanitizer };
