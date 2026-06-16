export interface Feeding {
  id: number;
  cageId: number;
  cageNumber?: number;
  cageType?: string;
  foodTypes: string[];
  justification?: string;
  feedingDate: string;
  galponId: number;
}

export interface CreateFeedingDto {
  cageIds: number[];
  foodTypes: string[];
  justification?: string;
}
