require('../../setup');

const { toProfileDTO } = require('../../../src/common/dtos/profile.dto');
const { toRabbitDTO } = require('../../../src/common/dtos/rabbit.dto');
const { toCageDTO } = require('../../../src/common/dtos/cage.dto');
const { toRaceDTO } = require('../../../src/common/dtos/race.dto');
const { toAssignmentDTO } = require('../../../src/common/dtos/assignment.dto');
const { toGalponDTO } = require('../../../src/common/dtos/galpon.dto');
const { toGenealogyDTO } = require('../../../src/common/dtos/genealogy.dto');
const { toFeedingDTO } = require('../../../src/common/dtos/feeding.dto');
const { toVaccinationDTO } = require('../../../src/common/dtos/vaccination.dto');
const { toDewormingDTO } = require('../../../src/common/dtos/deworming.dto');
const { toCleaningDTO } = require('../../../src/common/dtos/cleaning.dto');
const { toMortalityDTO } = require('../../../src/common/dtos/mortality.dto');
const {
  toReproductionDTO,
  toAvailableRabbitDTO,
  toCalendarEntryDTO,
} = require('../../../src/common/dtos/reproduction.dto');
const { toFarmMemberDTO } = require('../../../src/common/dtos/farmMember.dto');
const { toInvitationDTO } = require('../../../src/common/dtos/invitation.dto');
const { toNotificationDTO } = require('../../../src/common/dtos/notification.dto');

let toGrowthDTO;
try {
  ({ toGrowthDTO } = require('../../../src/common/dtos/growth.dto'));
} catch (e) {
  toGrowthDTO = null;
}

describe('DTOs', () => {
  describe('toProfileDTO', () => {
    it('returns expected fields with role and permissions', () => {
      const profile = { id: '1', username: 'jdoe', email: 'j@e.com', fullName: 'John Doe', activeGalponId: 1, createdAt: '2024-01-01', role: 'owner', permissions: [{ module: 'feeding' }] };
      const result = toProfileDTO(profile);
      expect(result.id).toBe('1');
      expect(result.username).toBe('jdoe');
      expect(result.email).toBe('j@e.com');
      expect(result.fullName).toBe('John Doe');
      expect(result.activeGalponId).toBe(1);
      expect(result.role).toBe('owner');
      expect(result.permissions).toEqual([{ module: 'feeding' }]);
    });

    it('handles missing role and permissions', () => {
      const profile = { id: '2', username: 'worker', email: 'w@e.com', fullName: 'Worker', activeGalponId: null, createdAt: '2024-01-01' };
      const result = toProfileDTO(profile);
      expect(result.role).toBeUndefined();
      expect(result.permissions).toBeUndefined();
    });
  });

  describe('toRabbitDTO', () => {
    it('returns expected fields with parsed weight', () => {
      const rabbit = { id: 1, code: 'R001', name: 'Bunny', race: 'New Zealand', sex: 'hembra', birthDate: '2024-01-01', age: 6, weight: '2.5', purpose: 'Engorde', imageUrl: 'img.jpg' };
      const result = toRabbitDTO(rabbit);
      expect(result.id).toBe(1);
      expect(result.code).toBe('R001');
      expect(result.name).toBe('Bunny');
      expect(result.race).toBe('New Zealand');
      expect(result.weight).toBe(2.5);
    });

    it('handles null weight', () => {
      const rabbit = { id: 1, code: 'R001', name: 'Bunny', race: 'X', sex: 'macho', birthDate: '2024-01-01', age: 6, weight: null, purpose: 'Engorde', imageUrl: null };
      const result = toRabbitDTO(rabbit);
      expect(Number.isNaN(result.weight)).toBe(true);
    });
  });

  describe('toCageDTO', () => {
    it('returns expected fields', () => {
      const cage = { id: 1, number: 5, type: 'engorde', capacity: 8, status: 'operativa', galponId: 1, assignedCount: 3, occupancyStatus: 'parcial' };
      const result = toCageDTO(cage);
      expect(result.id).toBe(1);
      expect(result.number).toBe(5);
      expect(result.occupancyStatus).toBe('parcial');
    });

    it('handles empty cage', () => {
      const cage = { id: 2, number: 6, type: 'reproducción', capacity: 1, status: 'operativa', galponId: 1, assignedCount: 0, occupancyStatus: 'disponible' };
      const result = toCageDTO(cage);
      expect(result.assignedCount).toBe(0);
      expect(result.occupancyStatus).toBe('disponible');
    });
  });

  describe('toRaceDTO', () => {
    it('returns race fields', () => {
      const race = { id: 1, name: 'New Zealand', description: 'Great breed', imageUrl: 'img.jpg', galponId: 1 };
      const result = toRaceDTO(race);
      expect(result.name).toBe('New Zealand');
      expect(result.description).toBe('Great breed');
    });
  });

  describe('toAssignmentDTO', () => {
    it('includes nested rabbit and cage data', () => {
      const assignment = { id: 1, cageId: 1, rabbitId: 1, galponId: 1, status: 'asignado', assignedAt: '2024-01-01', rabbit: { code: 'R001', name: 'Bunny', age: 6, weight: 2.5, race: 'New Zealand', imageUrl: 'img.jpg' }, cage: { number: 5, type: 'engorde' } };
      const result = toAssignmentDTO(assignment);
      expect(result.rabbitCode).toBe('R001');
      expect(result.cageNumber).toBe(5);
      expect(result.photoUrl).toBe('img.jpg');
    });

    it('handles missing rabbit and cage', () => {
      const assignment = { id: 1, cageId: 1, rabbitId: 1, galponId: 1, status: 'asignado', assignedAt: '2024-01-01' };
      const result = toAssignmentDTO(assignment);
      expect(result.rabbitCode).toBeUndefined();
      expect(result.cageNumber).toBeUndefined();
    });
  });

  describe('toGalponDTO', () => {
    it('returns expected fields', () => {
      const galpon = { id: 1, name: 'Galpon 1', province: 'Pichincha', location: 'Quito', totalCapacity: 50, foodTypes: ['pellets'], vaccines: [{ name: 'Mixomatosis', period: 180 }], dewormingPeriod: 30, profileId: 'p1', memberRole: 'owner', createdAt: '2024-01-01' };
      const result = toGalponDTO(galpon);
      expect(result.name).toBe('Galpon 1');
      expect(result.vaccines).toHaveLength(1);
      expect(result.memberRole).toBe('owner');
    });
  });

  describe('toGenealogyDTO', () => {
    it('returns genealogy with rabbit, father, mother', () => {
      const g = { id: 1, rabbitId: 1, fatherId: 2, motherId: 3, galponId: 1, createdAt: '2024-01-01', updatedAt: '2024-01-01', rabbit: { id: 1, code: 'R001', name: 'Offspring', race: 'X', sex: 'hembra', age: 2 }, father: { id: 2, code: 'R002', name: 'Dad', race: 'X', sex: 'macho', age: 12 }, mother: { id: 3, code: 'R003', name: 'Mom', race: 'X', sex: 'hembra', age: 10 } };
      const result = toGenealogyDTO(g);
      expect(result.rabbitId).toBe(1);
      expect(result.father.code).toBe('R002');
      expect(result.mother.name).toBe('Mom');
    });

    it('handles missing parents', () => {
      const g = { id: 1, rabbitId: 1, fatherId: null, motherId: null, galponId: 1, createdAt: '2024-01-01', updatedAt: '2024-01-01' };
      const result = toGenealogyDTO(g);
      expect(result.father).toBeUndefined();
      expect(result.mother).toBeUndefined();
    });
  });

  describe('toFeedingDTO', () => {
    it('returns feeding with profile and rabbit snapshot', () => {
      const feeding = { id: 1, cageId: 1, cage: { number: 5, type: 'engorde' }, foodTypes: ['pellets'], justification: null, feedingDate: '2024-01-01', shift: 'mañana', galponId: 1, profileId: 'p1', profile: { username: 'jdoe', fullName: 'John Doe', email: 'j@e.com' }, rabbitsSnapshot: [{ id: 1, code: 'R001' }] };
      const result = toFeedingDTO(feeding);
      expect(result.cageNumber).toBe(5);
      expect(result.profileName).toBe('John Doe');
      expect(result.rabbits).toHaveLength(1);
    });

    it('falls back to cage assignments when snapshot missing', () => {
      const feeding = { id: 1, cageId: 1, cage: { number: 5, type: 'engorde', assignments: [{ rabbit: { id: 1, code: 'R001' } }] }, foodTypes: ['pellets'], justification: null, feedingDate: '2024-01-01', shift: 'tarde', galponId: 1, profileId: 'p1' };
      const result = toFeedingDTO(feeding);
      expect(result.rabbits).toHaveLength(1);
    });
  });

  describe('toVaccinationDTO', () => {
    it('returns vaccination with rabbit and profile data', () => {
      const v = { id: 1, rabbitId: 1, rabbitCode: 'R001', rabbitName: 'Bunny', vaccines: ['Mixomatosis'], vaccinationDate: '2024-01-01', galponId: 1, profileId: 'p1', rabbit: { code: 'R001', name: 'Bunny', race: 'X', imageUrl: 'img.jpg', assignments: [] }, profile: { username: 'jdoe', fullName: 'John Doe', email: 'j@e.com' } };
      const result = toVaccinationDTO(v);
      expect(result.rabbitCode).toBe('R001');
      expect(result.vaccines).toEqual(['Mixomatosis']);
      expect(result.profile.fullName).toBe('John Doe');
    });

    it('handles missing rabbit and profile', () => {
      const v = { id: 1, rabbitId: 1, vaccines: [], vaccinationDate: '2024-01-01', galponId: 1, profileId: 'p1' };
      const result = toVaccinationDTO(v);
      expect(result.rabbitCode).toBeNull();
      expect(result.profile).toBeNull();
    });
  });

  describe('toDewormingDTO', () => {
    it('returns deworming fields', () => {
      const d = { id: 1, rabbitId: 1, rabbitCode: 'R001', rabbitName: 'Bunny', dewormingDate: '2024-01-01', galponId: 1, profileId: 'p1', rabbit: { code: 'R001', name: 'Bunny', race: 'X', imageUrl: null, assignments: [] }, profile: { username: 'jdoe', fullName: 'John Doe', email: 'j@e.com' } };
      const result = toDewormingDTO(d);
      expect(result.rabbitCode).toBe('R001');
      expect(result.profile.fullName).toBe('John Doe');
    });

    it('handles missing nested data', () => {
      const d = { id: 1, rabbitId: 1, dewormingDate: '2024-01-01', galponId: 1, profileId: 'p1' };
      const result = toDewormingDTO(d);
      expect(result.rabbitCode).toBeNull();
      expect(result.rabbit).toBeNull();
    });
  });

  describe('toCleaningDTO', () => {
    it('returns cleaning with responsible name from profile', () => {
      const cleaning = { id: 1, cageId: 1, cageNumber: 5, cleaningDate: '2024-01-01', profile: { username: 'worker', fullName: 'Worker Name', email: 'w@e.com' } };
      const result = toCleaningDTO(cleaning);
      expect(result.cageNumber).toBe(5);
      expect(result.responsible).toBe('Worker Name');
    });

    it('falls back to username when fullName is missing', () => {
      const cleaning = { id: 1, cageId: 1, cageNumber: 5, cleaningDate: '2024-01-01', profile: { username: 'worker', email: 'w@e.com' } };
      const result = toCleaningDTO(cleaning);
      expect(result.responsible).toBe('worker');
    });
  });

  describe('toMortalityDTO', () => {
    it('returns mortality fields with profile name resolution', () => {
      const m = { id: 1, rabbitId: 1, cause: 'enfermedad', observations: 'sick', deathDate: '2024-01-01', isKits: false, numberOfKits: null, galponId: 1, createdAt: '2024-01-01', updatedAt: '2024-01-01', rabbit: { code: 'R001', name: 'Bunny', race: 'X', imageUrl: null }, profile: { fullName: 'John Doe', username: 'jdoe', email: 'j@e.com' } };
      const result = toMortalityDTO(m);
      expect(result.rabbitCode).toBe('R001');
      expect(result.responsible).toBe('John Doe');
      expect(result.isKits).toBe(false);
    });

    it('handles kit mortality', () => {
      const m = { id: 1, rabbitId: 1, cause: 'born dead', observations: '', deathDate: '2024-01-01', isKits: true, numberOfKits: 5, galponId: 1, createdAt: '2024-01-01', updatedAt: '2024-01-01', rabbit: { code: 'R001', name: null, race: 'X', imageUrl: null } };
      const result = toMortalityDTO(m);
      expect(result.isKits).toBe(true);
      expect(result.numberOfKits).toBe(5);
    });
  });

  describe('toAvailableRabbitDTO', () => {
    it('returns available rabbit fields', () => {
      const rabbit = { id: 1, code: 'R001', name: 'Bunny', race: 'X', age: 6, weight: 2.5, imageUrl: 'img.jpg', assignments: [{ cage: { number: 5, type: 'engorde', id: 1 } }] };
      const result = toAvailableRabbitDTO(rabbit);
      expect(result.code).toBe('R001');
      expect(result.cageNumber).toBe(5);
    });

    it('handles missing assignments', () => {
      const rabbit = { id: 1, code: 'R001', name: 'Bunny', race: 'X', age: 6, weight: 2.5, imageUrl: null };
      const result = toAvailableRabbitDTO(rabbit);
      expect(result.cageNumber).toBeUndefined();
    });
  });

  describe('toReproductionDTO', () => {
    it('returns reproduction with female and male data', () => {
      const r = { id: 1, femaleId: 1, maleId: 2, mountDate: '2024-01-01', estimatedBirthDate: '2024-02-01', bornKits: null, cancellationReason: null, status: 'monta', createdAt: '2024-01-01', updatedAt: '2024-01-01', galponId: 1, updatedBySystem: false, female: { id: 1, code: 'F001', name: 'Female', race: 'X', sex: 'hembra', age: 8, weight: 3.0, purpose: 'Reproducción', imageUrl: null, assignments: [{ cage: { number: 5, type: 'reproducción', id: 1 } }] }, male: { id: 2, code: 'M001', name: 'Male', race: 'X', sex: 'macho', weight: 3.5, purpose: 'Reproducción', imageUrl: null }, profile: { username: 'jdoe', fullName: 'John Doe', email: 'j@e.com' } };
      const result = toReproductionDTO(r);
      expect(result.femaleCode).toBe('F001');
      expect(result.maleCode).toBe('M001');
      expect(result.status).toBe('monta');
    });
  });

  describe('toCalendarEntryDTO', () => {
    it('returns receptive entry', () => {
      const result = toCalendarEntryDTO({ id: 1, femaleId: 1, femaleCode: 'F001', femaleName: 'Female', femaleImageUrl: null, receptiveDate: '2024-01-15', cageNumber: 5, cageType: 'reproducción' }, 'receptive');
      expect(result.type).toBe('receptive');
      expect(result.femaleCode).toBe('F001');
    });

    it('returns weaning entry', () => {
      const r = { id: 1, femaleId: 1, female: { code: 'F001', name: 'Female', imageUrl: null }, maleId: 2, male: { code: 'M001', name: 'Male', imageUrl: null }, mountDate: '2024-01-01', estimatedBirthDate: '2024-02-01', estimatedWeaningDate: '2024-03-01' };
      const result = toCalendarEntryDTO(r, 'weaning', { number: 5, type: 'reproducción' });
      expect(result.type).toBe('weaning');
      expect(result.estimatedWeaningDate).toBe('2024-03-01');
    });

    it('returns births entry as default', () => {
      const r = { id: 1, femaleId: 1, female: { code: 'F001', name: 'Female', imageUrl: null }, maleId: 2, male: { code: 'M001', name: 'Male', imageUrl: null }, mountDate: '2024-01-01', estimatedBirthDate: '2024-02-01' };
      const result = toCalendarEntryDTO(r, 'births', { number: 5, type: 'reproducción' });
      expect(result.type).toBe('births');
    });
  });

  describe('toFarmMemberDTO', () => {
    it('returns member with nested profile and galpon', () => {
      const member = { id: 1, galponId: 1, profileId: 'p1', role: 'worker', status: 'active', createdAt: '2024-01-01', profile: { id: 'p1', username: 'worker', fullName: 'Worker', email: 'w@e.com' }, galpon: { id: 1, name: 'Galpon 1', location: 'Quito' }, permissions: [{ moduleName: 'feeding' }], assignedCages: [{ cage: { number: 5 } }] };
      const result = toFarmMemberDTO(member);
      expect(result.role).toBe('worker');
      expect(result.profile.username).toBe('worker');
      expect(result.galpon.name).toBe('Galpon 1');
    });

    it('handles missing nested data', () => {
      const member = { id: 1, galponId: 1, profileId: 'p1', role: 'owner', status: 'active', createdAt: '2024-01-01' };
      const result = toFarmMemberDTO(member);
      expect(result.profile).toBeUndefined();
      expect(result.galpon).toBeUndefined();
    });
  });

  describe('toInvitationDTO', () => {
    it('returns invitation with galpon and inviter', () => {
      const inv = { id: 1, galponId: 1, email: 'w@e.com', token: 'abc123', status: 'pending', createdAt: '2024-01-01', galpon: { id: 1, name: 'Galpon 1', location: 'Quito' }, inviter: { id: 'p1', fullName: 'Owner', username: 'owner' } };
      const result = toInvitationDTO(inv);
      expect(result.email).toBe('w@e.com');
      expect(result.galpon.name).toBe('Galpon 1');
      expect(result.inviter.fullName).toBe('Owner');
    });

    it('handles missing nested data', () => {
      const inv = { id: 1, galponId: 1, email: 'w@e.com', token: 'abc123', status: 'pending', createdAt: '2024-01-01' };
      const result = toInvitationDTO(inv);
      expect(result.galpon).toBeUndefined();
      expect(result.inviter).toBeUndefined();
    });
  });

  describe('toNotificationDTO', () => {
    it('returns notification fields', () => {
      const n = { id: 1, type: 'info', title: 'Test', message: 'Hello', data: { key: 'val' }, read: false, createdAt: '2024-01-01' };
      const result = toNotificationDTO(n);
      expect(result.type).toBe('info');
      expect(result.title).toBe('Test');
      expect(result.data).toEqual({ key: 'val' });
    });

    it('handles null data', () => {
      const n = { id: 1, type: 'warning', title: 'Alert', message: 'Watch out', data: null, read: true, createdAt: '2024-01-01' };
      const result = toNotificationDTO(n);
      expect(result.data).toBeNull();
    });
  });

  if (toGrowthDTO) {
    describe('toGrowthDTO', () => {
      it('returns growth fields', () => {
        const growth = { id: 1, rabbitId: 1, weight: 2.5, recordDate: '2024-01-01', rabbit: { id: 1, code: 'R001' }, profile: { id: 'p1', username: 'jdoe' }, profileId: 'p1', galponId: 1 };
        const result = toGrowthDTO(growth);
        expect(result.id).toBe(1);
        expect(result.weight).toBe(2.5);
      });
    });
  }
});
