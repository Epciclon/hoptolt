export const CAGE_TYPES = ['engorde', 'reproducción'] as const;
export type CageType = (typeof CAGE_TYPES)[number];

export const CAGE_CAPACITY = {
  engorde: { min: 1, max: 6 },
  reproducción: { min: 1, max: 1 },
} as const;

export const RABBIT_SEXES = ['macho', 'hembra'] as const;
export type RabbitSex = (typeof RABBIT_SEXES)[number];

export const RABBIT_PURPOSES = ['Reproducción', 'Engorde'] as const;
export type RabbitPurpose = (typeof RABBIT_PURPOSES)[number];

export const RABBIT_MAX_WEIGHT = 4.5;
export const RABBIT_MAX_AGE = 18;

export const VACCINE_TYPES = ['mixomatosis', 'hemorrágica vírica (VHD)'] as const;
export type VaccineType = (typeof VACCINE_TYPES)[number];

export const MORTALITY_CAUSES = [
  'enfermedad',
  'accidente',
  'depredador',
  'edad',
  'sacrificio',
  'otra',
] as const;
export type MortalityCause = (typeof MORTALITY_CAUSES)[number];

export const USER_ROLES = ['Propietario', 'Administrador', 'Trabajador'] as const;
export type UserRole = (typeof USER_ROLES)[number];
