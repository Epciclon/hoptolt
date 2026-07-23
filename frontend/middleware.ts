import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Middleware de protección de rutas de Next.js.
 * - Rutas públicas (/login, /register): accesibles sin sesión.
 * - Rutas protegidas (/dashboard/**): redirigen a /login si no hay sesión activa.
 * - Raíz (/): redirige al dashboard si hay sesión, o a login si no la hay.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas que NO requieren autenticación
  const publicPaths = ['/login', '/register']
  const isPublic = publicPaths.some((p) => pathname.startsWith(p))

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

  const { data: { user } } = await supabase.auth.getUser()

  // Si está autenticado e intenta acceder a la raíz → redirigir al dashboard
  if (user && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Si está autenticado e intenta ir a login/register → redirigir a /active-session
  if (user && isPublic) {
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
