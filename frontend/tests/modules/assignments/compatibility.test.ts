import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  validateCageCompatibility,
  getRabbitAgeInMonths,
  type CompatibilityCage,
  type CompatibilityRabbit,
} from '@/modules/assignments/utils/compatibility';

const engordeCage: CompatibilityCage = {
  id: 1,
  number: 8,
  type: 'engorde',
  capacity: 10,
  assignedCount: 1,
};

const reproCage: CompatibilityCage = {
  id: 2,
  number: 3,
  type: 'reproducción',
  capacity: 1,
  assignedCount: 0,
};

describe('validateCageCompatibility', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('permite asignar conejos compatibles en jaula de engorde con ocupantes compatibles', () => {
    const existing: CompatibilityRabbit[] = [
      { id: 1, code: 'R1', sex: 'hembra', purpose: 'Engorde', age: 2 },
    ];
    const incoming: CompatibilityRabbit[] = [
      { id: 2, code: 'R2', sex: 'hembra', purpose: 'Engorde', age: 2 },
    ];

    const result = validateCageCompatibility(engordeCage, incoming, existing);
    expect(result.compatible).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('rechaza conejos de Engorde en jaula de Reproducción', () => {
    const incoming: CompatibilityRabbit[] = [
      { id: 3, code: 'R3', sex: 'hembra', purpose: 'Engorde', age: 2 },
    ];

    const result = validateCageCompatibility(reproCage, incoming, []);
    expect(result.compatible).toBe(false);
    expect(result.reasons).toContain('No se pueden asignar conejos de Engorde en jaulas de Reproducción.');
  });

  it('rechaza mezclar propósitos Engorde y Reproducción en jaula de engorde', () => {
    const existing: CompatibilityRabbit[] = [
      { id: 1, code: 'R1', sex: 'macho', purpose: 'Engorde', age: 2 },
    ];
    const incoming: CompatibilityRabbit[] = [
      { id: 4, code: 'R4', sex: 'macho', purpose: 'Reproducción', age: 2 },
    ];

    const result = validateCageCompatibility(engordeCage, incoming, existing);
    expect(result.compatible).toBe(false);
    expect(result.reasons.some((r) => r.includes('Engorde y Reproducción'))).toBe(true);
  });

  it('rechaza mezclar machos y hembras en jaula de engorde', () => {
    const existing: CompatibilityRabbit[] = [
      { id: 1, code: 'R1', sex: 'hembra', purpose: 'Engorde', age: 2 },
    ];
    const incoming: CompatibilityRabbit[] = [
      { id: 5, code: 'R5', sex: 'macho', purpose: 'Engorde', age: 2 },
    ];

    const result = validateCageCompatibility(engordeCage, incoming, existing);
    expect(result.compatible).toBe(false);
    expect(result.reasons).toContain('No se pueden mezclar machos y hembras en jaulas de engorde.');
  });

  it('rechaza conejos mayores a 3 meses en jaula de engorde usando birthDate o age', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-24T12:00:00Z'));

    const over3ByBirthDate: CompatibilityRabbit = {
      id: 6,
      code: 'R6',
      sex: 'macho',
      purpose: 'Engorde',
      birthDate: '2026-08-01T00:00:00Z',
    };
    expect(getRabbitAgeInMonths(over3ByBirthDate)).toBeGreaterThan(3.1);

    const result = validateCageCompatibility(
      { ...engordeCage, assignedCount: 0 },
      [over3ByBirthDate],
      [],
    );
    expect(result.compatible).toBe(false);
    expect(result.reasons).toContain(
      'No se permiten conejos mayores de 3 meses en jaulas de engorde grupales.',
    );
  });

  it('rechaza diferencia de edad mayor a 1 mes en jaula de engorde', () => {
    const existing: CompatibilityRabbit[] = [
      { id: 1, code: 'R1', sex: 'hembra', purpose: 'Engorde', age: 0 },
    ];
    const incoming: CompatibilityRabbit[] = [
      { id: 7, code: 'R7', sex: 'hembra', purpose: 'Engorde', age: 2 },
    ];

    const result = validateCageCompatibility(engordeCage, incoming, existing);
    expect(result.compatible).toBe(false);
    expect(result.reasons).toContain(
      'Los conejos de engorde deben tener máximo 1 mes de diferencia de edad.',
    );
  });

  it('rechaza jaula sin espacio disponible o mover varios a reproducción', () => {
    const fullCage: CompatibilityCage = {
      id: 9,
      number: 9,
      type: 'engorde',
      capacity: 2,
      assignedCount: 2,
    };
    const fullResult = validateCageCompatibility(fullCage, [{ id: 10, sex: 'macho', purpose: 'Engorde', age: 1 }], []);
    expect(fullResult.compatible).toBe(false);
    expect(fullResult.reasons).toContain('La jaula está llena.');

    const multiMoveRepro = validateCageCompatibility(
      reproCage,
      [
        { id: 11, sex: 'hembra', purpose: 'Reproducción', age: 4 },
        { id: 12, sex: 'hembra', purpose: 'Reproducción', age: 4 },
      ],
      [],
      { isMove: true },
    );
    expect(multiMoveRepro.compatible).toBe(false);
    expect(multiMoveRepro.reasons).toContain(
      'No puedes mover múltiples conejos a una jaula de reproducción a la vez.',
    );
  });
});
