import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

describe('Verificación de Arquitectura Frontend e Integridad Modular', () => {
  it('debe validar que los módulos y capas del frontend respeten las fronteras arquitectónicas', () => {
    const scriptPath = path.resolve(__dirname, '../../scripts/validate-architecture.js');
    const result = execFileSync(process.execPath, [scriptPath], { encoding: 'utf8' });
    expect(result).toContain('Validacion de arquitectura');
  });
});
