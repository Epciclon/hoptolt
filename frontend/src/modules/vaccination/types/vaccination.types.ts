export interface Vaccination {
  id: number;
  rabbitId: number;
  rabbitCode: string;
  rabbitName?: string;
  vaccines: string[];
  vaccinationDate: string;
  galponId: number;
}

export interface CreateVaccinationDto {
  rabbitIds: number[];
  vaccines: string[];
}

export interface GalponVaccine {
  name: string;
  period: number;
}
