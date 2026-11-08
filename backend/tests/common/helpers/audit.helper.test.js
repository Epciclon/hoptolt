require('../../setup');

const { AuditLog, FarmMember } = require('../../../src/domain/models');
const { recordWorkerChange, recordSystemChange } = require('../../../src/common/helpers/audit.helper');

describe('audit.helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordWorkerChange', () => {
    it('records audit log when user is an active worker', async () => {
      FarmMember.findOne = jest.fn().mockResolvedValue({ id: 1, role: 'worker', status: 'active' });
      AuditLog.create = jest.fn().mockResolvedValue({ id: 10 });

      await recordWorkerChange({
        galponId: 1,
        profileId: 'w1',
        action: 'crear',
        entity: 'feeding',
        entityId: 5,
        itemName: 'Jaula 1',
        summary: 'Alimentó la jaula 1'
      });

      expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        action: 'crear',
        entity: 'feeding',
        profileId: 'w1'
      }));
    });

    it('skips audit log when user is owner', async () => {
      FarmMember.findOne = jest.fn().mockResolvedValue({ id: 1, role: 'owner', status: 'active' });
      AuditLog.create = jest.fn();

      await recordWorkerChange({
        galponId: 1,
        profileId: 'owner1',
        action: 'crear',
        entity: 'feeding'
      });

      expect(AuditLog.create).not.toHaveBeenCalled();
    });
  });

  describe('recordSystemChange', () => {
    it('records system audit log with extra details such as cages, shift, and date', async () => {
      AuditLog.create = jest.fn().mockResolvedValue({ id: 20 });

      const result = await recordSystemChange({
        galponId: 1,
        action: 'Turno cerrado con pendientes',
        entity: 'feeding',
        entityId: 1,
        itemName: 'Turno de la tarde',
        summary: 'HopTolt registró el cierre del turno de la tarde con 2 jaulas sin alimentar y sin reporte de novedad',
        cages: [1, 14],
        unfedCount: 2,
        shift: 'tarde',
        date: '2026-11-08'
      });

      expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        action: 'Turno cerrado con pendientes',
        entity: 'feeding',
        profileId: null,
        details: expect.objectContaining({
          galponId: 1,
          isSystem: true,
          systemActor: 'HopTolt',
          cages: [1, 14],
          unfedCount: 2,
          shift: 'tarde',
          date: '2026-11-08'
        })
      }));
      expect(result).toEqual({ id: 20 });
    });

    it('returns null when galponId is missing', async () => {
      const result = await recordSystemChange({ action: 'test', entity: 'feeding' });
      expect(result).toBeNull();
    });
  });
});
