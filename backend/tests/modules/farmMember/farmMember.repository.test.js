jest.mock('../../../src/domain/models', () => ({
  FarmMember: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
  Profile: {},
  Galpon: {},
  WorkerPermission: {
    destroy: jest.fn(),
    bulkCreate: jest.fn(),
  },
  WorkerCage: {
    destroy: jest.fn(),
    bulkCreate: jest.fn(),
  },
  Cage: {},
}))

const { FarmMember, WorkerPermission, WorkerCage } = require('../../../src/domain/models')
const farmMemberRepository = require('../../../src/modules/farmMember/farmMember.repository')

describe('FarmMemberRepository', () => {
  beforeEach(() => { jest.clearAllMocks() })

  describe('findByGalponId', () => {
    it('finds active members with includes', async () => {
      FarmMember.findAll.mockResolvedValue([{ id: 1 }])
      const result = await farmMemberRepository.findByGalponId(1)
      expect(FarmMember.findAll).toHaveBeenCalledWith({
        where: { galponId: 1, status: 'active' },
        include: expect.any(Array),
      })
      expect(result).toHaveLength(1)
    })
  })

  describe('findByProfileId', () => {
    it('finds active memberships with includes', async () => {
      FarmMember.findAll.mockResolvedValue([{ id: 1 }])
      await farmMemberRepository.findByProfileId('p1')
      expect(FarmMember.findAll).toHaveBeenCalledWith({
        where: { profileId: 'p1', status: 'active' },
        include: expect.any(Array),
      })
    })
  })

  describe('findById', () => {
    it('finds by PK with includes', async () => {
      FarmMember.findByPk.mockResolvedValue({ id: 1 })
      await farmMemberRepository.findById(1)
      expect(FarmMember.findByPk).toHaveBeenCalledWith(1, expect.objectContaining({
        include: expect.any(Array),
      }))
    })
  })

  describe('findMembership', () => {
    it('finds by profileId and galponId', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 1 })
      await farmMemberRepository.findMembership('p1', 1)
      expect(FarmMember.findOne).toHaveBeenCalledWith({
        where: { profileId: 'p1', galponId: 1 },
      })
    })
  })

  describe('create', () => {
    it('calls FarmMember.create with data', async () => {
      FarmMember.create.mockResolvedValue({ id: 1 })
      await farmMemberRepository.create({ profileId: 'p1', galponId: 1 })
      expect(FarmMember.create).toHaveBeenCalledWith({ profileId: 'p1', galponId: 1 })
    })
  })

  describe('update', () => {
    it('calls member.update with data', async () => {
      const member = { update: jest.fn() }
      await farmMemberRepository.update(member, { role: 'admin' })
      expect(member.update).toHaveBeenCalledWith({ role: 'admin' })
    })
  })

  describe('deactivate', () => {
    it('sets status to inactive', async () => {
      const member = { update: jest.fn() }
      await farmMemberRepository.deactivate(member)
      expect(member.update).toHaveBeenCalledWith({ status: 'inactive' })
    })
  })

  describe('replacePermissions', () => {
    it('destroys old and bulk creates new permissions', async () => {
      WorkerPermission.destroy.mockResolvedValue(1)
      WorkerPermission.bulkCreate.mockResolvedValue([{ id: 1 }])
      const permissions = [{ action: 'manage' }]
      const result = await farmMemberRepository.replacePermissions(1, permissions)
      expect(WorkerPermission.destroy).toHaveBeenCalledWith({ where: { farmMemberId: 1 } })
      expect(WorkerPermission.bulkCreate).toHaveBeenCalledWith([
        { action: 'manage', farmMemberId: 1 },
      ])
      expect(result).toHaveLength(1)
    })

    it('returns empty array when no permissions', async () => {
      WorkerPermission.destroy.mockResolvedValue(1)
      const result = await farmMemberRepository.replacePermissions(1, [])
      expect(WorkerPermission.bulkCreate).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })
  })

  describe('replaceWorkerCages', () => {
    it('destroys old and bulk creates new worker cages', async () => {
      WorkerCage.destroy.mockResolvedValue(1)
      WorkerCage.bulkCreate.mockResolvedValue([{ id: 1 }])
      const result = await farmMemberRepository.replaceWorkerCages(1, [10, 20])
      expect(WorkerCage.destroy).toHaveBeenCalledWith({ where: { farmMemberId: 1 } })
      expect(WorkerCage.bulkCreate).toHaveBeenCalledWith([
        { farmMemberId: 1, cageId: 10 },
        { farmMemberId: 1, cageId: 20 },
      ])
      expect(result).toHaveLength(1)
    })
  })
})
