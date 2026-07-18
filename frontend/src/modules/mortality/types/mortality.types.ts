export interface Mortality {
  id: number;
  rabbitId: number;
  rabbitCode?: string;
  rabbitName?: string;
  rabbitRace?: string;
  rabbitImageUrl?: string | null;
  cause: string;
  observations?: string;
  responsible: string;
  profileUsername?: string | null;
  profileEmail?: string | null;
  profile?: {
    username?: string | null;
    fullName?: string;
    email?: string | null;
  };
  deathDate: string;
  isKits?: boolean;
  numberOfKits?: number;
}

export interface CreateMortalityDto {
  rabbitId: number;
  cause: string;
  observations?: string;
  responsible?: string;
  deathDate: string;
  isKits?: boolean;
  numberOfKits?: number;
}
