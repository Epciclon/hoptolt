# 🏗️ Arquitectura Backend - Monolito Modular en Capas (Node.js + Express)

## 📌 Patrón Arquitectónico

El backend de **Hoptolt** implementa un **Monolito Modular por Dominio** combinado con **Arquitectura en Capas** sobre **Node.js + Express + Sequelize (PostgreSQL)**:

- **Monolito Modular (Modular Monolith)**: cada dominio de negocio vive encapsulado bajo `src/modules/<dominio>/` como una unidad autocontenida, en lugar de dispersar controladores, rutas y servicios en carpetas genéricas globales.
- **Arquitectura en Capas (Layered Architecture)**: dentro de cada módulo se respeta estrictamente el flujo unidireccional:
  `routes → validator → controller → service → repository → domain/models`.

Este enfoque replica en Express los principios estructurales de frameworks empresariales como **NestJS** o **Spring Boot**, manteniendo ligereza de arranque y control total sobre el ciclo de peticiones HTTP.

---

## 🤔 ¿Por qué se eligió esta arquitectura?

La elección de **Monolito Modular + Capas** responde a las necesidades reales del sistema cunícola y su operación en la nube:

1. **Aislamiento de 18 dominios con una sola base relacional**: Hoptolt coordina galpones, jaulas, razas, conejos, genealogía, asignaciones, alimentación, vacunación, desparasitación, limpieza, crecimiento, mortalidad, reproducción, miembros de granja, invitaciones, incidencias, notificaciones y autenticación. Mantenerlos en módulos separados dentro de un único desplegable evita la complejidad de red, serialización y transacciones distribuidas de los microservicios cuando todos los módulos comparten integridad referencial en PostgreSQL.
2. **Reglas de negocio desacopladas de HTTP (`service`)**: toda la lógica cunícola (capacidad de jaulas, fases de reproducción, auditoría y notificaciones) reside en `*.service.js`, sin importar `express` ni manipular `req`/`res`. Esto permite reutilizar servicios desde tareas programadas (`node-cron`) y escribir pruebas unitarias rápidas en Jest sin levantar un servidor HTTP.
3. **Verificación automática de fronteras arquitectónicas en CI**: el script `scripts/validate-architecture.js` audita en cada Pull Request que existan exactamente los 5 archivos por módulo, prohíbe saltos de capa (por ejemplo, que un `controller` importe `repository` o `models`, o que un `routes` acceda a `service`) y exige cobertura de pruebas en `backend/tests/modules/<modulo>`.
4. **Seguridad multi-tenant y multi-galpón centralizada**: autenticación JWT con Supabase, aislamiento por propietario/galpón y control granular de permisos por módulo (`RBAC`) se aplican de forma transversal desde `common/middlewares/` antes de alcanzar la lógica de dominio.
5. **Eficiencia operativa y de costos en PaaS**: un solo servicio Node.js en Render compartiendo un único pool de conexiones Sequelize hacia Supabase minimiza latencia interna, consumo de RAM y gasto de conexiones frente a múltiples servicios independientes.

---

## 📋 Estructura Real de Carpetas

```text
backend/src/
├── app.js                                 # Punto de entrada: Express, middlewares globales, /api, /api/health, Swagger y 404
│
├── errors/
│   └── AppError.js                        # Clase base de errores operacionales controlados
│
├── domain/                                # Modelos compartidos Sequelize + relaciones
│   └── models/
│       ├── index.js                       # Registro y asociaciones entre modelos
│       ├── commonFields.js                # Campos comunes compartidos
│       ├── assignment.model.js
│       ├── audit.model.js
│       ├── cage.model.js
│       ├── cleaning.model.js
│       ├── deworming.model.js
│       ├── farmMember.model.js
│       ├── feeding.model.js
│       ├── galpon.model.js
│       ├── genealogy.model.js
│       ├── growth.model.js
│       ├── incident.model.js
│       ├── invitation.model.js
│       ├── mortality.model.js
│       ├── notification.model.js
│       ├── profile.model.js
│       ├── rabbit.model.js
│       ├── race.model.js
│       ├── reproduction.model.js
│       ├── vaccination.model.js
│       ├── workerCage.model.js
│       └── workerPermission.model.js
│
├── infrastructure/                        # Conectores externos y procesos de soporte
│   ├── database/
│   │   └── connection.js                  # Instancia única de Sequelize (SSL Supabase + pool max: 15, min: 2)
│   ├── crons/
│   │   ├── feeding.cron.js                # Evaluación automática de recordatorios de alimentación (* * * * *)
│   │   └── reproduction.cron.js           # Transición automática Monta → Gestación (24h) → Lactancia (31d) (0 * * * *)
│   └── docs/                              # Configuración Swagger / OpenAPI
│
├── common/                                # Piezas transversales reutilizables
│   ├── middlewares/
│   │   ├── auth.middleware.js             # Validación de sesión/token JWT
│   │   ├── authorization.middleware.js    # Control de roles y acceso
│   │   ├── catchAsync.js                  # Envoltorio para eliminar try/catch repetitivo en controllers
│   │   ├── error.middleware.js            # Manejador global de errores (AppError, Sequelize, inesperados)
│   │   ├── galponContext.js               # Resolución del galpón activo de trabajo
│   │   ├── permission.middleware.js       # Verificación granular por módulo y acción
│   │   ├── security.middleware.js         # Helmet CSP, CORS, Input Sanitizer y Rate Limiters
│   │   └── tenant.middleware.js           # Aislamiento por propietario/tenant
│   ├── helpers/
│   │   ├── audit.helper.js
│   │   ├── names.helper.js
│   │   ├── notification.helper.js
│   │   ├── pagination.helper.js
│   │   ├── repository.helper.js
│   │   └── reproductionNotification.helper.js
│   └── dtos/                              # Transformación de entidades hacia la respuesta JSON (18 DTOs)
│       ├── assignment.dto.js, cage.dto.js, cleaning.dto.js, deworming.dto.js,
│       ├── farmMember.dto.js, feeding.dto.js, galpon.dto.js, genealogy.dto.js,
│       ├── growth.dto.js, incident.dto.js, invitation.dto.js, mortality.dto.js,
│       ├── notification.dto.js, profile.dto.js, rabbit.dto.js, race.dto.js,
│       └── reproduction.dto.js, vaccination.dto.js
│
└── modules/                               # 18 módulos autocontenidos (5 archivos cada uno)
    ├── index.js                           # Router agregador montado en /api
    ├── assignment/                        # *.routes.js, *.validator.js, *.controller.js, *.service.js, *.repository.js
    ├── auth/
    ├── cage/
    ├── cleaning/
    ├── deworming/
    ├── farmMember/
    ├── feeding/
    ├── galpon/
    ├── genealogy/
    ├── growth/
    ├── incident/
    ├── invitation/
    ├── mortality/
    ├── notification/
    ├── rabbit/
    ├── race/
    ├── reproduction/
    └── vaccination/
```

---

## 🎯 Responsabilidad de Cada Capa

Las siguientes reglas son verificadas automáticamente en CI por `scripts/validate-architecture.js`:

### 1. `[módulo].routes.js` — Enrutamiento
- Define rutas HTTP y encadena middlewares de autenticación, contexto de galpón, permisos y validación antes del controlador.
- **Restricción de arquitectura**: no puede importar `models`, `sequelize`, `repository` ni el `service` directamente; delega siempre al `controller`.

### 2. `[módulo].validator.js` — Validación de Entrada
- Valida estructura, tipos, formatos, rangos y campos obligatorios de la petición (`express-validator` / `joi`).
- Responde `400 Bad Request` antes de llegar al servicio si la entrada es inválida.
- **Restricción de arquitectura**: no puede importar `models`, `sequelize`, `repository`, `service` ni `controller`.

### 3. `[módulo].controller.js` — Adaptador HTTP
- Capa delgada envuelta en `catchAsync`: extrae parámetros, usuario y galpón de `req`, invoca al `service` y serializa la respuesta usando los DTOs de `common/dtos/`.
- **Restricción de arquitectura**: no puede importar `models`, `sequelize` ni `repository` directamente; toda operación pasa por el `service`.

### 4. `[módulo].service.js` — Lógica de Negocio
- Contiene las reglas de negocio, validaciones de dominio, coordinación entre módulos y disparo de auditorías/notificaciones.
- Lanza `AppError` con el código HTTP semántico cuando una regla no se cumple.
- Puede invocar repositorios o servicios de otros módulos cuando exista dependencia entre dominios.
- **Restricción de arquitectura**: no debe acoplarse a `express` ni manipular `res.status()` / `res.json()` / `res.send()`.

### 5. `[módulo].repository.js` — Acceso a Datos
- Único punto autorizado para consultar o persistir en PostgreSQL mediante `domain/models`.
- Expone operaciones de datos limpias (`findAll`, `findBy*`, `create`, `update`, `delete`) y exporta una instancia singleton.
- **Restricción de arquitectura**: nunca importa `express`, `routes`, `controller` ni su `service`.

---

## 🔄 Flujo de una Petición HTTP

```text
Request HTTP (Cliente / Next.js Rewrite)
   ↓
Middlewares Globales (app.js + security.middleware.js)
  ├─ trust proxy (1), Helmet CSP, inputSanitizer
  ├─ CORS restringido a FRONTEND_URL
  ├─ express.json / urlencoded (límite 10 MB)
  └─ apiLimiter (2000 req / 15 min por JWT userId o IP)
   ↓
/api → modules/index.js → [módulo].routes.js
   ├─ auth.middleware / tenant.middleware / galponContext / permission.middleware
   └─ [módulo].validator.js  →  400 si el formato es inválido
   ↓
[módulo].controller.js (envuelto en catchAsync)
   ↓
[módulo].service.js  →  lanza AppError si falla una regla de negocio
   ↓
[módulo].repository.js  →  Sequelize (domain/models)  →  PostgreSQL (Supabase)
   ↓
DTO (common/dtos) → Response JSON   |   o error capturado por error.middleware.js
```

---

## 🔒 Seguridad y Operación Implementada

- **Helmet CSP**: cabeceras de seguridad (`defaultSrc`, `scriptSrc`, `imgSrc`, etc.) con `crossOriginEmbedderPolicy: false`.
- **Rate Limiting diferenciado** (`common/middlewares/security.middleware.js`):
  - `apiLimiter`: `2000` peticiones cada `15 min` por usuario autenticado (`usr_<sub JWT>`) o por IP si es anónima, omitiendo preflights `OPTIONS`.
  - `authLimiter`: `5` intentos cada `15 min` combinando identificador + IP para evitar bloqueos cruzados en redes compartidas.
  - `registerLimiter`: `3` registros cada `30 min` combinando correo + IP.
- **Sanitización de entradas (`inputSanitizer`)**: limpia etiquetas `<script>`, `javascript:` y atributos `on*=` en `body`, `query` y `params`, protegiendo también contra *prototype pollution*.
- **Protección de endpoints y DTOs**: separación de modelo de persistencia y respuesta API; el stack trace solo se expone fuera de producción.
- **Healthcheck y Monitoreo**: `GET /api/health` responde estado del servidor, `timestamp` y `uptime` sin sobrecargar la base de datos.
- **Tareas en segundo plano (`infrastructure/crons/`)**:
  - `feeding.cron.js`: evalúa cada minuto los turnos y ventanas de recordatorios de alimentación.
  - `reproduction.cron.js`: evalúa cada hora transiciones automáticas de reproducción (`monta` → `gestacion` a las 24 h; `gestacion` → `lactancia` a los 31 días) registrando auditoría de sistema y notificaciones.

---

## ➕ Cómo Agregar un Nuevo Módulo

1. Crear la carpeta `backend/src/modules/<nombre>/` con los 5 archivos obligatorios exactos:
   - `<nombre>.routes.js`
   - `<nombre>.validator.js`
   - `<nombre>.controller.js`
   - `<nombre>.service.js`
   - `<nombre>.repository.js`
2. Definir el modelo en `backend/src/domain/models/<nombre>.model.js` y registrar sus relaciones en `backend/src/domain/models/index.js`.
3. Crear el DTO en `backend/src/common/dtos/<nombre>.dto.js`.
4. Registrar el enrutador en `backend/src/modules/index.js`.
5. Crear la suite de pruebas en `backend/tests/modules/<nombre>/` (requisito obligatorio verificado por `validate-architecture.js`).
6. Ejecutar desde la raíz `node scripts/validate-architecture.js` y desde `backend/` ejecutar `npm test`.

---

## ⚙️ Comandos y Variables de Entorno

```bash
# En backend/
npm install
npm run dev            # Inicia node src/app.js en el puerto configurado (default 5000)
npm test               # Ejecuta la suite de pruebas Jest
npm run test:coverage  # Ejecuta Jest con reporte de cobertura en backend/coverage/

# Desde la raíz del monorepo
node scripts/validate-architecture.js
```

Variables principales en `backend/.env`:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres
SUPABASE_URL=https://<tu-proyecto>.supabase.co
SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
FRONTEND_URL=http://localhost:3000
```
