export interface Genealogy {
  id?: number;
  rabbitId: number;
  fatherId?: number | null;
  motherId?: number | null;
  galponId?: number;
  createdAt?: string;
  updatedAt?: string;
  consanguinityWarning?: string;
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
  parents?: {
    father?: GenealogyTree;
    mother?: GenealogyTree;
  };
}

export interface RegisterGenealogyDto {
  rabbitId: number;
  fatherId?: number;
  motherId?: number;
}

export interface UpdateGenealogyDto {
  fatherId?: number | null;
  motherId?: number | null;
}
