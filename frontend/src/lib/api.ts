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

// Control de concurrencia para la renovación del token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor de REQUEST: inyecta el JWT de Supabase en cada petición o lo renueva si está próximo a expirar
api.interceptors.request.use(async (config) => {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const nowSeconds = Math.floor(Date.now() / 1000);
      // Renovación proactiva: si faltan menos de 90 segundos para expirar, refrescar usando el refresh token
      if (session.expires_at && session.expires_at - nowSeconds < 90) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && refreshed?.session?.access_token) {
          config.headers.Authorization = `Bearer ${refreshed.session.access_token}`;
          return config;
        }
      }
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

async function handleSessionSignOut() {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch {
    // ignorar
  }
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

async function handleRefreshToken(originalRequest: any) {
  if (isRefreshing) {
    return new Promise<string | null>((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    })
      .then((token) => {
        if (typeof token === 'string' && token) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        return api(originalRequest);
      })
      .catch((err) => {
        throw err;
      });
  }

  originalRequest._retry = true;
  isRefreshing = true;

  try {
    const supabase = createClient();
    const { data, error: refreshError } = await supabase.auth.refreshSession();

    if (!refreshError && data?.session?.access_token) {
      const newToken = data.session.access_token;
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      processQueue(null, newToken);
      return api(originalRequest);
    }

    processQueue(refreshError || new Error('Sesión expirada'), null);
    await handleSessionSignOut();
  } catch (refreshErr) {
    processQueue(refreshErr, null);
    await handleSessionSignOut();
  } finally {
    isRefreshing = false;
  }
}

// Interceptor de RESPONSE: maneja renovación con Refresh Token en 401 y errores globales
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si el backend devuelve 401 y aún no se ha reintentado la petición, usar el refresh token
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      return handleRefreshToken(originalRequest);
    }

    const message =
      error.response?.data?.message ||
      error.response?.data?.errors?.join(', ') ||
      'Error de conexión. Intente nuevamente.';

    throw new Error(message);
  }
);

export default api;
