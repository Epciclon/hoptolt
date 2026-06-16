export interface Cage {
  id: number;
  number: number;
  type: 'engorde' | 'reproducción';
  capacity: number;
  status?: string;
  galponId?: number;
}

export interface CreateCageDto {
  number: number;
  type: 'engorde' | 'reproducción';
  capacity: number;
  galponId: number;
}

export interface UpdateCageDto {
  type: 'engorde' | 'reproducción';
  capacity: number;
  galponId: number;
}
