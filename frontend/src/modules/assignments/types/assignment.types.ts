export interface AssignedRabbit {
  id: number;
  code: string;
  name?: string;
  age?: number;
  weight?: number;
  cageNumber?: number;
  cageType?: string;
  cageId?: number;
}

export interface Assignment {
  id: number;
  cageId: number;
  rabbitId: number;
  galponId: number;
  status: 'asignado' | 'liberado';
  assignedAt: string;
  rabbitCode?: string;
  rabbitName?: string;
  cageNumber?: number;
  cageType?: string;
}

export interface AssignRabbitDto {
  cageId: number;
  rabbitIds: number[];
}

export interface UnassignRabbitDto {
  id: number;
}
