# 🏗️ Arquitectura Backend - Layered + Modular (Monolito Modular)

## 📌 Patrón Arquitectónico

Combinación de dos patrones estándar de la industria:
- **Layered Architecture**: cada módulo respeta las capas (routes → controller → service → repository → model)
- **Modular Monolith**: el código se agrupa por dominio de negocio, no por tipo de archivo

Es exactamente el mismo patrón que usa **NestJS** (estándar de Node.js en la industria).

## 📋 Estructura de Carpetas

```
backend/src/
├── errors/                          # ⚠️ Clases de error personalizadas
│   └── AppError.js
│
├── domain/                          # 🧱 Modelos compartidos (Sequelize)
│   └── models/
│       ├── cage.model.js
│       ├── rabbit.model.js
│       ├── race.model.js
│       ├── assignment.model.js
│       └── index.js                 # Relaciones entre modelos
│
├── infrastructure/                  # 🔌 Infraestructura compartida
│   ├── database/
│   │   └── connection.js            # Instancia única de Sequelize
│   └── docs/
│       ├── swagger.js
│       └── swaggerGenerator.js      # Escanea modules/ recursivamente
│
├── common/                          # 🔧 Código transversal reutilizable
│   ├── middlewares/
│   │   ├── catchAsync.js
│   │   ├── error.middleware.js
│   │   └── security.middleware.js
│   └── dtos/                        # Data Transfer Objects
│       ├── cage.dto.js
│       ├── rabbit.dto.js
│       ├── race.dto.js
│       └── assignment.dto.js
│
├── modules/                         # 🧩 Módulos de negocio (autocontenidos)
│   ├── cage/
│   │   ├── cage.routes.js
│   │   ├── cage.validator.js
│   │   ├── cage.controller.js
│   │   ├── cage.service.js
│   │   └── cage.repository.js
│   ├── rabbit/
│   │   ├── rabbit.routes.js
│   │   ├── rabbit.validator.js
│   │   ├── rabbit.controller.js
│   │   ├── rabbit.service.js
│   │   └── rabbit.repository.js
│   ├── race/
│   │   ├── race.routes.js
│   │   ├── race.validator.js
│   │   ├── race.controller.js
│   │   ├── race.service.js
│   │   └── race.repository.js
│   ├── assignment/
│   │   ├── assignment.routes.js
│   │   ├── assignment.validator.js
│   │   ├── assignment.controller.js
│   │   ├── assignment.service.js
│   │   └── assignment.repository.js
│   └── index.js                     # Agrega todas las rutas bajo /api
│
└── app.js                           # Punto de entrada
```

## 🎯 Responsabilidad de Cada Capa (dentro de cada módulo)

### **[módulo].routes.js** - Enrutamiento
- Define los endpoints y aplica validators como middleware antes del controller
- Sin lógica de negocio

### **[módulo].validator.js** - Validación de Formato
- Middleware Express que valida tipos, rangos, regex y campos obligatorios
- Responde 400 directamente si los datos son inválidos, sin llegar al service
- Sin acceso a base de datos

### **[módulo].controller.js** - Manejador HTTP
- Extremadamente delgado: extrae datos del request → llama service → envía response
- Siempre envuelto en `catchAsync`
- Usa DTOs para transformar la respuesta antes de enviarla
- Sin lógica de negocio

### **[módulo].service.js** - Lógica de Negocio
- Toda la lógica de negocio vive aquí
- Puede llamar repositorios de otros módulos (ej: assignment.service usa cage.repository)
- Lanza `AppError` cuando una regla de negocio no se cumple
- Sin imports de `express` (no conoce HTTP)

### **[módulo].repository.js** - Acceso a Datos
- ÚNICO punto de acceso a la base de datos para ese módulo
- Solo métodos CRUD: `findBy*`, `findAll`, `create`, `update`, `delete`
- Sin lógica de negocio ni validaciones
- Exporta una instancia singleton

## 🔧 Capa Common (transversal)

### **common/middlewares/**
- `catchAsync.js`: envuelve controllers async, elimina try/catch repetitivo
- `error.middleware.js`: manejo centralizado de errores (Sequelize, AppError, desconocidos)
- `security.middleware.js`: rate limiting, Helmet, sanitización de inputs

### **common/dtos/**
- Transforman el modelo Sequelize antes de enviarlo al cliente
- Ocultan campos internos: `id`, `tenantId`, `createdAt`, `updatedAt`
- Permiten cambiar la BD sin romper la API

## 🧱 Capa Domain (compartida)

- Los modelos Sequelize se definen una sola vez y son compartidos por todos los módulos
- `index.js` centraliza todas las relaciones entre modelos
- Los repositorios importan de aquí: `require('../../domain/models')`

## 🔄 Flujo de una Request

```
Request HTTP
    ↓
Middlewares globales (Helmet, Sanitizer, Rate Limit)  ← common/middlewares/
    ↓
modules/index.js  →  [módulo].routes.js
    ↓
[módulo].validator.js  →  400 si formato inválido
    ↓
[módulo].controller.js  ←  catchAsync envuelve todo
    ↓
[módulo].service.js  →  AppError si regla de negocio falla
    ↓
[módulo].repository.js  →  domain/models/ → PostgreSQL
    ↓
Response HTTP con DTO  ←  o error capturado por error.middleware.js
```

## ➕ Cómo Agregar un Nuevo Módulo

1. Crear carpeta `src/modules/[nombre]/`
2. Crear los 5 archivos: `[nombre].routes.js`, `[nombre].validator.js`, `[nombre].controller.js`, `[nombre].service.js`, `[nombre].repository.js`
3. Crear `src/domain/models/[nombre].model.js` y registrar relaciones en `domain/models/index.js`
4. Crear `src/common/dtos/[nombre].dto.js`
5. Agregar `router.use(require('./[nombre]/[nombre].routes'))` en `modules/index.js`

## 🔒 Seguridad Implementada

- **Helmet**: cabeceras HTTP seguras (XSS, clickjacking, MIME sniffing)
- **Rate Limiting**: máximo 100 requests cada 15 minutos por IP
- **Input Sanitizer**: elimina scripts y atributos de evento de todos los inputs
- **CORS**: configurado para aceptar solo el frontend permitido
- **DTOs**: ocultan campos internos del modelo antes de la respuesta
- **AppError + error.middleware**: errores operacionales controlados; stack trace solo en desarrollo

## 🗄️ Base de Datos

```
# Local (desarrollo)
DATABASE_URL=postgresql://postgres:tu_password_local@localhost:5432/postgres

# Nube (Supabase - producción)
# DATABASE_URL=postgresql://postgres.[proyecto]:[password]@aws-1-sa-east-1.pooler.supabase.com:6543/postgres
```

**Esta arquitectura Layered + Modular garantiza:** seguridad, mantenibilidad con 30+ módulos, escalabilidad, bajo acoplamiento y patrón estándar de la industria (NestJS, Spring Boot, ASP.NET).
