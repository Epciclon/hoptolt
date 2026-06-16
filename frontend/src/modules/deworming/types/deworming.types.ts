export interface Deworming {
  id: number;
  rabbitId: number;
  rabbitCode: string;
  rabbitName?: string;
  dewormingDate: string;
  galponId: number;
}

export interface CreateDewormingDto {
  rabbitIds: number[];
}
