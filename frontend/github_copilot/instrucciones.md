# 🏗️ Arquitectura Frontend - Modular por Dominio (Next.js App Router)

## 📌 Patrón Arquitectónico

Arquitectura **Modular por Dominio** sobre Next.js 14 App Router:
- **Feature-based modules**: todo lo relativo a un dominio (jaulas, conejos, razas) vive en su propia carpeta bajo `src/modules/`
- **Shared UI Design System**: componentes visuales reutilizables en `src/shared/ui/` (nunca crear botones/inputs ad-hoc)
- **Service Layer**: las llamadas HTTP están completamente separadas de los componentes

Es el mismo patrón que usa **Angular** (feature modules) adaptado a React con Next.js App Router.

## 📋 Estructura de Carpetas

```
frontend-nextjs/src/
│
├── app/                              # 🗺️ Rutas (Next.js App Router)
│   ├── globals.css                   # Variables CSS + Tailwind base
│   ├── layout.tsx                    # Root layout (html + body)
│   ├── page.tsx                      # / → redirige a /dashboard
│   │
│   ├── (auth)/                       # Grupo: rutas públicas (sin sidebar)
│   │   └── login/
│   │       └── page.tsx              # /login
│   │
│   └── (dashboard)/                  # Grupo: rutas protegidas (con Sidebar + Header)
│       ├── layout.tsx                # Layout compartido: Sidebar + Header
│       └── dashboard/                # ⚠️ Segmento real que crea la URL /dashboard
│           ├── page.tsx              # /dashboard → Panel de control
│           ├── cages/
│           │   ├── page.tsx          # /dashboard/cages → Lista jaulas
│           │   ├── register/
│           │   │   └── page.tsx      # /dashboard/cages/register → Crear jaula
│           │   └── [number]/edit/
│           │       └── page.tsx      # /dashboard/cages/[number]/edit → Editar jaula
│           ├── races/                # → Agregar igual que cages
│           ├── rabbits/
│           └── ...                   # → Un subdirectorio por cada módulo
│
├── modules/                          # 🧩 Lógica de negocio por dominio
│   ├── cages/
│   │   ├── types/
│   │   │   └── cage.types.ts         # Interfaces: Cage, CreateCageDto, UpdateCageDto
│   │   ├── services/
│   │   │   └── cage.service.ts       # Llamadas HTTP (objeto cageService)
│   │   ├── hooks/
│   │   │   └── useCages.ts           # Estado + llamadas al service
│   │   └── components/
│   │       ├── CageTable.tsx         # Tabla con acciones
│   │       └── CageForm.tsx          # Formulario con validación Zod
│   ├── rabbits/
│   ├── races/
│   └── assignments/
│
├── shared/                           # 🔧 Código transversal reutilizable
│   ├── ui/                           # Design System - ÚNICA fuente de verdad visual
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Table.tsx
│   │   ├── Dialog.tsx
│   │   ├── Alert.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   └── index.ts                  # Barrel export
│   └── layout/
│       ├── Sidebar.tsx               # Navegación lateral
│       └── Header.tsx                # Header con usuario y notificaciones
│
├── lib/
│   ├── api.ts                        # Instancia Axios + interceptores auth/error
│   ├── utils.ts                      # cn(), formatDate(), formatDateTime()
│   └── constants.ts                  # Constantes del dominio (tipos, roles, etc.)
│
└── types/
    └── api.types.ts                  # Interfaces genéricas: ApiResponse<T>, PaginatedResponse<T>
```

## 🎯 Responsabilidad de Cada Capa (dentro de cada módulo)

### **[módulo].types.ts** - Contratos TypeScript
- Define las interfaces del dominio: entidad principal + DTOs (Create, Update)
- Sin lógica, sin imports externos
- Usadas por todas las otras capas del módulo

### **[módulo].service.ts** - Acceso a la API
- Objeto literal con métodos async: `getAll`, `getById`, `create`, `update`, `delete`
- Importa la instancia `api` de `@/lib/api`
- Tipado estricto en request y response
- Sin estado, sin efectos secundarios

### **use[Módulo].ts** - Estado del módulo
- Custom hook que consume el service y gestiona `loading`, `error`, `data`
- Expone funciones para CRUD (ej: `deleteCage`, `fetchCages`)
- Siempre con `'use client'` (usa `useState`, `useEffect`)

### **[Módulo]Table.tsx** - Vista de lista
- Usa el hook y el componente `Table<T>` de `@/shared/ui`
- Define columnas con acciones (Editar / Eliminar)
- Maneja el `ConfirmDialog` para confirmar eliminación
- Con `'use client'`

### **[Módulo]Form.tsx** - Vista de formulario
- Usa `useForm` (React Hook Form) + `zodResolver` (Zod)
- Usa `Input`, `Select`, `Button` de `@/shared/ui`
- Llama directamente al service (create/update según `mode`)
- Con `'use client'`

## 🔧 Shared UI - Design System

Importar **siempre** desde el barrel:
```tsx
import { Button, Input, Select, Table, Dialog, ConfirmDialog, Alert, Badge, Card, CardHeader } from '@/shared/ui';
```

### Componentes y sus props principales

| Componente | Props clave | Uso |
|---|---|---|
| `Button` | `variant`, `size`, `loading`, `icon`, `fullWidth` | Toda acción del usuario |
| `Input` | `label`, `error`, `hint`, `required` | Campos de texto/número/fecha |
| `Select` | `label`, `options`, `error`, `placeholder` | Dropdowns |
| `Table<T>` | `columns`, `data`, `loading`, `rowKey`, `onRowClick` | Listados de datos |
| `Dialog` | `open`, `onClose`, `title`, `size` | Modales con contenido custom |
| `ConfirmDialog` | `open`, `onConfirm`, `title`, `variant`, `loading` | Confirmaciones destructivas |
| `Alert` | `variant`, `message`, `onClose` | Mensajes de éxito/error/advertencia |
| `Badge` | `variant`, `children` | Etiquetas de estado |
| `Card` | `padding` | Contenedor de sección |
| `CardHeader` | `title`, `subtitle`, `actions` | Encabezado de Card |

### Variantes de Button
```tsx
<Button variant="primary">Guardar</Button>    // verde — acción principal
<Button variant="secondary">Cancelar</Button> // gris — acción secundaria
<Button variant="danger">Eliminar</Button>    // rojo — acción destructiva
<Button variant="success">Aprobar</Button>    // verde esmeralda
<Button variant="warning">Advertir</Button>   // ámbar
<Button variant="outline">Ver</Button>        // borde fino
<Button variant="ghost">Ignorar</Button>      // sin fondo
```

## 🔄 Flujo de una Request HTTP

```
Page (Server Component)
    ↓
[Módulo]Table.tsx  ['use client']
    ↓
use[Módulo].ts     ['use client']  →  useState / useEffect
    ↓
[módulo].service.ts               →  getAll() / create() / delete()
    ↓
src/lib/api.ts  (Axios)           →  GET /api/cages
    ↓
next.config.js  (rewrite)         →  http://localhost:5000/api/cages  (backend Express)
    ↓
Response  →  interceptor extrae message de error ← Cookies.get('auth_token') en request
```

## 🔒 Autenticación

- El token JWT se almacena en la cookie `auth_token` (vía `js-cookie`)
- El interceptor de `src/lib/api.ts` lo adjunta en cada request como `Authorization: Bearer <token>`
- Si el servidor responde `401`, el interceptor elimina la cookie y redirige a `/login`
- La página de login llama a `POST /api/auth/login` y guarda el token

## 🗺️ Convención de Rutas

| URL | Archivo | Propósito |
|---|---|---|
| `/login` | `(auth)/login/page.tsx` | Autenticación |
| `/dashboard` | `(dashboard)/dashboard/page.tsx` | Panel de control |
| `/dashboard/[recurso]` | `(dashboard)/dashboard/[recurso]/page.tsx` | Lista |
| `/dashboard/[recurso]/register` | `.../register/page.tsx` | Crear nuevo |
| `/dashboard/[recurso]/[id]/edit` | `.../[id]/edit/page.tsx` | Editar existente |

## ➕ Cómo Agregar un Nuevo Módulo

Ejemplo: módulo `feeding` (Alimentación).

### 1. Tipos
```ts
// src/modules/feeding/types/feeding.types.ts
export interface Feeding {
  id: number;
  rabbitId: number;
  date: string;
  amount: number;
}
export interface CreateFeedingDto {
  rabbitId: number;
  date: string;
  amount: number;
}
export interface UpdateFeedingDto extends Partial<CreateFeedingDto> {}
```

### 2. Service
```ts
// src/modules/feeding/services/feeding.service.ts
import api from '@/lib/api';
import type { Feeding, CreateFeedingDto } from '../types/feeding.types';

export const feedingService = {
  async getAll(): Promise<Feeding[]> {
    const { data } = await api.get<{ success: boolean; feedings: Feeding[] }>('/feedings');
    return data.feedings;
  },
  async create(payload: CreateFeedingDto): Promise<Feeding> {
    const { data } = await api.post<{ success: boolean; feeding: Feeding }>('/feedings', payload);
    return data.feeding;
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/feedings/${id}`);
  },
};
```

### 3. Hook
```ts
// src/modules/feeding/hooks/useFeeding.ts
'use client';
import { useState, useEffect, useCallback } from 'react';
import { feedingService } from '../services/feeding.service';
import type { Feeding } from '../types/feeding.types';

export function useFeeding() {
  const [feedings, setFeedings] = useState<Feeding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setFeedings(await feedingService.getAll());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFeedings(); }, [fetchFeedings]);

  const deleteFeeding = async (id: number) => {
    try { await feedingService.delete(id); setFeedings(p => p.filter(f => f.id !== id)); return true; }
    catch (err) { setError(err instanceof Error ? err.message : 'Error al eliminar.'); return false; }
  };

  return { feedings, loading, error, fetchFeedings, deleteFeeding };
}
```

### 4. Componentes
Crear `FeedingTable.tsx` y `FeedingForm.tsx` usando exclusivamente componentes de `@/shared/ui`.

### 5. Páginas
```
src/app/(dashboard)/dashboard/feeding/page.tsx           → usa FeedingTable
src/app/(dashboard)/dashboard/feeding/register/page.tsx  → usa FeedingForm mode="create"
src/app/(dashboard)/dashboard/feeding/[id]/edit/page.tsx → usa FeedingForm mode="edit"
```

### 6. Sidebar
Agregar en `src/shared/layout/Sidebar.tsx` dentro del grupo correspondiente del array `navigation`.

## 🎨 Tokens de Color (Tailwind)

```
primary-500   → #1abc9c  (acción principal)
primary-600   → #16a085  (hover de acción principal)
bg-sidebar    → #263445  (fondo sidebar)
bg-page       → #f4f6fa  (fondo general de la app)
slate-*       → textos, bordes, fondos secundarios
```

**Regla**: nunca usar colores hex inline en componentes. Solo clases Tailwind.

## 📐 Reglas de Código

- **Server vs Client**: por defecto los componentes son Server. Agregar `'use client'` solo al nivel más bajo que lo necesita (estado, eventos, hooks)
- **Importar UI**: siempre desde `@/shared/ui` (barrel), nunca rutas individuales
- **Formularios**: obligatorio React Hook Form + Zod. Nunca validación manual con `onChange`
- **Errores**: el hook expone `error: string | null` → renderizar con `<Alert variant="error" message={error} />`
- **Nombres de archivos**: `PascalCase` para componentes `.tsx`, `camelCase` para hooks/services `.ts`
- **Sin CSS files**: solo clases Tailwind. Variables globales en `globals.css`

## ⚙️ Comandos

```bash
# Instalar dependencias (primera vez)
npm install

# Desarrollo
npm run dev          # http://localhost:3000

# Producción
npm run build
npm run start
```

> **Proxy**: Next.js reescribe `/api/*` → `http://localhost:5000/api/*` (backend Express).  
> Ver configuración en `next.config.js`.

## 🗄️ Variables de Entorno

```bash
# No se requieren variables de entorno en desarrollo
# El proxy a /api/* apunta automáticamente a localhost:5000

# Para producción agregar en .env.local:
# NEXT_PUBLIC_API_URL=https://tu-backend.com
```
