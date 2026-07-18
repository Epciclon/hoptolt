jest.mock('../../../src/domain/models', () => ({
  Profile: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    upsert: jest.fn(),
  },
  FarmMember: {
    findOne: jest.fn(),
  },
  WorkerPermission: {
    findOne: jest.fn(),
  },
}))

const { Profile, FarmMember, WorkerPermission } = require('../../../src/domain/models')
const authRepository = require('../../../src/modules/auth/auth.repository')

const createProfile = (overrides = {}) => ({
  id: 'profile-1',
  email: 'test@test.com',
  fullName: 'Test User',
  username: 'testuser',
  activeGalponId: null,
  toJSON: jest.fn().mockReturnValue({
    id: 'profile-1',
    email: 'test@test.com',
    fullName: 'Test User',
    username: 'testuser',
    activeGalponId: null,
    ...overrides,
  }),
  update: jest.fn().mockResolvedValue(true),
  ...overrides,
})

describe('AuthRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('findById', () => {
    it('returns enriched profile with role and permissions when activeGalponId exists', async () => {
      const profile = createProfile({ activeGalponId: 'galpon-1' })
      const membership = {
        role: 'admin',
        permissions: [{ toJSON: () => ({ id: 1, action: 'manage' }) }],
      }
      Profile.findByPk.mockResolvedValue(profile)
      FarmMember.findOne.mockResolvedValue(membership)

      const result = await authRepository.findById('profile-1')

      expect(Profile.findByPk).toHaveBeenCalledWith('profile-1')
      expect(FarmMember.findOne).toHaveBeenCalledWith({
        where: { profileId: 'profile-1', galponId: 'galpon-1', status: 'active' },
        include: [{ model: WorkerPermission, as: 'permissions' }],
      })
      expect(result.role).toBe('admin')
      expect(result.permissions).toHaveLength(1)
    })

    it('returns plain profile when no activeGalponId', async () => {
      Profile.findByPk.mockResolvedValue(createProfile({ activeGalponId: null }))

      const result = await authRepository.findById('profile-1')

      expect(FarmMember.findOne).not.toHaveBeenCalled()
      expect(result.role).toBeNull()
      expect(result.permissions).toEqual([])
    })

    it('returns null when profile not found', async () => {
      Profile.findByPk.mockResolvedValue(null)
      expect(await authRepository.findById('nonexistent')).toBeNull()
    })
  })

  describe('findByEmail', () => {
    it('calls Profile.findOne with email', async () => {
      Profile.findOne.mockResolvedValue(createProfile())
      const result = await authRepository.findByEmail('test@test.com')
      expect(Profile.findOne).toHaveBeenCalledWith({ where: { email: 'test@test.com' } })
      expect(result).not.toBeNull()
    })

    it('returns null when not found', async () => {
      Profile.findOne.mockResolvedValue(null)
      expect(await authRepository.findByEmail('missing@test.com')).toBeNull()
    })
  })

  describe('findByUsername', () => {
    it('calls Profile.findOne with username', async () => {
      Profile.findOne.mockResolvedValue(createProfile())
      await authRepository.findByUsername('testuser')
      expect(Profile.findOne).toHaveBeenCalledWith({ where: { username: 'testuser' } })
    })
  })

  describe('upsert', () => {
    it('calls Profile.upsert with data', async () => {
      const data = { id: 'p1', email: 'a@b.com', fullName: 'A', username: 'a' }
      Profile.upsert.mockResolvedValue([createProfile(data)])
      const result = await authRepository.upsert(data)
      expect(Profile.upsert).toHaveBeenCalledWith(
        { id: 'p1', email: 'a@b.com', fullName: 'A', username: 'a' },
        { returning: true },
      )
      expect(result).toBeDefined()
    })
  })

  describe('updateActiveGalpon', () => {
    it('updates the profile when found', async () => {
      const profile = createProfile()
      Profile.findByPk.mockResolvedValue(profile)
      await authRepository.updateActiveGalpon('profile-1', 'galpon-1')
      expect(profile.update).toHaveBeenCalledWith({ activeGalponId: 'galpon-1' })
    })

    it('returns null when profile not found', async () => {
      Profile.findByPk.mockResolvedValue(null)
      expect(await authRepository.updateActiveGalpon('missing', 'galpon-1')).toBeNull()
    })
  })
})
