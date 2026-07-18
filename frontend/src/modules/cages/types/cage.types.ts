export interface Cage {
  id: number;
  number: number;
  type: 'engorde' | 'reproducción';
  capacity: number;
  status: 'operativa' | 'mantenimiento';
  galponId?: number;
  assignedCount?: number;
  occupancyStatus?: 'disponible' | 'parcial' | 'llena';
}

export interface CreateCageDto {
  number: number;
  type: 'engorde' | 'reproducción';
  capacity: number;
  status: 'operativa' | 'mantenimiento';
  galponId: number;
}

export interface UpdateCageDto {
  type: 'engorde' | 'reproducción';
  capacity: number;
  status: 'operativa' | 'mantenimiento';
  galponId: number;
}
