export interface Growth {
  id: number;
  rabbitCode: string;
  weight: number;
  recordDate: string;
}

export interface CreateGrowthDto {
  rabbitCode: string;
  weight: number;
}
