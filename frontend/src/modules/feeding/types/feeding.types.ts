export interface Feeding {
  id: number;
  cageId: number;
  cageNumber?: number;
  cageType?: string;
  foodTypes: string[];
  justification?: string;
  feedingDate: string;
  shift: 'mañana' | 'tarde';
  galponId: number;
  profileId?: string;
  profileName?: string;
  profile?: {
    username: string;
    fullName: string;
    email: string;
  } | null;
  rabbits?: Array<{
    id: number;
    code: string;
    name: string;
    race: string;
    imageUrl?: string;
  }>;
}

export interface CreateFeedingDto {
  cageIds: number[];
  foodTypes: string[];
  justification?: string;
  shift?: 'mañana' | 'tarde';
}
