# 🏗️ Arquitectura Frontend - Modular por Dominio (Next.js 14 App Router)

## 📌 Patrón Arquitectónico

El frontend de **Hoptolt** utiliza una **Arquitectura Modular por Dominio (Feature-Based Modular Architecture)** sobre **Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS**, acompañada de:

- **Shared UI Design System (`src/shared/ui/`)**: única fuente de verdad para controles, modales, catálogos, filtros, avatares y tablas accesibles.
- **Capa de Servicios y Caché Reactiva**: peticiones HTTP centralizadas en Axios (`src/lib/api.ts`), caché/sincronización con **TanStack Query v5** y suscripciones **Supabase Realtime** (`src/hooks/useRealtimeSync.ts`).
- **Enrutamiento App Router (`src/app/`)**: páginas delgadas que componen módulos de dominio bajo protección de sesión y permisos.

---

## 🤔 ¿Por qué se eligió esta arquitectura?

La decisión arquitectónica busca escalar casi 20 módulos funcionales sin degradar consistencia visual ni acoplar la UI a detalles de API:

1. **Cohesión por dominio para 19 módulos funcionales**: agrupar `components/`, `hooks/`, `services/`, `types/`, `validators/`, `constants/`, `contexts/` y `utils/` dentro de `src/modules/<dominio>/` hace que cualquier cambio sobre conejos, jaulas, reproducción o genealogía quede localizado en una sola carpeta fácil de navegar y mantener.
2. **Separación estricta de capas verificada en CI**: `scripts/validate-architecture.js` bloquea en cada PR archivos sueltos fuera de las carpetas permitidas, impide componentes `.tsx` en `services/`, `types/`, `validators/` o `constants/`, prohíbe importar UI dentro de `services/` o `types/`, bloquea cualquier import directo hacia `backend/` y exige pruebas por módulo en `frontend/tests/modules/<modulo>`.
3. **Design System único y accesibilidad transversal**: centralizar componentes base en `src/shared/ui/` garantiza comportamiento uniforme en carga, errores, confirmación segura contra doble clic (`ConfirmDialog`), responsive móvil/escritorio y soporte inmediato de los 3 temas visuales (Normal, Modo Oscuro, Alto Contraste), tamaño de letra, texto en negrilla y forma/escala de avatares.
4. **Sincronización en tiempo real sin polling agresivo**: combinar `TanStack Query` con `useRealtimeSync` (escuchando `postgres_changes` en 15 tablas de Supabase) mantiene actualizados múltiples usuarios en el mismo galpón invalidando únicamente las *query keys* afectadas.
5. **Proxy transparente contra CORS y cookies seguras**: mediante `next.config.js` (`/api/:path*`), el navegador interactúa con el mismo origen mientras el middleware SSR de Supabase y el interceptor de `src/lib/api.ts` gestionan la sesión y renovación del token JWT automáticamente.

---

## 📋 Estructura Real de Carpetas

```text
frontend/src/
├── middleware.ts                          # Protección de rutas y sesión SSR (@supabase/ssr)
│
├── app/                                   # Rutas Next.js 14 App Router
│   ├── globals.css                        # Tokens CSS (:root, .theme-dark, .theme-contrast, .theme-bold, scrollbars)
│   ├── layout.tsx                         # Layout raíz, fuentes y ClientProviders
│   ├── ClientProviders.tsx                # QueryProvider, AuthProvider, RealtimeSync, ThemeSync, ToastContainer
│   ├── page.tsx                           # Raíz /
│   ├── error.tsx / not-found.tsx          # Manejo global de errores y 404
│   │
│   ├── login/page.tsx                     # Inicio de sesión
│   ├── register/page.tsx                  # Registro de propietarios
│   ├── forgot-password/page.tsx           # Solicitud de recuperación de contraseña
│   ├── reset-password/page.tsx            # Restablecimiento de contraseña
│   ├── active-session/page.tsx            # Aviso de sesión activa detectada
│   ├── privacy/page.tsx / terms/page.tsx  # Privacidad y términos de uso
│   ├── storage/[bucket]/[...path]/        # Proxy/ruta de acceso a objetos de almacenamiento
│   │
│   └── dashboard/                         # Área autenticada (Sidebar + Header + PermissionGuard + QuickView)
│       ├── layout.tsx                     # Layout del panel con menú lateral colapsable e IncidentFloatingWidget
│       ├── page.tsx                       # Inicio / resumen del galpón activo
│       ├── error.tsx / not-found.tsx
│       ├── assignments/                   # Asignación y transferencia de jaulas
│       ├── cages/                         # Catálogo y CRUD de jaulas
│       ├── cleaning/                      # Limpieza de jaulas
│       ├── deworming/                     # Desparasitación
│       ├── feeding/                       # Alimentación y turnos
│       ├── galpones/                      # Gestión multi-galpón
│       ├── genealogy/                     # Árbol genealógico
│       ├── incidents/                     # Novedades / incidencias
│       ├── mortality/                     # Registro de mortalidad
│       ├── notifications/                 # Centro de notificaciones y alertas
│       ├── profile/                       # Perfil de usuario
│       ├── rabbits/                       # Catálogo y CRUD de conejos
│       ├── races/                         # Catálogo y CRUD de razas
│       ├── reportes/                      # Generación de Reportes Básicos (PDF)
│       ├── reproduction/                  # Monta, gestación, lactancia y gazapos
│       ├── settings/                      # Apariencia, accesibilidad y avatares
│       ├── users/                         # Equipo de trabajo, roles, permisos y auditoría
│       └── vaccination/                   # Vacunación
│
├── modules/                               # 19 módulos de dominio
│   ├── assignments/  ├── auth/          ├── cages/        ├── cleaning/
│   ├── deworming/    ├── farmMember/    ├── feeding/      ├── galpones/
│   ├── genealogy/    ├── growth/        ├── incident/     ├── invitation/
│   ├── mortality/    ├── notification/  ├── rabbits/      ├── races/
│   ├── reports/      ├── reproduction/  └── vaccination/
│   │
│   # Subcarpetas válidas dentro de cada módulo (validadas por CI):
│   # components/ | constants/ | contexts/ | hooks/ | services/ | types/ | utils/ | validators/
│
├── shared/                                # UI y estructura transversal
│   ├── ui/                                # Design System (importar desde '@/shared/ui')
│   │   ├── Alert.tsx, AuditHistoryView.tsx, Badge.tsx, Button.tsx,
│   │   ├── CageCatalog.tsx, CageGroupCard.tsx, CageGroupGrid.tsx, Card.tsx,
│   │   ├── CatalogCard.tsx, DashboardTabs.tsx, DateTimeBadge.tsx, Dialog.tsx,
│   │   ├── DropdownPortal.tsx, EventDetailsModal.tsx, FilterBar.tsx,
│   │   ├── FullScreenLoader.tsx, ImagePlaceholder.tsx, Input.tsx,
│   │   ├── LoadingMessage.tsx, Pagination.tsx, RabbitAvatar.tsx,
│   │   ├── RabbitSelectableCard.tsx, SectionMessage.tsx, Select.tsx,
│   │   ├── SelectionActionBar.tsx, Table.tsx, Toast.tsx, ToastContainer.tsx,
│   │   ├── TutorialButton.tsx, WorkerDetailsModal.tsx
│   │   └── index.ts                       # Barrel export único
│   ├── layout/
│   │   ├── Sidebar.tsx                    # Navegación lateral filtrada por rol/permisos
│   │   └── Header.tsx                     # Barra superior: galpón activo, novedades, notificaciones y perfil
│   └── guards/
│       └── PermissionGuard.tsx            # Bloqueo de rutas sin permisos asignados
│
├── providers/
│   └── QueryProvider.tsx                  # Cliente TanStack Query v5
├── hooks/
│   ├── useRealtimeSync.ts                 # Suscripción Supabase Realtime → invalidateQueries
│   ├── useSupabase.ts
│   └── useThemeSync.ts                    # Sincronización de tema, fuente, negrilla, escala y forma de avatar
├── lib/
│   ├── api.ts                             # Cliente Axios + interceptor JWT + cola de refresh en 401
│   ├── constants.ts                       # Constantes de dominio, APP_VERSION y APP_COPYRIGHT
│   └── utils.ts                           # Utilidades (cn, formateo de fechas, etc.)
├── utils/supabase/                        # Clientes Supabase (browser / server)
└── types/                                 # Tipos compartidos globales
```

---

## 🎯 Responsabilidad de Cada Capa

- **`types/`**: interfaces TypeScript de entidades, respuestas y DTOs; sin dependencias hacia componentes ni servicios.
- **`services/`**: funciones asíncronas sobre `api` (`@/lib/api`), sin estado ni imports de UI.
- **`hooks/`**: encapsulan estado de módulo y consultas/mutaciones (`TanStack Query` / estado local), marcando `'use client'`.
- **`validators/` y `constants/`**: esquemas Zod (`react-hook-form` + `@hookform/resolvers`) y catálogos constantes del dominio.
- **`components/`**: vistas, catálogos, tablas y formularios usando componentes del barrel `@/shared/ui`.

---

## 🔄 Flujo de Peticiones y Autenticación

```text
Componente ('use client')
   ↓
Hook de módulo (React Query / estado)
   ↓
[modulo].service.ts  →  src/lib/api.ts (Axios baseURL: '/api', timeout: 10s)
   ↓
Interceptor Request:
  ├─ Obtiene sesión actual desde Supabase (@supabase/ssr)
  ├─ Si access_token expira en < 90 s → ejecuta refreshSession() proactivo
  └─ Inyecta Authorization: Bearer <token>
   ↓
next.config.js rewrite (/api/:path*) → NEXT_PUBLIC_API_URL/:path* (o localhost:5000/api/:path*)
   ↓
Interceptor Response:
  └─ Ante 401 (no reintentado): encola peticiones concurrentes, refresca sesión y reintenta; si falla, cierra sesión y redirige a /login
```

---

## 🎨 Sistema de Diseño, Temas y Accesibilidad

Definido mediante variables CSS en `src/app/globals.css`, enlazadas a Tailwind en `tailwind.config.ts` y sincronizadas por `src/hooks/useThemeSync.ts`:

- **Temas disponibles**: Modo Normal (`:root`), Modo Oscuro (`.theme-dark`) y Alto Contraste (`.theme-contrast`).
- **Accesibilidad visual**: ajuste dinámico del tamaño de fuente base (`html { font-size }`), activación global de texto en negrilla (`.theme-bold`) y avisos flotantes configurables.
- **Avatares y fotos (`RabbitAvatar.tsx`)**: escala configurable mediante `--avatar-scale` (por defecto `1.25`) y tres formas (`circle`, `rounded`, `square`) controladas por `--avatar-radius` y `--avatar-radius-sm` con proporción fija `1 / 1`.
- **Scrollbars temáticos**: variables `--scrollbar-*` y utilidad `.sidebar-scrollbar` para garantizar contraste legible tanto en el contenido principal como en el menú lateral oscuro.

---

## ➕ Cómo Agregar un Nuevo Módulo

1. Crear `frontend/src/modules/<modulo>/` usando únicamente subcarpetas permitidas por `validate-architecture.js` (`types`, `services`, `hooks`, `components`, `validators`, `constants`, `contexts`, `utils`).
2. Usar componentes visuales de `@/shared/ui` (incluyendo `FilterBar`, `Dialog`, `ConfirmDialog`, `TutorialButton` cuando aplique) y React Hook Form + Zod en formularios.
3. Registrar la ruta correspondiente en `frontend/src/app/dashboard/<modulo>/page.tsx`.
4. Si aplica al menú o control de acceso, agregar la entrada y mapeo de permisos en `src/shared/layout/Sidebar.tsx`.
5. Añadir pruebas unitarias en `frontend/tests/modules/<modulo>/` (requisito verificado por CI).
6. Validar con `node scripts/validate-architecture.js`, `npx tsc --noEmit`, `npm run lint` y `npm test`.

---

## ⚙️ Comandos y Variables de Entorno

```bash
# En frontend/
npm install
npm run dev            # Servidor de desarrollo en http://localhost:3000
npm run lint           # ESLint (next lint)
npx tsc --noEmit       # Verificación estática TypeScript
npm test               # Pruebas unitarias Vitest + Testing Library
npm run test:e2e       # Pruebas E2E con Playwright
npm run build          # Build de producción Next.js
```

Variables principales en `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable_key>
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```
