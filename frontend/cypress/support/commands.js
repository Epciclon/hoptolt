// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// -- Comandos de autenticación --

/**
 * Comando personalizado para login de usuario
 */
Cypress.Commands.add('login', (username = null, password = null, useMocks = true) => {
  const user = username || Cypress.env('testUser').username;
  const pass = password || Cypress.env('testUser').password;

  cy.session([user, pass], () => {
    // Configurar mocks si está habilitado
    if (useMocks) {
      cy.fixture('auth').then((authData) => {
        // Interceptar TODAS las llamadas de verify-token, no solo las específicas
        cy.intercept('GET', '**/api/auth/verify-token*', {
          statusCode: 200,
          body: authData.verifyTokenResponse
        }).as('verifyTokenGlobal');

        cy.intercept('POST', '/api/auth/login', {
          statusCode: 200,
          body: authData.loginResponse
        }).as('loginSuccess');
      });
    }

    cy.visit('/');
    
    // Esperar a que aparezca el formulario de login
    cy.get('[data-testid="login-form"]', { timeout: 10000 })
      .should('be.visible');
    
    // Llenar el formulario usando los test IDs
    cy.get('[data-testid="username-input"]').type(user);
    cy.get('[data-testid="password-input"]').type(pass);
    
    // Hacer clic en el botón de login
    cy.get('[data-testid="login-submit"]').click();
    
    // Esperar a que termine el loading si existe
    cy.get('[data-testid="loading-spinner"]', { timeout: 3000 }).should('not.exist');
    
    // Verificar que el login fue exitoso esperando elementos del dashboard
    cy.get('[data-testid="sidebar-menu"], .sidebar-menu', { timeout: 15000 })
      .should('be.visible');
      
    cy.get('.user-info', { timeout: 10000 })
      .should('be.visible');
  }, {
    validate() {
      // Configurar mocks para la validación de sesión también
      if (useMocks) {
        cy.fixture('auth').then((authData) => {
          cy.intercept('GET', '**/api/auth/verify-token*', {
            statusCode: 200,
            body: authData.verifyTokenResponse
          }).as('verifyTokenValidation');
        });
      }
      
      // Verificar que la sesión es válida visitando la página principal
      cy.visit('/');
      
      // Esperar que el loading inicial termine
      cy.get('[data-testid="loading-container"]', { timeout: 5000 }).should('not.exist');
      
      // Esperar que no aparezca el login (lo que indicaría sesión inválida)
      cy.get('[data-testid="login-form"]', { timeout: 3000 }).should('not.exist');
      
      // Verificar que aparece el sidebar y user-info
      cy.get('[data-testid="sidebar-menu"], .sidebar-menu', { timeout: 10000 }).should('be.visible');
      cy.get('.user-info', { timeout: 10000 }).should('be.visible');
    }
  });
});

/**
 * Comando para logout
 */
Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="logout-button"], .logout-btn').click();
  cy.get('[data-testid="logout-confirm"], .logout-confirm-btn').click();
  cy.url().should('include', '/');
  cy.get('[data-testid="login-form"]').should('be.visible');
});

// -- Comandos de navegación --

/**
 * Navegar a una sección específica usando el sidebar
 */
Cypress.Commands.add('navigateToSection', (section) => {
  const sections = {
    'gestionar-crianza': () => {
      cy.get('[data-testid="nav-breeding"], button').contains('Gestionar Crianza').click();
    },
    'generar-reportes': () => {
      cy.get('[data-testid="nav-reports"], button').contains('Generar Reportes').click();
    },
    'gestionar-jaulas': () => {
      cy.navigateToSection('gestionar-crianza');
      cy.get('button').contains('Gestionar Jaulas').click();
    },
    'gestionar-razas': () => {
      cy.navigateToSection('gestionar-crianza');
      cy.get('button').contains('Gestionar Razas').click();
    },
    'gestionar-conejos': () => {
      cy.navigateToSection('gestionar-crianza');
      cy.get('button').contains('Gestionar Conejos').click();
    },
    'reproduccion': () => {
      cy.navigateToSection('gestionar-crianza');
      cy.get('button').contains('Gestionar Reproducción y Parto').click();
    },
    'alimentacion': () => {
      cy.navigateToSection('gestionar-crianza');
      cy.get('button').contains('Control de Alimentación').click();
    },
    'vacunacion': () => {
      cy.navigateToSection('gestionar-crianza');
      cy.get('button').contains('Control de Vacunación').click();
    },
    'desparasitacion': () => {
      cy.navigateToSection('gestionar-crianza');
      cy.get('button').contains('Control de Desparasitación').click();
    },
    'crecimiento': () => {
      cy.navigateToSection('gestionar-crianza');
      cy.get('button').contains('Control de Crecimiento').click();
    },
    'reporte-alimentacion': () => {
      cy.navigateToSection('generar-reportes');
      cy.get('a').contains('Reporte de Alimentación').click();
    },
    'reporte-vacunas': () => {
      cy.navigateToSection('generar-reportes');
      cy.get('a').contains('Reporte de Vacunas').click();
    },
    'reporte-desparasitacion': () => {
      cy.navigateToSection('generar-reportes');
      cy.get('a').contains('Reporte de Desparasitación').click();
    }
  };

  if (sections[section]) {
    sections[section]();
  } else {
    throw new Error(`Sección "${section}" no encontrada`);
  }
});

// -- Comandos de formularios --

/**
 * Llenar formulario de registro de conejo
 */
Cypress.Commands.add('fillRabbitForm', (rabbitData) => {
  const defaultData = {
    race: 'rex',
    code: 'R001',
    sex: 'macho',
    age: '6',
    weight: '2.5',
    purpose: 'Reproducción'
  };

  const data = { ...defaultData, ...rabbitData };

  if (data.race) {
    cy.get('select').first().select(data.race);
  }
  if (data.code) {
    cy.get('input[type="text"]').clear().type(data.code);
  }
  if (data.sex) {
    cy.get('select').eq(1).select(data.sex);
  }
  if (data.age) {
    cy.get('input[type="number"]').first().clear().type(data.age);
  }
  if (data.weight) {
    cy.get('input[type="number"]').eq(1).clear().type(data.weight);
  }
  if (data.purpose) {
    cy.get('select').last().select(data.purpose);
  }
});

/**
 * Llenar formulario de registro de jaula
 */
Cypress.Commands.add('fillCageForm', (cageData) => {
  const defaultData = {
    number: '001',
    capacity: '4',
    location: 'Galpón A',
    material: 'Malla',
    status: 'Disponible'
  };

  const data = { ...defaultData, ...cageData };

  cy.get('input[placeholder*="número"]').clear().type(data.number);
  cy.get('input[type="number"]').clear().type(data.capacity);
  cy.get('input[placeholder*="ubicación"]').clear().type(data.location);
  cy.get('input[placeholder*="material"]').clear().type(data.material);
  if (data.status) {
    cy.get('select').select(data.status);
  }
});

/**
 * Llenar formulario de registro de raza
 */
Cypress.Commands.add('fillRaceForm', (raceData) => {
  const defaultData = {
    name: 'Nueva Raza',
    description: 'Descripción de la nueva raza',
    averageWeight: '3.0',
    averageSize: 'Mediano'
  };

  const data = { ...defaultData, ...raceData };

  cy.get('input[placeholder*="nombre"]').clear().type(data.name);
  cy.get('textarea, input[placeholder*="descripción"]').clear().type(data.description);
  cy.get('input[type="number"]').clear().type(data.averageWeight);
  if (data.averageSize) {
    cy.get('select').select(data.averageSize);
  }
});

// -- Comandos de verificación --

/**
 * Verificar que aparezca un mensaje de éxito
 */
Cypress.Commands.add('verifySuccessMessage', (message = null) => {
  if (message) {
    cy.get('.success-message, .modal-success').should('contain', message);
  } else {
    cy.get('.success-message, .modal-success').should('be.visible');
  }
});

/**
 * Verificar que aparezca un mensaje de error
 */
Cypress.Commands.add('verifyErrorMessage', (message = null) => {
  if (message) {
    cy.get('.error-message, .error-msg').should('contain', message);
  } else {
    cy.get('.error-message, .error-msg').should('be.visible');
  }
});

/**
 * Verificar elementos del dashboard
 */
Cypress.Commands.add('verifyDashboard', () => {
  cy.get('.sidebar-menu').should('be.visible');
  cy.get('.user-info').should('be.visible');
  cy.get('.main-tab').should('have.length.at.least', 2);
});

// -- Comandos de API --

/**
 * Interceptar llamadas de API comunes
 */
Cypress.Commands.add('interceptAPI', () => {
  // Interceptar endpoints de autenticación con mocks para evitar rate limiting
  cy.fixture('auth').then((authData) => {
    cy.intercept('POST', '**/api/auth/login*', {
      statusCode: 200,
      body: authData.loginResponse
    }).as('login');
    
    cy.intercept('GET', '**/api/auth/verify-token*', {
      statusCode: 200,
      body: authData.verifyTokenResponse
    }).as('verifyToken');
  });

  cy.intercept('POST', '**/api/auth/logout*', {
    statusCode: 200,
    body: { success: true, message: 'Logout exitoso' }
  }).as('logout');

  // Interceptar endpoints de entidades
  cy.intercept('GET', '/api/rabbits/races').as('getRaces');
  cy.intercept('POST', '/api/rabbits').as('createRabbit');
  cy.intercept('GET', '/api/rabbits').as('getRabbits');
  cy.intercept('PUT', '/api/rabbits/*').as('updateRabbit');
  cy.intercept('DELETE', '/api/rabbits/*').as('deleteRabbit');

  cy.intercept('POST', '/api/cages').as('createCage');
  cy.intercept('GET', '/api/cages').as('getCages');
  cy.intercept('PUT', '/api/cages/*').as('updateCage');
  cy.intercept('DELETE', '/api/cages/*').as('deleteCage');

  cy.intercept('POST', '/api/races').as('createRace');
  cy.intercept('GET', '/api/races').as('getRaces');
  cy.intercept('PUT', '/api/races/*').as('updateRace');
  cy.intercept('DELETE', '/api/races/*').as('deleteRace');

  // Interceptar endpoints de reportes
  cy.intercept('POST', '/api/reports/feeding-report').as('generateFeedingReport');
  cy.intercept('POST', '/api/reports/feeding-report/pdf').as('downloadFeedingPDF');
});

// -- Comandos de utilidad --

/**
 * Esperar a que termine la carga
 */
Cypress.Commands.add('waitForLoad', () => {
  // Esperar que desaparezcan varios tipos de spinners/loading
  cy.get('[data-testid="loading-spinner"]', { timeout: 2000 }).should('not.exist');
  cy.get('.loading-spinner', { timeout: 1000 }).should('not.exist');
  cy.get('.spinner', { timeout: 1000 }).should('not.exist');
  cy.get('.loading-container', { timeout: 1000 }).should('not.exist');
});

/**
 * Cerrar modales si están abiertos
 */
Cypress.Commands.add('closeModal', () => {
  cy.get('body').then(($body) => {
    if ($body.find('.modal-success-btn').length > 0) {
      cy.get('.modal-success-btn').click();
    }
    if ($body.find('.modal .close-btn').length > 0) {
      cy.get('.modal .close-btn').click();
    }
  });
});

/**
 * Generar datos aleatorios para pruebas
 */
Cypress.Commands.add('generateTestData', (type) => {
  const timestamp = Date.now();
  
  const data = {
    rabbit: {
      race: 'rex',
      code: `T${timestamp.toString().slice(-3)}`,
      sex: Math.random() > 0.5 ? 'macho' : 'hembra',
      age: Math.floor(Math.random() * 12) + 1,
      weight: (Math.random() * 3 + 1).toFixed(2),
      purpose: Math.random() > 0.5 ? 'Reproducción' : 'Engorde'
    },
    cage: {
      number: `${timestamp.toString().slice(-3)}`,
      capacity: Math.floor(Math.random() * 6) + 1,
      location: `Galpón ${String.fromCharCode(65 + Math.floor(Math.random() * 3))}`,
      material: Math.random() > 0.5 ? 'Malla' : 'Madera',
      status: 'Disponible'
    },
    race: {
      name: `Raza_Test_${timestamp.toString().slice(-6)}`,
      description: `Raza de prueba creada automáticamente`,
      averageWeight: (Math.random() * 2 + 2).toFixed(1),
      averageSize: Math.random() > 0.5 ? 'Mediano' : 'Grande'
    }
  };

  return data[type] || data;
});

// Agregar data-testid a elementos para facilitar las pruebas
Cypress.Commands.overwrite('visit', (originalFn, url, options) => {
  return originalFn(url, options).then(() => {
    cy.document().then((doc) => {
      // Agregar data-testid automáticamente a elementos comunes
      const elements = [
        { selector: '.login-form', testid: 'login-form' },
        { selector: '.sidebar-menu', testid: 'sidebar-menu' },
        { selector: '.rabbit-form', testid: 'rabbit-form' },
        { selector: '.cage-form', testid: 'cage-form' },
        { selector: '.race-form', testid: 'race-form' }
      ];

      elements.forEach(({ selector, testid }) => {
        const element = doc.querySelector(selector);
        if (element && !element.getAttribute('data-testid')) {
          element.setAttribute('data-testid', testid);
        }
      });
    });
  });
});
