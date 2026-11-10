const fs = require('node:fs');
const path = require('node:path');
const process = require('node:process');
const vm = require('node:vm');

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_SRC = path.join(ROOT_DIR, 'backend', 'src');
const BACKEND_TESTS = path.join(ROOT_DIR, 'backend', 'tests');
const FRONTEND_SRC = path.join(ROOT_DIR, 'frontend', 'src');
const FRONTEND_TESTS = path.join(ROOT_DIR, 'frontend', 'tests');

const ALLOWED_BACKEND_TOP_LEVEL = new Set([
  'app.js',
  'common',
  'config',
  'domain',
  'errors',
  'infrastructure',
  'modules',
]);

const ALLOWED_FRONTEND_TOP_LEVEL = new Set([
  'app',
  'hooks',
  'lib',
  'middleware.ts',
  'modules',
  'providers',
  'shared',
  'types',
  'utils',
]);

const ALLOWED_BACKEND_MODULE_SUFFIXES = [
  '.controller.js',
  '.repository.js',
  '.routes.js',
  '.service.js',
  '.validator.js',
];

const ALLOWED_FRONTEND_MODULE_FOLDERS = new Set([
  'components',
  'constants',
  'contexts',
  'hooks',
  'services',
  'types',
  'utils',
  'validators',
]);

const errors = [];

function addError(message) {
  errors.push(message);
}

function validateTopLevelEntries(baseDir, allowedSet, label) {
  if (!fs.existsSync(baseDir)) {
    addError(`[${label}] Directorio base no encontrado: ${baseDir}`);
    return;
  }
  const entries = fs.readdirSync(baseDir);
  for (const entry of entries) {
    if (!allowedSet.has(entry)) {
      addError(`[${label}] Entrada de nivel superior no permitida en la arquitectura: "${entry}"`);
    }
  }
}

function hasTestFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return false;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory() && hasTestFiles(fullPath)) return true;
    if (entry.isFile() && /\.(test|spec)\.(js|ts|tsx)$/.test(entry.name)) return true;
  }
  return false;
}

function validateBackendModuleFiles(modName, modDir) {
  const files = fs.readdirSync(modDir);
  for (const file of files) {
    const isValidSuffix = ALLOWED_BACKEND_MODULE_SUFFIXES.some(
      (suffix) => file === `${modName}${suffix}`
    );
    if (!isValidSuffix) {
      addError(
        `[Backend Module: ${modName}] Archivo fuera del estandar de capas: "${file}"`
      );
    }
  }

  for (const suffix of ALLOWED_BACKEND_MODULE_SUFFIXES) {
    const expectedFile = `${modName}${suffix}`;
    if (!files.includes(expectedFile)) {
      addError(
        `[Backend Module: ${modName}] Falta archivo obligatorio de capa: "${expectedFile}"`
      );
    }
  }
}

function validateBackendLayerBoundaries(modName, modDir) {
  const routeFile = path.join(modDir, `${modName}.routes.js`);
  const ctrlFile = path.join(modDir, `${modName}.controller.js`);
  const svcFile = path.join(modDir, `${modName}.service.js`);
  const repoFile = path.join(modDir, `${modName}.repository.js`);
  const valFile = path.join(modDir, `${modName}.validator.js`);

  // Reglas para Routes:
  if (fs.existsSync(routeFile)) {
    const content = fs.readFileSync(routeFile, 'utf8');
    if (/models|sequelize/i.test(content)) {
      addError(`[Backend Module: ${modName}] Violacion de capa: routes no puede importar models ni sequelize directamente`);
    }
    if (/repository/i.test(content)) {
      addError(`[Backend Module: ${modName}] Violacion de capa: routes no puede importar repositories`);
    }
    if (new RegExp(`${modName}\\.service`).test(content)) {
      addError(`[Backend Module: ${modName}] Violacion de capa: routes debe delegar al controller y no importar el service directamente`);
    }
  }

  // Reglas para Controller:
  if (fs.existsSync(ctrlFile)) {
    const content = fs.readFileSync(ctrlFile, 'utf8');
    if (/models|sequelize/i.test(content)) {
      addError(`[Backend Module: ${modName}] Violacion de capa: controller no puede importar models ni sequelize directamente`);
    }
    if (/repository/i.test(content)) {
      addError(`[Backend Module: ${modName}] Violacion de capa: controller debe interactuar a traves del service y no importar repository directamente`);
    }
  }

  // Reglas para Service:
  if (fs.existsSync(svcFile)) {
    const content = fs.readFileSync(svcFile, 'utf8');
    if (/require\(['"]express['"]\)/i.test(content)) {
      addError(`[Backend Module: ${modName}] Violacion de capa: service no debe acoplarse al framework Express`);
    }
    if (/res\.(status|json|send)\(/i.test(content)) {
      addError(`[Backend Module: ${modName}] Violacion de capa: service no debe manipular objetos de respuesta HTTP (res)`);
    }
  }

  // Reglas para Repository:
  if (fs.existsSync(repoFile)) {
    const content = fs.readFileSync(repoFile, 'utf8');
    if (/\.controller|\.routes/i.test(content)) {
      addError(`[Backend Module: ${modName}] Violacion de capa: repository no puede importar controller ni routes`);
    }
    if (new RegExp(`${modName}\\.service`).test(content)) {
      addError(`[Backend Module: ${modName}] Violacion de capa: repository no puede importar service`);
    }
    if (/require\(['"]express['"]\)/i.test(content)) {
      addError(`[Backend Module: ${modName}] Violacion de capa: repository no debe importar Express`);
    }
  }

  // Reglas para Validator:
  if (fs.existsSync(valFile)) {
    const content = fs.readFileSync(valFile, 'utf8');
    if (/models|sequelize/i.test(content)) {
      addError(`[Backend Module: ${modName}] Violacion de capa: validator no puede importar models`);
    }
    if (/repository|\.service|\.controller/i.test(content)) {
      addError(`[Backend Module: ${modName}] Violacion de capa: validator no debe depender de repository, service ni controller`);
    }
  }
}

function validateFrontendLayerBoundaries(modName, modDir) {
  const serviceDir = path.join(modDir, 'services');
  if (fs.existsSync(serviceDir)) {
    const files = fs.readdirSync(serviceDir);
    for (const file of files) {
      if (file.endsWith('.tsx')) {
        addError(`[Frontend Module: ${modName}] Servicio no debe ser archivo TSX: services/${file}`);
      }
      const fullPath = path.join(serviceDir, file);
      const content = fs.readFileSync(fullPath, 'utf8');
      if (/from\s+['"][^'"]*components/i.test(content) || /from\s+['"][^'"]*shared\/ui/i.test(content)) {
        addError(`[Frontend Module: ${modName}] Violacion de capa: service no puede importar componentes de UI en services/${file}`);
      }
    }
  }

  const typesDir = path.join(modDir, 'types');
  if (fs.existsSync(typesDir)) {
    const files = fs.readdirSync(typesDir);
    for (const file of files) {
      if (file.endsWith('.tsx')) {
        addError(`[Frontend Module: ${modName}] Archivo de tipos no debe ser TSX: types/${file}`);
      }
      const fullPath = path.join(typesDir, file);
      const content = fs.readFileSync(fullPath, 'utf8');
      if (/from\s+['"][^'"]*components/i.test(content) || /from\s+['"][^'"]*shared\/ui/i.test(content)) {
        addError(`[Frontend Module: ${modName}] Violacion de capa: types no debe importar componentes de UI en types/${file}`);
      }
    }
  }

  const validatorsDir = path.join(modDir, 'validators');
  if (fs.existsSync(validatorsDir)) {
    const files = fs.readdirSync(validatorsDir);
    for (const file of files) {
      if (file.endsWith('.tsx')) {
        addError(`[Frontend Module: ${modName}] Validador no debe ser TSX: validators/${file}`);
      }
    }
  }

  const constantsDir = path.join(modDir, 'constants');
  if (fs.existsSync(constantsDir)) {
    const files = fs.readdirSync(constantsDir);
    for (const file of files) {
      if (file.endsWith('.tsx')) {
        addError(`[Frontend Module: ${modName}] Constantes no deben ser TSX: constants/${file}`);
      }
    }
  }
}

function validateBackendModules() {
  const modulesDir = path.join(BACKEND_SRC, 'modules');
  const entries = fs.readdirSync(modulesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      if (entry.name !== 'index.js') {
        addError(`[Backend Modules] Archivo suelto no permitido: "${entry.name}"`);
      }
      continue;
    }

    const modName = entry.name;
    const modDir = path.join(modulesDir, modName);
    validateBackendModuleFiles(modName, modDir);
    validateBackendLayerBoundaries(modName, modDir);

    const testModDir = path.join(BACKEND_TESTS, 'modules', modName);
    if (!hasTestFiles(testModDir)) {
      addError(
        `[Backend Tests] El modulo "${modName}" no cuenta con suite de pruebas en backend/tests/modules/${modName}`
      );
    }
  }
}

function validateFrontendModules() {
  const modulesDir = path.join(FRONTEND_SRC, 'modules');
  const entries = fs.readdirSync(modulesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      addError(`[Frontend Modules] Archivo suelto no permitido en modules/: "${entry.name}"`);
      continue;
    }

    const modName = entry.name;
    const modDir = path.join(modulesDir, modName);
    const subEntries = fs.readdirSync(modDir, { withFileTypes: true });

    for (const sub of subEntries) {
      if (!sub.isDirectory() || !ALLOWED_FRONTEND_MODULE_FOLDERS.has(sub.name)) {
        addError(
          `[Frontend Module: ${modName}] Subcarpeta o archivo no permitido en arquitectura modular: "${sub.name}"`
        );
      }
    }

    validateFrontendLayerBoundaries(modName, modDir);

    const testModDir = path.join(FRONTEND_TESTS, 'modules', modName);
    if (!hasTestFiles(testModDir)) {
      addError(
        `[Frontend Tests] El modulo "${modName}" no cuenta con suite de pruebas en frontend/tests/modules/${modName}`
      );
    }
  }
}

function scanSourceIntegrity(dirPath, isFrontend) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      scanSourceIntegrity(fullPath, isFrontend);
      continue;
    }
    if (!/\.(js|ts|tsx)$/.test(entry.name)) continue;

    const content = fs.readFileSync(fullPath, 'utf8');
    if (/^(<{7}|={7}|>{7})/m.test(content)) {
      addError(`[Integridad] Marcadores de conflicto Git detectados en: ${fullPath}`);
    }
    if (/BEGIN\s+[A-Z\s]*PRIVATE\s+KEY/.test(content)) {
      addError(`[Seguridad] Clave privada detectada en codigo fuente: ${fullPath}`);
    }
    if (isFrontend && /from\s+['"][^'"]*backend\//.test(content)) {
      addError(`[Frontera de Capas] Importacion directa hacia backend detectada en: ${fullPath}`);
    }
    if (!isFrontend && entry.name.endsWith('.js')) {
      try {
        new vm.Script(content, { filename: fullPath });
      } catch (err) {
        addError(`[Sintaxis Backend] Error de sintaxis en ${fullPath}: ${err.message}`);
      }
    }
  }
}

function main() {
  validateTopLevelEntries(BACKEND_SRC, ALLOWED_BACKEND_TOP_LEVEL, 'Backend Top-Level');
  validateTopLevelEntries(FRONTEND_SRC, ALLOWED_FRONTEND_TOP_LEVEL, 'Frontend Top-Level');
  validateBackendModules();
  validateFrontendModules();
  scanSourceIntegrity(BACKEND_SRC, false);
  scanSourceIntegrity(FRONTEND_SRC, true);

  if (errors.length > 0) {
    console.error('Errores de validacion de arquitectura encontrados:');
    for (const err of errors) {
      console.error(` - ${err}`);
    }
    process.exit(1);
  }

  console.log('Validacion de arquitectura de carpetas, capas, fronteras y seguridad modular exitosa.');
}

main();
