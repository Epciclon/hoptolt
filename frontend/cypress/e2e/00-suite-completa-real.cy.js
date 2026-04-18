/**
 * SUITE COMPLETA DE PRUEBAS SIMPLIFICADAS
 * Para trabajar con la aplicación real
 */

describe('🐰 Sistema de Gestión de Conejos - Suite Completa Real', () => {
  
  describe('🔐 Módulo de Autenticación', () => {
    require('./00-authentication-real.cy.js');
  });

  describe('🐰 Módulo de Gestión de Conejos', () => {
    require('./02-rabbit-management-real.cy.js');
  });

  describe('🏠 Módulo de Gestión de Jaulas', () => {
    require('./03-cage-management-real.cy.js');
  });

  describe('🔗 Módulo de Asignación de Conejos', () => {
    require('./04-rabbit-assignment-real.cy.js');
  });
});
