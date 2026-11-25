# Hoptolt — Sistema de Gestión Cunícola (v3.8.0)

**Hoptolt** es una plataforma web multi-galpón y multi-usuario para la administración operativa, sanitaria, reproductiva y documental de granjas cunícolas. Combina un frontend moderno en **Next.js 14 (App Router)**, una API REST modular en **Node.js + Express + Sequelize** y servicios gestionados en **Supabase** (PostgreSQL, Auth, Storage y Realtime).

---

## 🧩 Módulos y Funcionalidades Principales

### Infraestructura y Catálogo
- **Galpones (`galpones`)**: administración multi-galpón con cambio dinámico de contexto activo en el panel.
- **Jaulas (`cages`)**: gestión de jaulas de `engorde` (capacidad 1–6) y `reproducción` (capacidad 1), filtros estandarizados y limpieza/estado.
- **Razas (`races`) y Conejos (`rabbits`)**: catálogo técnico, fotografías almacenadas en Supabase Storage, peso, edad, propósito y visualización rápida de ficha.
- **Árbol Genealógico (`genealogy`)**: trazabilidad de ascendencia y parentesco para evitar consanguinidad.
- **Asignaciones (`assignments`)**: asignación y transferencia de conejos entre jaulas con control de capacidad.

### Operación, Sanidad y Automatización
- **Alimentación (`feeding`)**: registro de raciones y cron automático cada minuto (`feeding.cron.js`) que evalúa turnos (mañana/tarde) y emite recordatorios.
- **Vacunación (`vaccination`) y Desparasitación (`deworming`)**: control sanitario preventivo por lote o ejemplar.
- **Limpieza (`cleaning`)**: seguimiento de higienización de jaulas y días sin limpieza.
- **Crecimiento (`growth`) y Mortalidad (`mortality`)**: seguimiento de evolución de peso y registro histórico de bajas por causa.
- **Reproducción y Parto (`reproduction`)**: seguimiento de montas, calendario de partos, gazapos y cron horario (`reproduction.cron.js`) que avanza automáticamente las fases de *Monta → Gestación (24 h) → Lactancia (31 días)*.

### Colaboración, Control y Accesibilidad
- **Equipo de Trabajo (`farmMember`) e Invitaciones (`invitation`)**: gestión de trabajadores, asignación a jaulas, permisos granulares por módulo y registro completo de auditoría de cambios y eventos de sistema.
- **Novedades / Incidencias (`incident`) y Notificaciones (`notification`)**: widget flotante de incidencias, centro de alertas y sincronización en tiempo real multi-usuario vía **Supabase Realtime** (`useRealtimeSync.ts`).
- **Reportes Básicos (`reports`)**: generación y descarga de reportes básicos en PDF (`jsPDF` + `jspdf-autotable`).
- **Tutoriales Integrados (`TutorialButton`)**: acceso directo desde cada módulo a videotutoriales paso a paso.
- **Apariencia y Accesibilidad (`settings`)**: modo normal, modo oscuro y alto contraste, tamaño de tipografía, texto en negrilla, avisos flotantes y personalización de tamaño y forma de avatares (`circle`, `rounded`, `square`).

---

## 🏗️ Arquitectura del Monorepo

```text
hoptolt/
├── .github/workflows/ci.yml               # Pipeline CI (arquitectura, auditoría, Jest, lint, tsc, Vitest, build, Playwright)
├── scripts/validate-architecture.js       # Validador automático de carpetas, fronteras de capas, tests e integridad
├── .sonarcloud.properties                 # Configuración de análisis estático en SonarCloud
├── backend/
│   ├── src/                               # API Express (Monolito Modular en Capas)
│   ├── tests/                             # Pruebas Jest por módulo
│   └── guia-arquitectura/
│       └── arquitectura-backend.md        # Detalle, reglas y justificación de la arquitectura backend
└── frontend/
    ├── src/                               # Aplicación Next.js 14 App Router (Modular por Dominio)
    ├── tests/                             # Pruebas unitarias Vitest y E2E Playwright
    └── guia-arquitectura/
        └── arquitectura-frontend.md       # Detalle, reglas y justificación de la arquitectura frontend
```

Consulta las guías detalladas de cada lado del sistema:
- **[Guía de Arquitectura del Backend](backend/guia-arquitectura/arquitectura-backend.md)** — Monolito Modular + Arquitectura en Capas (`routes → validator → controller → service → repository → domain/models`).
- **[Guía de Arquitectura del Frontend](frontend/guia-arquitectura/arquitectura-frontend.md)** — Arquitectura Modular por Dominio en Next.js App Router + Design System compartido + React Query / Supabase Realtime.

---

## 🛠️ Stack Tecnológico

| Área | Tecnologías Principales |
|---|---|
| **Frontend** | Next.js `14.2.35`, React `18`, TypeScript `5`, Tailwind CSS `3.4`, TanStack Query `v5`, React Hook Form + Zod, Axios, Lucide React, jsPDF |
| **Backend** | Node.js `20`, Express `4.21`, Sequelize `6.37`, `pg`, `node-cron`, Helmet, `express-rate-limit`, `express-validator`, Joi, Swagger (`swagger-jsdoc` / `swagger-ui-express`) |
| **Base de Datos y BaaS** | Supabase: PostgreSQL administrado, Auth JWT (`@supabase/ssr` / `@supabase/supabase-js`), Storage y Realtime |
| **Pruebas y Calidad** | Jest (`30`), Vitest (`4`), Testing Library, Playwright, Cypress, ESLint, SonarCloud, `scripts/validate-architecture.js` |
| **Despliegue en la Nube** | Frontend en **Vercel** · Backend API + Crons en **Render** · Base de datos, Auth, Storage y Realtime en **Supabase** |

---

## 🚀 Instalación y Ejecución Local

### Requisitos Previos
- **Node.js 20+** y **npm**
- Proyecto activo en **Supabase** (o PostgreSQL local + credenciales Supabase para Auth/Storage/Realtime)

### 1. Clonar el repositorio

```bash
git clone https://github.com/Epciclon/hoptolt.git
cd hoptolt
```

### 2. Configurar y levantar el Backend

```bash
cd backend
npm install
```

Crear `backend/.env` con tus credenciales:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres.<proyecto>:<password>@<host>:6543/postgres
SUPABASE_URL=https://<tu-proyecto>.supabase.co
SUPABASE_ANON_KEY=<tu_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<tu_service_role_key>
FRONTEND_URL=http://localhost:3000
```

Iniciar servidor backend:

```bash
npm run dev
```

Endpoints útiles en desarrollo:
- Salud del servidor: `http://localhost:5000/api/health`
- Documentación OpenAPI / Swagger: `http://localhost:5000/api-docs`

### 3. Configurar y levantar el Frontend

```bash
cd ../frontend
npm install
```

Crear `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu_anon_key>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<tu_publishable_key>
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Iniciar servidor frontend:

```bash
npm run dev
```

Abrir en el navegador `http://localhost:3000`. Las llamadas a `/api/*` se reescriben automáticamente hacia `NEXT_PUBLIC_API_URL` mediante `frontend/next.config.js`.

---

## 🧪 Calidad, Pruebas y CI/CD

El repositorio cuenta con integración continua en `.github/workflows/ci.yml` y puerta de calidad en **SonarCloud**:

1. **Validación de Arquitectura e Integridad** (desde la raíz):
   ```bash
   node scripts/validate-architecture.js
   ```
   Verifica estructura top-level, cumplimiento estricto de capas, aislamiento frontend/backend, suites de pruebas existentes por cada módulo y ausencia de claves privadas o marcadores de conflicto.

2. **Revisión del Backend** (en `backend/`):
   ```bash
   npm test
   npm run test:coverage
   ```

3. **Revisión del Frontend** (en `frontend/`):
   ```bash
   npm run lint
   npx tsc --noEmit
   npm test
   npm run build
   npm run test:e2e
   ```

---

## ☁️ Despliegue en la Nube

- **Vercel**: aloja la aplicación Next.js (`frontend/`) con HTTPS, caché de activos estáticos y proxy `/api/:path*` apuntando al backend en producción.
- **Render**: ejecuta el servicio Node.js/Express (`backend/src/app.js`) con la API REST, Swagger y las tareas automáticas de `node-cron` (`feeding.cron.js` y `reproduction.cron.js`).
- **Supabase**: provee PostgreSQL en la nube (conectado mediante SSL y pooler en puerto `6543`), autenticación JWT, almacenamiento de imágenes y canal Realtime para sincronización instantánea entre usuarios.
