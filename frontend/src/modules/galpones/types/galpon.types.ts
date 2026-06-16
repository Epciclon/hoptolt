export interface Galpon {
  id: number;
  name: string;
  province: string;
  location: string;
  totalCapacity: number;
  foodTypes: string[];
  vaccines: Array<{ name: string; period: number }>;
  dewormingPeriod: number;
  profileId: string;
  createdAt?: string;
  memberRole?: 'owner' | 'worker' | null;
}

export interface CreateGalponDto {
  name: string;
  province: string;
  location: string;
  totalCapacity: number;
  foodTypes: string[];
  vaccines: Array<{ name: string; period: number }>;
  dewormingPeriod: number;
}

export interface UpdateGalponDto {
  name?: string;
  province?: string;
  location?: string;
  totalCapacity?: number;
  foodTypes?: string[];
  vaccines?: Array<{ name: string; period: number }>;
  dewormingPeriod?: number;
}
