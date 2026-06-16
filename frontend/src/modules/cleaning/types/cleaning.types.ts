export interface Cleaning {
  id: number;
  cageId: number;
  cageNumber: number;
  responsible: string;
  cleaningDate: string;
}

export interface CreateCleaningDto {
  cageIds: number[];
}
