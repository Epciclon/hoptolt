// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';
import 'cypress-real-events';
import '@cypress/grep';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Manejo global de errores no capturados
Cypress.on('uncaught:exception', (err, runnable) => {
  // Ignorar ciertos errores que no afectan las pruebas
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  if (err.message.includes('Network Error')) {
    return false;
  }
  if (err.message.includes('loading chunk')) {
    return false;
  }
  
  // Si no es un error que queremos ignorar, lo propagamos
  return true;
});

// Configuración global antes de cada prueba
beforeEach(() => {
  // Limpiar localStorage y sessionStorage
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Configurar interceptores comunes
  cy.intercept('GET', '/api/health', { fixture: 'health.json' }).as('healthCheck');
  
  // Configurar viewport por defecto
  cy.viewport(1280, 720);
});

// Configuración global después de cada prueba
afterEach(() => {
  // Limpiar datos después de cada prueba
  cy.clearLocalStorage();
  cy.clearCookies();
});
