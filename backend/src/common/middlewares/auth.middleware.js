const { createClient } = require('@supabase/supabase-js');
const AppError = require('../../errors/AppError');
const { Profile } = require('../../domain/models');

/**
 * Cliente de Supabase para el backend.
 * Se inicializa con las variables de entorno SUPABASE_URL y SUPABASE_ANON_KEY.
 */
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase;
if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
}

// Cache simple en memoria para perfiles de usuario y tokens JWT verificados (TTL: 5 minutos)
const profileCache = new Map();
const tokenCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function getFromCache(userId) {
    const cached = profileCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.profile;
    }
    return null;
}

function setCache(userId, profile) {
    profileCache.set(userId, {
        profile,
        timestamp: Date.now()
    });
}

function getTokenUserFromCache(token) {
    const cached = tokenCache.get(token);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.user;
    }
    if (cached) tokenCache.delete(token);
    return null;
}

function setTokenUserCache(token, user, expSeconds) {
    const now = Date.now();
    const jwtExpMs = expSeconds ? expSeconds * 1000 : now + CACHE_TTL;
    const expiresAt = Math.min(now + CACHE_TTL, jwtExpMs);
    if (expiresAt > now) {
        tokenCache.set(token, { user, expiresAt });
    }
}

function clearCache(userId) {
    profileCache.delete(userId);
    if (userId) {
        for (const [tokenKey, entry] of tokenCache.entries()) {
            if (entry?.user?.id === userId) {
                tokenCache.delete(tokenKey);
            }
        }
    }
}

/**
 * Middleware que verifica el token JWT emitido por Supabase Auth y adjunta
 * req.user (el Profile local) al request.
 *
 * Flujo (Recomendado):
 *  1. Extrae el Bearer token del header Authorization.
 *  2. Lo verifica usando supabase.auth.getUser(token) o cache de sesión reciente.
 *  3. Usa user.id (UUID del usuario en Supabase Auth) para buscar el perfil local.
 *  4. Adjunta el perfil a req.user y llama a next().
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            throw new AppError('No autenticado. Proporcione un token válido.', 401);
        }

        if (!supabase) {
            throw new AppError('Configuración del servidor incompleta: SUPABASE_URL o SUPABASE_ANON_KEY no definidos.', 500);
        }

        const token = authHeader.split(' ')[1];
        const parts = token.split('.');
        const isRealJwt = parts.length === 3;
        let jwtPayload = null;

        // Verificar si es un token temporal de recuperación de contraseña (bloquear acceso a la API)
        try {
            if (parts.length >= 2) {
                jwtPayload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
                if (Array.isArray(jwtPayload.amr) && jwtPayload.amr.some(item => item.method === 'recovery')) {
                    throw new AppError('Sesión de recuperación. Debe actualizar su contraseña antes de acceder al sistema.', 403);
                }
            }
        } catch (jwtErr) {
            if (jwtErr instanceof AppError) throw jwtErr;
        }

        let user = isRealJwt ? getTokenUserFromCache(token) : null;
        if (!user) {
            // Usamos el SDK de Supabase para obtener y verificar el usuario con el token.
            const { data: { user: verifiedUser }, error } = await supabase.auth.getUser(token);

            if (error || !verifiedUser) {
                throw new AppError('Token inválido o expirado. Inicie sesión nuevamente.', 401);
            }
            user = verifiedUser;
            if (isRealJwt) {
                setTokenUserCache(token, user, jwtPayload?.exp);
            }
        }

        // Intentamos obtener el perfil del cache
        let profile = getFromCache(user.id);
        
        // Si no está en cache, lo buscamos en la base de datos
        if (!profile) {
            profile = await Profile.findByPk(user.id);
            if (!profile) {
                throw new AppError('Usuario no encontrado. Por favor complete su perfil.', 404);
            }
            setCache(user.id, profile);
        }
        
        req.user = profile;
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = { authenticate, supabase, clearCache };
