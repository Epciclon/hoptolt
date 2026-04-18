# Hoptolt - Rabbit Management System

Sistema completo de gestión de conejos con backend en Node.js/Express y frontend en React.

## Características

- Gestión de jaulas, razas y conejos
- Control de alimentación, vacunación y desparasitación
- Registro de montas y control de crecimiento
- Reportes generales
- Sistema de autenticación con roles (admin, manager, employee)
- Seguridad con JWT y validaciones

## Estructura del Proyecto

```
rabbit-management-system/
├── backend/          # API REST con Express.js y MongoDB
├── frontend/         # Aplicación React
└── README.md
```

## Requisitos

- Node.js >= 12.0.0
- MongoDB Atlas

## Instalación

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

## Configuración

Crear archivo `.env` en el backend con:

```
MONGODB_URI=tu_connection_string_mongodb
PORT=5000
JWT_SECRET=tu_secret_jwt
JWT_EXPIRE=24h
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## Ejecución

### Backend
```bash
cd backend
npm run dev
```

### Frontend
```bash
cd frontend
npm start
```

## Usuario Admin Inicial

Para producción, crea un usuario admin mediante el script o directamente en MongoDB.

## Seguridad

- Los archivos `.env` no están incluidos en el repositorio
- Las contraseñas se hashean con bcrypt
- Implementación de rate limiting y validaciones

## Despliegue

Este proyecto está configurado para despliegue en Vercel.

## Licencia

MIT
