const fs = require('node:fs');
const path = require('node:path');
const process = require('node:process');
const { execFileSync } = require('node:child_process');

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
  const repoFile = path.join(modDir, `${modName}.repository.js`);
  if (!fs.existsSync(repoFile)) return;
  const content = fs.readFileSync(repoFile, 'utf8');
  if (/\.controller|\.routes/.test(content)) {
    addError(
      `[Backend Module: ${modName}] Violacion de capa: repository no puede importar controller ni routes`
    );
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
        execFileSync(process.execPath, ['--check', fullPath], { stdio: 'ignore' });
      } catch {
        addError(`[Sintaxis Backend] Error de sintaxis en: ${fullPath}`);
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

  console.log('Validacion de arquitectura de carpetas, capas y cobertura modular exitosa.');
}

main();

