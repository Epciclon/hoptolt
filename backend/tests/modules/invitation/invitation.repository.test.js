jest.mock('../../../src/domain/models', () => ({
  Invitation: {
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
  Galpon: {
    findOne: jest.fn(),
  },
  Profile: {},
}))

const { Invitation, Galpon } = require('../../../src/domain/models')
const invitationRepository = require('../../../src/modules/invitation/invitation.repository')

describe('InvitationRepository', () => {
  beforeEach(() => { jest.clearAllMocks() })

  describe('create', () => {
    it('calls Invitation.create with data', async () => {
      Invitation.create.mockResolvedValue({ id: 1 })
      await invitationRepository.create({ email: 'test@test.com', galponId: 1 })
      expect(Invitation.create).toHaveBeenCalledWith({ email: 'test@test.com', galponId: 1 })
    })
  })

  describe('findByToken', () => {
    it('finds invitation with includes', async () => {
      Invitation.findOne.mockResolvedValue({ id: 1 })
      await invitationRepository.findByToken('abc123')
      expect(Invitation.findOne).toHaveBeenCalledWith({
        where: { token: 'abc123' },
        include: expect.any(Array),
      })
    })
  })

  describe('findPendingByEmail', () => {
    it('finds pending invitations by lowercase email', async () => {
      Invitation.findAll.mockResolvedValue([{ id: 1 }])
      await invitationRepository.findPendingByEmail('TEST@TEST.COM')
      expect(Invitation.findAll).toHaveBeenCalledWith({
        where: { email: 'test@test.com', status: 'pending' },
        include: expect.any(Array),
      })
    })
  })

  describe('findByGalponId', () => {
    it('returns invitations ordered by createdAt DESC', async () => {
      Invitation.findAll.mockResolvedValue([{ id: 1 }])
      await invitationRepository.findByGalponId(1)
      expect(Invitation.findAll).toHaveBeenCalledWith({
        where: { galponId: 1 },
        order: [['createdAt', 'DESC']],
        include: expect.any(Array),
      })
    })
  })

  describe('getGalponWithOwner', () => {
    it('finds galpon with owner profile', async () => {
      Galpon.findOne.mockResolvedValue({ id: 1 })
      await invitationRepository.getGalponWithOwner(1)
      expect(Galpon.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        include: expect.any(Array),
      })
    })
  })

  describe('updateStatus', () => {
    it('calls invitation.update with status', async () => {
      const invitation = { update: jest.fn() }
      await invitationRepository.updateStatus(invitation, 'accepted')
      expect(invitation.update).toHaveBeenCalledWith({ status: 'accepted' })
    })
  })
})
