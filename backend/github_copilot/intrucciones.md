# 🏗️ Arquitectura Backend - MVC Correcto

## 📋 Estructura de Carpetas

```
backend/src/
├── controllers/          # 🎮 Lógica de negocio + HTTP
│   ├── assignRabbitController.js
│   ├── cageController.js
│   ├── rabbitController.js
│   └── raceController.js
├── models/              # 📊 Datos + Validaciones BD + Lógica de negocio simple
│   ├── assignRabbit.js
│   ├── cage.js
│   ├── rabbit.js
│   └── race.js
├── routes/              # 🛤️ Solo enrutamiento
│   ├── assignRabbitRoutes.js
│   ├── cageRoutes.js
│   ├── rabbitRoutes.js
│   └── raceRoutes.js
├── utils/               # 🔧 Apoyo reutilizable
│   ├── assignRabbitValidations.js
│   ├── cageValidations.js
│   ├── rabbitValidations.js
│   ├── raceValidations.js
│   └── swaggerAutoGenerator.js
├── middleware/           # 🛡️ Interceptores reutilizables
└── config/              # ⚙️ Configuración
    └── database.js
```

## 🎯 Principios MVC Implementados

### **Models** - Datos + Validaciones BD + Lógica Simple
- ✅ Definición de estructura de datos
- ✅ Validaciones a nivel de base de datos (Sequelize)
- ✅ Relaciones entre modelos
- ✅ Métodos de validación de negocio simple

### **Controllers** - Lógica Compleja + HTTP
- ✅ Coordinación entre models
- ✅ Lógica de negocio compleja
- ✅ Manejo de respuestas HTTP
- ✅ Validaciones con utils

### **Routes** - Solo Enrutamiento
- ✅ Definición de endpoints
- ✅ Delegación a controllers
- ✅ Organización por recurso

### **Utils** - Apoyo Reutilizable
- ✅ Validaciones de datos básicos
- ✅ Funciones genéricas reutilizables
- ✅ Sin acceso a base de datos
- ✅ Sin manejo de HTTP

### **Middleware** - Interceptores
- ✅ Autenticación
- ✅ Logging
- ✅ Manejo de errores
- ✅ Validaciones globales

## 🔄 Flujo de Trabajo

```
Request → Middleware → Routes → Controller → Models → Database
                      ↓
                   Utils ← Controller ← Response
```

## 📝 Reglas de Implementación

### **Models**
- Solo validaciones de formato y tipo de datos
- Sin manejo de respuestas HTTP
- Acceso a base de datos solo para validaciones simples

### **Controllers**
- Orquestación entre múltiples models
- Lógica de negocio compleja
- Manejo completo de respuestas HTTP
- Coordinación con utils para validaciones básicas

### **Utils**
- Solo validaciones de datos puros
- Sin imports de models
- Sin acceso a base de datos
- Funciones puras y reutilizables

### **Routes**
- Solo definición de rutas
- Delegación directa a controllers
- Sin lógica de negocio


**Esta arquitectura MVC garantiza:** mantenibilidad, escalabilidad y testing fácil.
