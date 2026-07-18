jest.mock('../../../src/domain/models', () => ({
  Cage: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
}))

const { Cage } = require('../../../src/domain/models')
const cageRepository = require('../../../src/modules/cage/cage.repository')

const mockCage = (data = {}) => ({
  id: 1, number: 'J-01', galponId: 1, ...data,
  update: jest.fn().mockResolvedValue({ ...data }),
  destroy: jest.fn().mockResolvedValue(true),
})

describe('CageRepository', () => {
  beforeEach(() => { jest.clearAllMocks() })

  describe('findById', () => {
    it('calls Cage.findOne with id when no galponId', async () => {
      Cage.findOne.mockResolvedValue(mockCage())
      await cageRepository.findById(1)
      expect(Cage.findOne).toHaveBeenCalledWith({ where: { id: 1 } })
    })

    it('calls Cage.findOne with id and galponId', async () => {
      Cage.findOne.mockResolvedValue(mockCage())
      await cageRepository.findById(1, 5)
      expect(Cage.findOne).toHaveBeenCalledWith({ where: { id: 1, galponId: 5 } })
    })
  })

  describe('findByNumberAndGalpon', () => {
    it('calls Cage.findOne with number and galponId', async () => {
      Cage.findOne.mockResolvedValue(mockCage())
      await cageRepository.findByNumberAndGalpon('J-01', 1)
      expect(Cage.findOne).toHaveBeenCalledWith({ where: { number: 'J-01', galponId: 1 } })
    })
  })

  describe('findByGalponId', () => {
    it('calls Cage.findAll with galponId', async () => {
      Cage.findAll.mockResolvedValue([mockCage()])
      await cageRepository.findByGalponId(1)
      expect(Cage.findAll).toHaveBeenCalledWith({ where: { galponId: 1 } })
    })
  })

  describe('countByGalponId', () => {
    it('calls Cage.count with galponId', async () => {
      Cage.count.mockResolvedValue(10)
      expect(await cageRepository.countByGalponId(1)).toBe(10)
    })
  })

  describe('findAll', () => {
    it('calls Cage.findAll', async () => {
      Cage.findAll.mockResolvedValue([mockCage()])
      expect(await cageRepository.findAll()).toHaveLength(1)
    })
  })

  describe('findByStatus', () => {
    it('calls Cage.findAll with status', async () => {
      Cage.findAll.mockResolvedValue([mockCage()])
      await cageRepository.findByStatus('disponible')
      expect(Cage.findAll).toHaveBeenCalledWith({ where: { status: 'disponible' } })
    })
  })

  describe('create', () => {
    it('calls Cage.create with data', async () => {
      Cage.create.mockResolvedValue(mockCage())
      await cageRepository.create({ number: 'J-02', galponId: 1 })
      expect(Cage.create).toHaveBeenCalledWith({ number: 'J-02', galponId: 1 })
    })
  })

  describe('update', () => {
    it('calls cage.update with data', async () => {
      const cage = mockCage()
      await cageRepository.update(cage, { number: 'J-03' })
      expect(cage.update).toHaveBeenCalledWith({ number: 'J-03' })
    })
  })

  describe('delete', () => {
    it('calls cage.destroy', async () => {
      const cage = mockCage()
      await cageRepository.delete(cage)
      expect(cage.destroy).toHaveBeenCalledWith()
    })
  })
})
