const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

/**
 * Obtiene la dirección IP real del cliente considerando proxies confiables
 */
const getClientIp = (req) => {
    return req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';
};

/**
 * Extrae de forma segura y síncrona el UUID del usuario desde el JWT sin consultar base de datos
 */
const extractUserIdFromAuthHeader = (authHeader) => {
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.split(' ')[1];
    if (!token) return null;
    try {
        const parts = token.split('.');
        if (parts.length >= 2) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            if (payload && typeof payload.sub === 'string' && payload.sub.length > 0) {
                return payload.sub;
            }
        }
    } catch (_error) {
        // Token malformado o no decodificable: se retorna null para limitar por IP
    }
    return null;
};

/**
 * Limitador general de la API: 2000 peticiones cada 15 minutos por usuario individual
 * Si el usuario está autenticado, su cuota es personal e independiente de la IP compartida.
 * Si es una petición anónima o sin sesión, se contabiliza por su IP.
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 2000,
    skip: (req) => req.method === 'OPTIONS', // No consumir cuota en preflight CORS
    keyGenerator: (req) => {
        const userId = extractUserIdFromAuthHeader(req.headers?.authorization);
        if (userId) {
            return `usr_${userId}`;
        }
        return `ip_${getClientIp(req)}`;
    },
    message: {
        success: false,
        message: 'Demasiadas solicitudes. Intente nuevamente más tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Limitador para intentos de autenticación: 5 intentos cada 15 minutos
 * Aísla por cuenta y por IP: si un trabajador falla 5 veces su contraseña, no bloquea al propietario ni a los demás en el mismo Wi-Fi.
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5,
    skip: (req) => req.method === 'OPTIONS',
    keyGenerator: (req) => {
        const identifier = (req.query?.identifier || req.body?.identifier || req.body?.username || req.body?.email || '')
            .toString()
            .toLowerCase()
            .trim();
        const ip = getClientIp(req);
        return identifier ? `auth_${identifier}_${ip}` : `auth_ip_${ip}`;
    },
    message: {
        success: false,
        message: 'Demasiados intentos de acceso para esta cuenta o red. Intente nuevamente en 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Limitador para registros de nuevas cuentas: 3 intentos cada 30 minutos
 * Aísla por correo y por IP para evitar denegación de servicio a usuarios legítimos.
 */
const registerLimiter = rateLimit({
    windowMs: 30 * 60 * 1000, // 30 minutos
    max: 3,
    skip: (req) => req.method === 'OPTIONS',
    keyGenerator: (req) => {
        const email = (req.body?.email || '').toString().toLowerCase().trim();
        const ip = getClientIp(req);
        return email ? `reg_${email}_${ip}` : `reg_ip_${ip}`;
    },
    message: {
        success: false,
        message: 'Demasiados intentos de registro para esta cuenta o red. Intente nuevamente en 30 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false
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
