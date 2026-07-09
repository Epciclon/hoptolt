export interface Reproduction {
  id: number;
  femaleId: number;
  femaleCode: string;
  femaleName?: string;
  femaleRace?: string;
  femaleAge?: number;
  femaleWeight?: number;
  maleId?: number;
  maleCode?: string | null;
  maleName?: string | null;
  maleRace?: string;
  maleImageUrl?: string | null;
  isMaleDeleted?: boolean;
  isFemaleDeleted?: boolean;
  mountDate: string;
  estimatedBirthDate: string;
  bornKits?: number | null;
  cancellationReason?: string | null;
  status: 'monta' | 'gestacion' | 'lactancia' | 'completado' | 'fallido';
  createdAt?: string;
  updatedAt?: string;
  imageUrl?: string;
  galponId: number;
  cageNumber?: number;
  cageType?: string;
  profileName?: string;
  profile?: {
    username?: string;
    fullName?: string;
    email?: string;
  };
}

export interface MatingRabbit {
  id: number;
  code: string;
  name?: string;
  race: string;
  age: number;
  weight: number;
  imageUrl?: string;
  cageNumber?: number;
  cageType?: string;
}

export interface CreateReproductionDto {
  femaleId: number;
  maleId?: number;
  mountDate: string;
}

export interface StartMatingDto {
  maleId: number;
  femaleId: number;
}

export interface ReproductionFemale extends MatingRabbit {
  cageType?: string;
  cageId?: number;
}

export interface ReproductionMale extends MatingRabbit {
  cageType?: string;
  cageId?: number;
}
