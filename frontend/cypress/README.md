# 🧪 Pruebas de Caja Negra con Cypress

## Sistema de Gestión de Conejos - Frontend Testing

Este directorio contiene pruebas de caja negra comprehensivas para el sistema de gestión de conejos usando Cypress.

## 📋 Estructura de Pruebas

```
cypress/
├── e2e/                          # Pruebas End-to-End
│   ├── 01-auth.cy.js            # Autenticación y sesiones
│   ├── 02-navigation.cy.js      # Navegación y menús
│   ├── 03-rabbit-management.cy.js # Gestión de conejos
│   ├── 04-cage-management.cy.js  # Gestión de jaulas
│   ├── 05-reports.cy.js         # Generación de reportes
│   └── 06-critical-flows.cy.js  # Flujos críticos E2E
├── fixtures/                    # Datos de prueba
│   ├── auth.json               # Datos de autenticación
│   ├── races.json              # Datos de razas
│   └── health.json             # Respuesta de health check
├── support/                     # Configuración y comandos
│   ├── commands.js             # Comandos personalizados
│   └── e2e.js                  # Configuración global
└── cypress.config.js           # Configuración principal
```

## 🏷️ Tags de Pruebas

Las pruebas están organizadas con tags para facilitar la ejecución selectiva:

- `@smoke` - Pruebas críticas que deben pasar siempre
- `@auth` - Pruebas de autenticación y autorización
- `@navigation` - Pruebas de navegación y menús
- `@error` - Pruebas de manejo de errores
- `@validation` - Pruebas de validación de formularios
- `@ui` - Pruebas de interfaz de usuario
- `@responsive` - Pruebas de diseño responsivo
- `@critical` - Pruebas de flujos críticos
- `@performance` - Pruebas de rendimiento
- `@security` - Pruebas de seguridad

## 🚀 Comandos de Ejecución

### Desarrollo Interactivo
```bash
# Abrir Cypress en modo interactivo
npm run cy:open
```

### Ejecución Automática
```bash
# Ejecutar todas las pruebas
npm run cy:run

# Ejecutar solo pruebas de smoke
npm run cy:run:smoke

# Ejecutar pruebas de autenticación
npm run cy:run:auth

# Ejecutar pruebas críticas
npm run cy:run:critical

# Ejecutar en diferentes navegadores
npm run cy:run:chrome
npm run cy:run:firefox
npm run cy:run:edge
```

### Pruebas End-to-End Completas
```bash
# Iniciar servidor y ejecutar pruebas
npm run test:e2e

# Solo pruebas smoke con servidor
npm run test:e2e:smoke

# Ejecutar en Chrome con servidor
npm run test:e2e:chrome
```

## 🔧 Configuración del Entorno

### Variables de Entorno

El archivo `cypress.config.js` contiene la configuración predeterminada:

```javascript
env: {
  apiUrl: 'http://localhost:5000',
  testUser: {
    username: 'admin',
    password: 'admin123'
  }
}
```

### Prerrequisitos

1. **Backend corriendo** en `http://localhost:5000`
2. **Frontend corriendo** en `http://localhost:3000`
3. **Base de datos** configurada con datos de prueba

## 🧪 Tipos de Pruebas

### 1. Pruebas de Autenticación (`01-auth.cy.js`)
- ✅ Login exitoso con credenciales válidas
- ❌ Login fallido con credenciales inválidas
- ✅ Logout correcto
- ✅ Persistencia de sesión
- ❌ Manejo de tokens expirados
- 🔒 Validaciones de seguridad

### 2. Pruebas de Navegación (`02-navigation.cy.js`)
- ✅ Navegación por menús principales
- ✅ Navegación por submenús
- ✅ Botones de retroceso
- ✅ URLs directas
- 📱 Responsividad en diferentes dispositivos
- ♿ Accesibilidad con teclado

### 3. Gestión de Conejos (`03-rabbit-management.cy.js`)
- ✅ Registro de conejos con datos válidos
- ❌ Validaciones de formulario
- ✅ Carga de razas disponibles
- ❌ Manejo de errores del servidor
- 🎨 Elementos de interfaz
- 📱 Diseño responsivo

### 4. Gestión de Jaulas (`04-cage-management.cy.js`)
- ✅ CRUD completo de jaulas
- ✅ Búsqueda y edición
- ✅ Confirmación de eliminación
- ❌ Validaciones de negocio
- 🔍 Funciones de búsqueda

### 5. Generación de Reportes (`05-reports.cy.js`)
- ✅ Formulario de configuración de reportes
- ✅ Vista previa de datos
- ✅ Descarga de PDF
- ❌ Validaciones de fechas
- 📊 Visualización de datos

### 6. Flujos Críticos (`06-critical-flows.cy.js`)
- 🔄 Flujos completos de usuario
- 🚨 Manejo de errores críticos
- 🔒 Validaciones de seguridad
- ⚡ Pruebas de rendimiento
- 🔄 Recuperación de errores

## 📊 Comandos Personalizados

### Autenticación
```javascript
cy.login()                    // Login con credenciales por defecto
cy.login(username, password)  // Login con credenciales específicas
cy.logout()                   // Logout completo
```

### Navegación
```javascript
cy.navigateToSection('gestionar-conejos')  // Navegar a sección específica
cy.verifyDashboard()                       // Verificar elementos del dashboard
```

### Formularios
```javascript
cy.fillRabbitForm(data)    // Llenar formulario de conejo
cy.fillCageForm(data)      // Llenar formulario de jaula
cy.fillRaceForm(data)      // Llenar formulario de raza
```

### Verificaciones
```javascript
cy.verifySuccessMessage()    // Verificar mensaje de éxito
cy.verifyErrorMessage()      // Verificar mensaje de error
cy.closeModal()              // Cerrar modal activo
```

### Datos de Prueba
```javascript
cy.generateTestData('rabbit')  // Generar datos de conejo
cy.generateTestData('cage')    // Generar datos de jaula
cy.generateTestData('race')    // Generar datos de raza
```

## 🎯 Estrategia de Testing

### Principios de Caja Negra
1. **No conocimiento interno**: Las pruebas no dependen de la implementación
2. **Entrada/Salida**: Foco en datos de entrada y resultados esperados
3. **Comportamiento del usuario**: Simular interacciones reales
4. **Casos límite**: Probar valores extremos y condiciones especiales

### Cobertura de Pruebas
- ✅ **Casos felices**: Flujos principales exitosos
- ❌ **Casos de error**: Validaciones y manejo de errores
- 🎭 **Casos límite**: Valores extremos y condiciones especiales
- 🔀 **Casos alternativos**: Diferentes caminos para lograr objetivos

### Datos de Prueba
- **Fixtures**: Datos predefinidos para respuestas mock
- **Generación dinámica**: Datos únicos para evitar conflictos
- **Limpieza**: Cada prueba es independiente y limpia su estado

## 📈 Reportes y Resultados

### Ejecución Local
Los resultados se muestran en la consola y se generan videos/screenshots automáticamente en caso de fallos.

### Integración Continua
```bash
# Para CI/CD pipelines
npm run cy:run:headless --record --key <cypress-key>
```

### Métricas de Calidad
- **Tasa de éxito**: % de pruebas que pasan
- **Tiempo de ejecución**: Duración total de la suite
- **Cobertura funcional**: % de funcionalidades probadas
- **Detección de regresiones**: Pruebas que fallan en nuevas versiones

## 🔍 Debugging y Troubleshooting

### Modo Interactivo
```bash
npm run cy:open
```
Permite ver la ejecución paso a paso, inspeccionar elementos y debuggear.

### Videos y Screenshots
- Los videos se guardan automáticamente en `cypress/videos/`
- Las capturas de pantalla de fallos en `cypress/screenshots/`

### Logs Detallados
```bash
DEBUG=cypress:* npm run cy:run
```

### Problemas Comunes
1. **Timeouts**: Aumentar tiempos de espera para elementos lentos
2. **Elementos no encontrados**: Verificar selectores y timing
3. **Datos de prueba**: Asegurar que el backend tiene datos consistentes
4. **Interceptores**: Verificar que los mocks coinciden con las APIs reales

## 🤝 Contribución

### Agregar Nuevas Pruebas
1. Crear archivo en `cypress/e2e/` con nombre descriptivo
2. Usar tags apropiados para categorización
3. Seguir patrones de comandos personalizados
4. Documentar casos de prueba especiales

### Best Practices
- Usar `data-testid` para selectores estables
- Mantener pruebas independientes y limpias
- Usar comandos personalizados para reutilización
- Manejar datos de prueba de forma predecible
- Incluir casos positivos y negativos

## 📚 Recursos Adicionales

- [Documentación oficial de Cypress](https://docs.cypress.io/)
- [Best Practices de Cypress](https://docs.cypress.io/guides/references/best-practices)
- [Patrones de Testing](https://docs.cypress.io/guides/references/trade-offs)
