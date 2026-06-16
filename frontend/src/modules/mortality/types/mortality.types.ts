export interface Mortality {
  id: number;
  rabbitId: number;
  rabbitCode?: string;
  rabbitName?: string;
  cause: string;
  observations?: string;
  responsible: string;
  deathDate: string;
}

export interface CreateMortalityDto {
  rabbitId: number;
  cause: string;
  observations?: string;
  responsible?: string;
  deathDate: string;
}
