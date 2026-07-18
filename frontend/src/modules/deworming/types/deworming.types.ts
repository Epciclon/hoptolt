export interface Deworming {
  id: number;
  rabbitId: number;
  rabbitCode: string;
  rabbitName?: string;
  dewormingDate: string;
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

export interface CreateDewormingDto {
  rabbitIds: number[];
}
