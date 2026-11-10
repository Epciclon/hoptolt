const { execFileSync } = require('child_process');
const path = require('path');

describe('Verificación de Arquitectura e Integridad de Capas', () => {
  test('debe cumplir con todas las reglas de capas, fronteras y seguridad del sistema', () => {
    const scriptPath = path.resolve(__dirname, '../../scripts/validate-architecture.js');
    const result = execFileSync(process.execPath, [scriptPath], { encoding: 'utf8' });
    expect(result).toContain('Validacion de arquitectura');
  });
});
