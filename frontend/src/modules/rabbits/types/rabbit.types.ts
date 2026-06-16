export interface Rabbit {
  id: number;
  race: string;
  code: string;
  name: string;
  sex: 'macho' | 'hembra';
  age?: number;
  birthDate?: string;
  weight: number;
  purpose: 'Reproducción' | 'Engorde';
}

export interface CreateRabbitDto {
  race: string;
  name: string;
  sex: 'macho' | 'hembra';
  birthDate: string;
  weight: number;
  purpose: 'Reproducción' | 'Engorde';
}

export interface UpdateRabbitDto {
  name: string;
  sex: 'macho' | 'hembra';
  birthDate?: string;
  weight: number;
  purpose: 'Reproducción' | 'Engorde';
}
