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
function checkRecoverySessionJwt(parts) {
    if (parts.length < 2) return null;
    try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        if (Array.isArray(payload.amr) && payload.amr.some(item => item.method === 'recovery')) {
            throw new AppError('Sesión de recuperación. Debe actualizar su contraseña antes de acceder al sistema.', 403);
        }
        return payload;
    } catch (jwtErr) {
        if (jwtErr instanceof AppError) throw jwtErr;
        return null;
    }
}

async function getVerifiedUser(token, isRealJwt, jwtPayload) {
    const cachedUser = isRealJwt ? getTokenUserFromCache(token) : null;
    if (cachedUser) return cachedUser;

    const { data: { user: verifiedUser }, error } = await supabase.auth.getUser(token);
    if (error || !verifiedUser) {
        throw new AppError('Token inválido o expirado. Inicie sesión nuevamente.', 401);
    }

    if (isRealJwt) {
        setTokenUserCache(token, verifiedUser, jwtPayload?.exp);
    }
    return verifiedUser;
}

async function resolveUserProfile(userId) {
    let profile = getFromCache(userId);
    if (!profile) {
        profile = await Profile.findByPk(userId);
        if (!profile) {
            throw new AppError('Usuario no encontrado. Por favor complete su perfil.', 404);
        }
        setCache(userId, profile);
    }
    return profile;
}

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
        const jwtPayload = checkRecoverySessionJwt(parts);

        const user = await getVerifiedUser(token, isRealJwt, jwtPayload);
        req.user = await resolveUserProfile(user.id);
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = { authenticate, supabase, clearCache };
