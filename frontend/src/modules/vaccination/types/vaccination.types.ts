export interface Vaccination {
  id: number;
  rabbitId: number;
  rabbitCode: string;
  rabbitName?: string;
  vaccines: string[];
  vaccinationDate: string;
  galponId: number;
  profileId?: string;
  rabbit?: {
    code: string;
    name?: string;
    race: string;
    imageUrl?: string;
  };
  profile?: {
    username: string;
    fullName: string;
    email: string;
  };
}

export interface CreateVaccinationDto {
  rabbitIds: number[];
  vaccines: string[];
}

export interface GalponVaccine {
  name: string;
  period: number;
}
