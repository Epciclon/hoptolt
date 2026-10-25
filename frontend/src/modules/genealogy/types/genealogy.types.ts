export interface Genealogy {
  id?: number;
  rabbitId: number;
  fatherId?: number | null;
  motherId?: number | null;
  galponId?: number;
  createdAt?: string;
  updatedAt?: string;
  consanguinityWarning?: string;
  requiresConfirmation?: boolean;
  rabbit?: {
    id: number;
    code: string;
    name: string;
    race: string;
    sex: string;
    age: number;
  };
  father?: {
    id: number;
    code: string;
    name: string;
    race: string;
    sex: string;
    age: number;
  };
  mother?: {
    id: number;
    code: string;
    name: string;
    race: string;
    sex: string;
    age: number;
  };
}

export interface GenealogyTree {
  id: number;
  code: string;
  name: string;
  imageUrl?: string | null;
  sex?: string;
  age?: number;
  weight?: number;
  race?: string;
  parents?: {
    father?: GenealogyTree | null;
    mother?: GenealogyTree | null;
  };
}

export interface RegisterGenealogyDto {
  rabbitId: number;
  fatherId?: number;
  motherId?: number;
  confirmConsanguinity?: boolean;
}

export interface UpdateGenealogyDto {
  fatherId?: number | null;
  motherId?: number | null;
  confirmConsanguinity?: boolean;
}
