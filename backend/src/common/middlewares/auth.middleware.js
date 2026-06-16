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

// Cache simple en memoria para perfiles de usuario (TTL: 5 minutos)
const profileCache = new Map();
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

function clearCache(userId) {
    profileCache.delete(userId);
}

/**
 * Middleware que verifica el token JWT emitido por Supabase Auth y adjunta
 * req.user (el Profile local) al request.
 *
 * Flujo (Recomendado):
 *  1. Extrae el Bearer token del header Authorization.
 *  2. Lo verifica usando supabase.auth.getUser(token).
 *  3. Usa user.id (UUID del usuario en Supabase Auth) para buscar el perfil local.
 *  4. Adjunta el perfil a req.user y llama a next().
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('No autenticado. Proporcione un token válido.', 401);
        }

        if (!supabase) {
            throw new AppError('Configuración del servidor incompleta: SUPABASE_URL o SUPABASE_ANON_KEY no definidos.', 500);
        }

        const token = authHeader.split(' ')[1];

        // Usamos el SDK de Supabase para obtener y verificar el usuario con el token.
        // Esto confía en la verificación que hace la API de Supabase Auth,
        // lo que es más seguro y no requiere conocer el JWT_SECRET.
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            throw new AppError('Token inválido o expirado. Inicie sesión nuevamente.', 401);
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
