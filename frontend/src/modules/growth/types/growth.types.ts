export interface Growth {
  id: number;
  rabbitCode: string;
  weight: number;
  recordDate: string;
  isManual?: boolean;
}

export interface CreateGrowthDto {
  rabbitCode: string;
  weight: number;
}
