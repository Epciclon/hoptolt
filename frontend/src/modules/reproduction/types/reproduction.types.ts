export interface Reproduction {
  id: number;
  femaleId: number;
  femaleCode: string;
  femaleName?: string;
  maleId?: number;
  maleCode?: string;
  maleName?: string;
  mountDate: string;
  estimatedBirthDate: string;
  galponId: number;
  cageNumber?: number;
  cageType?: string;
}

export interface CreateReproductionDto {
  femaleId: number;
  maleId?: number;
  mountDate: string;
}

export interface UpdateReproductionDto {
  maleId?: number;
  mountDate?: string;
}

export interface ReproductionFemale {
  id: number;
  code: string;
  name?: string;
  age: number;
  weight: number;
  cageNumber: number;
  cageType: string;
  cageId: number;
}

export interface ReproductionMale {
  id: number;
  code: string;
  name?: string;
  age: number;
  weight: number;
  cageNumber: number;
  cageType: string;
  cageId: number;
}
