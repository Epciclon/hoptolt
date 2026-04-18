const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Configuración de rate limiting para login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 intentos por IP cada 15 minutos
    message: {
        success: false,
        message: 'Demasiados intentos de login. Intente nuevamente en 15 minutos.'
    }
});

// Rate limiting general para la API
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP cada 15 minutos
    message: {
        success: false,
        message: 'Demasiadas solicitudes desde esta IP. Intente nuevamente más tarde.'
    }
});

// Rate limiting estricto para endpoints sensibles
const strictLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // máximo 3 intentos por hora
    message: {
        success: false,
        message: 'Límite de solicitudes excedido para esta operación sensible.'
    }
});

// Configuración de Helmet para headers de seguridad
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
    crossOriginEmbedderPolicy: false // Deshabilitar para compatibilidad con React
});

// Middleware para logging de seguridad
const securityLogger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';
    const method = req.method;
    const url = req.url;
    
    // Log de intentos de acceso a rutas sensibles
    const sensitiveRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];
    
    if (sensitiveRoutes.some(route => url.includes(route))) {
        console.log(`[SECURITY LOG] ${timestamp} - IP: ${ip} - ${method} ${url} - User-Agent: ${userAgent}`);
    }
    
    next();
};

// Middleware para detectar ataques de fuerza bruta
const bruteForceDetection = (req, res, next) => {
    const ip = req.ip;
    const timestamp = Date.now();
    
    // Aquí podrías implementar lógica más sofisticada de detección
    // por ejemplo, almacenar intentos en Redis o base de datos
    
    next();
};

// Middleware para validar input y prevenir inyecciones
const inputSanitizer = (req, res, next) => {
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        
        // Remover caracteres potencialmente peligrosos
        return str
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // XSS básico
            .replace(/javascript:/gi, '') // URLs javascript
            .replace(/on\w+\s*=/gi, '') // Atributos de eventos
            .trim();
    };
    
    // Sanitizar body
    if (req.body) {
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeString(req.body[key]);
            }
        }
    }
    
    // Sanitizar query parameters
    if (req.query) {
        for (const key in req.query) {
            if (typeof req.query[key] === 'string') {
                req.query[key] = sanitizeString(req.query[key]);
            }
        }
    }
    
    next();
};

module.exports = {
    loginLimiter,
    apiLimiter,
    strictLimiter,
    helmetConfig,
    securityLogger,
    bruteForceDetection,
    inputSanitizer
};
