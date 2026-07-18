jest.mock('../../../src/domain/models', () => ({
  Galpon: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}))

const { Galpon } = require('../../../src/domain/models')
const galponRepository = require('../../../src/modules/galpon/galpon.repository')

const createGalpon = (overrides = {}) => ({
  id: 1, name: 'Galpon A', profileId: 'p1', isActive: false,
  update: jest.fn().mockResolvedValue({ ...overrides }),
  destroy: jest.fn().mockResolvedValue(true),
  ...overrides,
})

describe('GalponRepository', () => {
  beforeEach(() => { jest.clearAllMocks() })

  describe('findById', () => {
    it('calls Galpon.findByPk', async () => {
      Galpon.findByPk.mockResolvedValue(createGalpon())
      expect(await galponRepository.findById(1)).toBeDefined()
      expect(Galpon.findByPk).toHaveBeenCalledWith(1)
    })
  })

  describe('findByName', () => {
    it('calls Galpon.findOne with name', async () => {
      Galpon.findOne.mockResolvedValue(createGalpon())
      await galponRepository.findByName('Galpon A')
      expect(Galpon.findOne).toHaveBeenCalledWith({ where: { name: 'Galpon A' } })
    })
  })

  describe('findByNameAndProfileId', () => {
    it('calls Galpon.findOne with name and profileId', async () => {
      Galpon.findOne.mockResolvedValue(createGalpon())
      await galponRepository.findByNameAndProfileId('Galpon A', 'p1')
      expect(Galpon.findOne).toHaveBeenCalledWith({ where: { name: 'Galpon A', profileId: 'p1' } })
    })
  })

  describe('findAll', () => {
    it('calls Galpon.findAll', async () => {
      Galpon.findAll.mockResolvedValue([createGalpon()])
      expect(await galponRepository.findAll()).toHaveLength(1)
    })
  })

  describe('findByProfileId', () => {
    it('calls Galpon.findAll with profileId', async () => {
      Galpon.findAll.mockResolvedValue([createGalpon()])
      await galponRepository.findByProfileId('p1')
      expect(Galpon.findAll).toHaveBeenCalledWith({ where: { profileId: 'p1' } })
    })
  })

  describe('countByProfileId', () => {
    it('calls Galpon.count', async () => {
      Galpon.count.mockResolvedValue(2)
      expect(await galponRepository.countByProfileId('p1')).toBe(2)
    })
  })

  describe('create', () => {
    it('calls Galpon.create with data', async () => {
      Galpon.create.mockResolvedValue(createGalpon())
      await galponRepository.create({ name: 'Galpon B' })
      expect(Galpon.create).toHaveBeenCalledWith({ name: 'Galpon B' })
    })
  })

  describe('update', () => {
    it('calls galpon.update with data', async () => {
      const galpon = { update: jest.fn() }
      await galponRepository.update(galpon, { name: 'Updated' })
      expect(galpon.update).toHaveBeenCalledWith({ name: 'Updated' })
    })
  })

  describe('delete', () => {
    it('calls galpon.destroy', async () => {
      const galpon = { destroy: jest.fn() }
      await galponRepository.delete(galpon)
      expect(galpon.destroy).toHaveBeenCalledWith()
    })
  })

  describe('findActive', () => {
    it('calls Galpon.findOne with isActive: true', async () => {
      Galpon.findOne.mockResolvedValue(createGalpon({ isActive: true }))
      const result = await galponRepository.findActive()
      expect(Galpon.findOne).toHaveBeenCalledWith({ where: { isActive: true } })
      expect(result.isActive).toBe(true)
    })
  })

  describe('setActive', () => {
    it('deactivates all galpones then activates target', async () => {
      const target = createGalpon({ id: 2, isActive: false, name: 'Galpon B' })
      Galpon.update.mockResolvedValue([1])
      Galpon.findByPk.mockResolvedValue(target)

      const result = await galponRepository.setActive(2)

      expect(Galpon.update).toHaveBeenCalledWith(
        { isActive: false },
        { where: { isActive: true } },
      )
      expect(Galpon.findByPk).toHaveBeenCalledWith(2)
      expect(target.update).toHaveBeenCalledWith({ isActive: true })
      expect(result).toBe(target)
    })
  })
})
