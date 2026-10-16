import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Función para verificar si un token JWT proviene de un flujo de recuperación de contraseña.
 * Utiliza atob para compatibilidad nativa con Edge Runtime de Next.js.
 */
function isRecoverySession(accessToken?: string): boolean {
  if (!accessToken) return false
  try {
    const parts = accessToken.split('.')
    if (parts.length < 2) return false
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64))
    return (
      Array.isArray(payload.amr) &&
      payload.amr.some((item: { method?: string }) => item.method === 'recovery')
    )
  } catch {
    return false
  }
}

/**
 * Middleware de protección de rutas de Next.js.
 * - Rutas públicas (/login, /register, /forgot-password, /reset-password): accesibles sin sesión.
 * - Rutas protegidas (/dashboard/**): redirigen a /login si no hay sesión activa.
 * - Parámetros o sesión de recuperación: bloquea estrictamente el acceso a cualquier ruta interna y redirige a /reset-password.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Si la petición incluye parámetros de recuperación pero apunta a otra ruta (ej: /dashboard/feeding)
  const isRecoveryParam =
    request.nextUrl.searchParams.get('type') === 'recovery' ||
    request.nextUrl.searchParams.has('token_hash') ||
    request.nextUrl.searchParams.has('code')

  if (isRecoveryParam && !pathname.startsWith('/reset-password')) {
    const resetUrl = new URL('/reset-password', request.url)
    request.nextUrl.searchParams.forEach((val, key) => {
      resetUrl.searchParams.set(key, val)
    })
    return NextResponse.redirect(resetUrl)
  }

  // Rutas públicas que no requieren autenticación previa
  const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/terms', '/privacy']
  const isPublic = publicPaths.some((p) => pathname.startsWith(p))

  // Rutas de autenticación para invitados (si ya tiene sesión, no debe ir a login, register, forgot-password ni reset-password)
  const guestOnlyPaths = ['/login', '/register', '/forgot-password', '/reset-password']
  const isRecoveryLink = pathname.startsWith('/reset-password') && (
    request.nextUrl.searchParams.has('code') ||
    request.nextUrl.searchParams.has('token_hash')
  )
  const isGuestOnly = guestOnlyPaths.some((p) => pathname.startsWith(p)) && !isRecoveryLink

  // Crear cliente Supabase SSR con cookies del request
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // E2E test bypass for local development
  if (process.env.NODE_ENV !== 'production' && request.cookies.get('e2e_bypass')?.value === 'true') {
    return response
  }

  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

  // 2. Si la sesión activa proviene de un flujo de recuperación (AMR === 'recovery'),
  // BLOQUEAR acceso a cualquier ruta interna y obligar a ir a /reset-password
  if (session?.access_token && isRecoverySession(session.access_token)) {
    if (!pathname.startsWith('/reset-password')) {
      return NextResponse.redirect(new URL('/reset-password', request.url))
    }
  }

  // Si está autenticado e intenta acceder a la raíz → redirigir al dashboard
  if (user && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Si está autenticado e intenta ir a rutas exclusivas de invitados (login/register/forgot-password) → redirigir a /active-session
  if (user && isGuestOnly) {
    return NextResponse.redirect(new URL('/active-session', request.url))
  }

  // Si NO está autenticado e intenta acceder a una ruta protegida → redirigir a login
  if (!user && !isPublic) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Agregar headers para prevenir cacheo de páginas protegidas
  if (!isPublic) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('Surrogate-Control', 'no-store')
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Aplica el middleware a todas las rutas excepto:
     * - Archivos estáticos de Next.js
     * - favicon.ico
     * - Rutas de API del backend (proxiadas por rewrites)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
