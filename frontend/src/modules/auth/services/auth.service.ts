import { createClient } from '@/utils/supabase/client';
import api from '@/lib/api';
import type { Profile, RegisterDto, LoginDto, SyncProfileResponse } from '../types/auth.types';

/**
 * Servicio de autenticación usando Supabase Auth.
 *
 * Flujo de registro:
 *   1. supabase.auth.signUp()         → crea el usuario en Supabase Auth (cloud)
 *   2. POST /api/auth/sync-profile    → crea el perfil local en nuestra BD (respaldo al trigger)
 *
 * Flujo de login:
 *   1. GET /api/auth/resolve-email    → traduce username → email si el identifier no es un email
 *   2. supabase.auth.signInWithPassword() → autentica y guarda la sesión en cookies (SSR)
 *   3. GET /api/auth/me               → obtiene el perfil local usando el access_token de la sesión
 */
export const authService = {

  /** Registra un usuario en Supabase Auth y sincroniza el perfil en nuestra BD */
  async register(payload: RegisterDto): Promise<Profile> {
    const supabase = createClient();

    // 1. Crear usuario en Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          username: payload.username,
          fullName: payload.fullName,
        },
      },
    });

    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('No se pudo crear el usuario en Supabase.');

    // 2. Sincronizar perfil en nuestra BD (respaldo al trigger de PostgreSQL)
    const { data: syncData } = await api.post<SyncProfileResponse>('/auth/sync-profile', {
      id: data.user.id,
      email: payload.email,
      fullName: payload.fullName,
      username: payload.username,
    });

    return syncData.user;
  },

  /**
   * Inicia sesión: traduce username→email si es necesario y autentica con Supabase.
   * Retorna el perfil local del usuario.
   */
  async login(payload: LoginDto): Promise<void> {
    const supabase = createClient();

    // 1. Resolver email si el identifier es un username (no contiene @)
    let email = payload.identifier;
    if (!email.includes('@')) {
      const { data: resolveData } = await api.get<{ success: boolean; email: string }>(
        `/auth/resolve-email?identifier=${encodeURIComponent(payload.identifier)}`
      );
      email = resolveData.email;
    }

    // 2. Autenticar con Supabase Auth (la sesión se guarda automáticamente en cookies por @supabase/ssr)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: payload.password,
    });

    if (error) {
      // Traducimos los mensajes de error de Supabase al español
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Credenciales incorrectas. Verifica tu usuario y contraseña.');
      }
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Tu cuenta no ha sido confirmada. Revisa tu correo electrónico.');
      }
      throw new Error(error.message);
    }

    if (!data.session) throw new Error('No se pudo iniciar sesión.');

    // 3. Sincronizar el perfil local si no existe (respaldo al trigger)
    try {
      await api.post('/auth/sync-profile', {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata.fullName || '',
        username: data.user.user_metadata.username || email.split('@')[0],
      });
    } catch (syncError: unknown) {
      // Silencioso: el perfil puede ya existir por el trigger
      console.warn('Sincronización de perfil no requerida (posiblemente creada por trigger):', syncError instanceof Error ? syncError.message : String(syncError));
    }

    // 4. El AuthContext detectará el evento SIGNED_IN automáticamente
    // y obtendrá el perfil local. No lo hacemos aquí para evitar
    // deadlocks (múltiples llamadas a getSession concurrentes).
  },

  /** Cierra la sesión en Supabase */
  async logout(): Promise<void> {
    const supabase = createClient();
    await supabase.auth.signOut();
  },

  /** Obtiene el perfil del usuario actualmente autenticado desde nuestra BD */
  async getMe(): Promise<Profile> {
    const { data } = await api.get<{ success: boolean; user: Profile }>('/auth/me');
    return data.user;
  },

  /** Actualiza el galpón activo del usuario */
  async setActiveGalpon(galponId: number | null): Promise<Profile> {
    const { data } = await api.patch<{ success: boolean; user: Profile }>('/auth/active-galpon', { galponId });
    return data.user;
  },

  /** Retorna la sesión activa de Supabase (null si no está logueado) */
  async getSession() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  /** Actualiza los datos de perfil del usuario */
  async updateProfile(fullName: string, username: string): Promise<Profile> {
    // 1. Actualizar metadata en Supabase Auth
    const supabase = createClient();
    const { error: supabaseError } = await supabase.auth.updateUser({
      data: { fullName, username },
    });
    if (supabaseError) throw new Error(supabaseError.message);

    // 2. Actualizar base de datos local
    const { data } = await api.put<{ success: boolean; user: Profile }>('/auth/profile', {
      fullName,
      username,
    });
    return data.user;
  },

  /** Actualiza la contraseña del usuario tras re-verificar la actual */
  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    const supabase = createClient();

    // 1. Obtener usuario actual para sacar su email
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) throw new Error('Usuario no autenticado.');

    // 2. Re-verificar contraseña actual intentando hacer login silencioso
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInError) {
      throw new Error('La contraseña actual es incorrecta.');
    }

    // 3. Actualizar a la nueva contraseña
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (updateError) throw new Error(updateError.message);
  },

  /** Elimina la cuenta permanentemente */
  async deleteAccount(currentPassword: string): Promise<void> {
    await api.post('/auth/profile/delete', { currentPassword });
    // Cierra sesión local
    const supabase = createClient();
    await supabase.auth.signOut();
  },
};
