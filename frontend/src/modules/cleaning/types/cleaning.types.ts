export interface Cleaning {
  id: number;
  cageId: number;
  cageNumber: number;
  responsible?: string;
  profile?: {
    fullName?: string;
    username?: string;
    email?: string;
  };
  cleaningDate: string;
  rabbits?: {
    id: number;
    code: string;
    name?: string;
    race?: string;
    imageUrl?: string;
  }[];
}

export interface CreateCleaningDto {
  cageIds: number[];
}
