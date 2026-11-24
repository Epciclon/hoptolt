import type { Assignment } from '../types/assignment.types';

export interface CompatibilityRabbit {
  id?: number;
  name?: string;
  code?: string;
  sex?: string;
  purpose?: string;
  age?: number;
  birthDate?: string;
}

export interface CompatibilityCage {
  id: number;
  number?: number;
  type: string;
  capacity: number;
  assignedCount?: number;
}

export interface CompatibilityResult {
  compatible: boolean;
  reasons: string[];
}

export interface CompatibilityOptions {
  isMove?: boolean;
}

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44;

export function getRabbitAgeInMonths(rabbit: CompatibilityRabbit): number | null {
  if (rabbit.birthDate) {
    const birthTime = new Date(rabbit.birthDate).getTime();
    if (!Number.isNaN(birthTime)) {
      return Math.max(0, (Date.now() - birthTime) / MS_PER_MONTH);
    }
  }
  return typeof rabbit.age === 'number' ? rabbit.age : null;
}

export function assignmentToCompatibilityRabbit(assignment: Assignment): CompatibilityRabbit {
  return {
    id: assignment.rabbitId,
    name: assignment.rabbitName,
    code: assignment.rabbitCode,
    sex: assignment.rabbitSex,
    purpose: assignment.rabbitPurpose,
    age: assignment.rabbitAge,
    birthDate: assignment.rabbitBirthDate,
  };
}

export function validateCageCompatibility(
  cage: CompatibilityCage,
  incomingRabbits: CompatibilityRabbit[],
  existingRabbits: CompatibilityRabbit[] = [],
  options?: CompatibilityOptions,
): CompatibilityResult {
  const reasons: string[] = [];
  const normalizedCageType = cage.type.toLowerCase();

  if (options?.isMove && normalizedCageType === 'reproducción' && incomingRabbits.length > 1) {
    reasons.push('No puedes mover múltiples conejos a una jaula de reproducción a la vez.');
  } else {
    const occupied = cage.assignedCount ?? existingRabbits.length;
    const available = Math.max(0, cage.capacity - occupied);
    if (incomingRabbits.length > available) {
      reasons.push(
        available === 0
          ? 'La jaula está llena.'
          : `Sin espacio suficiente en la jaula (disponible: ${available}).`,
      );
    }
  }

  const allRabbits = [...existingRabbits, ...incomingRabbits];

  if (normalizedCageType === 'reproducción') {
    const hasEngorde = allRabbits.some((r) => r.purpose === 'Engorde');
    if (hasEngorde) {
      reasons.push('No se pueden asignar conejos de Engorde en jaulas de Reproducción.');
    }
  }

  if (normalizedCageType === 'engorde') {
    const hasReproduccion = allRabbits.some((r) => r.purpose === 'Reproducción');
    const hasEngorde = allRabbits.some((r) => r.purpose === 'Engorde');
    if (hasReproduccion && hasEngorde) {
      reasons.push(
        'No se pueden mezclar conejos de Engorde y Reproducción (pie de cría) en la misma jaula.',
      );
    }

    const sexes = new Set(
      allRabbits
        .map((r) => r.sex?.trim().toLowerCase())
        .filter((sex): sex is string => Boolean(sex)),
    );
    if (sexes.has('macho') && sexes.has('hembra')) {
      reasons.push('No se pueden mezclar machos y hembras en jaulas de engorde.');
    }

    const ages = allRabbits
      .map(getRabbitAgeInMonths)
      .filter((age): age is number => age !== null);

    if (ages.some((age) => age > 3.1)) {
      reasons.push('No se permiten conejos mayores de 3 meses en jaulas de engorde grupales.');
    }

    if (ages.length >= 2) {
      const floored = ages.map((age) => Math.floor(age));
      const diff = Math.max(...floored) - Math.min(...floored);
      if (diff > 1) {
        reasons.push('Los conejos de engorde deben tener máximo 1 mes de diferencia de edad.');
      }
    }
  }

  return {
    compatible: reasons.length === 0,
    reasons,
  };
}
