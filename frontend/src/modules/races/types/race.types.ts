export interface Race {
  id: number;
  name: string;
  description: string;
  imageUrl?: string;
  galponId: number;
}

export interface CreateRaceDto {
  name: string;
  description: string;
  imageUrl?: string;
}

export interface UpdateRaceDto {
  description: string;
  imageUrl?: string;
}
