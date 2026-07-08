import axios from 'axios';
import { createClient } from '@/utils/supabase/client';

/**
 * Cliente Axios para comunicarse con el backend.
 * El interceptor de request adjunta automáticamente el access_token de la
 * sesión activa de Supabase como Bearer token en la cabecera Authorization.
 */
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  paramsSerializer: {
    indexes: null,
  },
});

// Interceptor de REQUEST: inyecta el JWT de Supabase en cada petición o lo limpia
api.interceptors.request.use(async (config) => {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    } else {
      delete config.headers.Authorization;
    }
  } catch {
    delete config.headers.Authorization;
  }

  // Asegurar que los campos null se envíen explícitamente en el body (para PUTs)
  if (config.data && config.method === 'put') {
    config.data = structuredClone(config.data);
  }

  return config;
});

// Interceptor de RESPONSE: maneja errores globales
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.errors?.join(', ') ||
      'Error de conexión. Intente nuevamente.';

    // Si el backend devuelve 401, cerramos sesión en Supabase y redirigimos a login
    if (error.response?.status === 401) {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch { /* ignorar */ }
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    throw new Error(message);
  }
);

export default api;
