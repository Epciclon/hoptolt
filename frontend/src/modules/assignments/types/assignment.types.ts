export interface AssignedRabbit {
  id: number;
  code: string;
  name?: string;
  age?: number;
  weight?: number;
  race?: string;
  imageUrl?: string;
  cageNumber?: number;
  cageType?: string;
  cageId?: number;
  isLactating?: boolean;
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
  rabbitAge?: number;
  rabbitWeight?: number;
  rabbitRace?: string;
  cageNumber?: number;
  cageType?: string;
  photoUrl?: string;
}

export interface AssignRabbitDto {
  cageId: number;
  rabbitIds: number[];
}

export interface UnassignRabbitDto {
  id: number;
}
