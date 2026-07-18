jest.mock('sequelize', () => ({
  Op: { between: Symbol('between') },
}))

jest.mock('../../../src/common/helpers/repository.helper', () => ({
  buildCommonFilters: jest.fn().mockReturnValue({ whereClause: {}, rabbitWhere: {}, cageWhere: {} }),
}))

jest.mock('../../../src/domain/models', () => ({
  Feeding: {
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  Cage: {},
  Profile: {},
}))

const { Op } = require('sequelize')
const { Feeding } = require('../../../src/domain/models')
const feedingRepository = require('../../../src/modules/feeding/feeding.repository')

describe('FeedingRepository', () => {
  beforeEach(() => { jest.clearAllMocks() })

  describe('findByCageIdAndDate', () => {
    it('calls Feeding.findAll with cageId and date range', async () => {
      Feeding.findAll.mockResolvedValue([{ id: 1 }])
      const date = new Date('2024-06-15')
      const result = await feedingRepository.findByCageIdAndDate(1, date)
      expect(result).toHaveLength(1)
      const callArg = Feeding.findAll.mock.calls[0][0]
      expect(callArg.where.cageId).toBe(1)
      expect(callArg.where.feedingDate).toBeDefined()
    })
  })

  describe('countByUniqueAttributes', () => {
    it('calls Feeding.count with cageId, shift, profileId and date', async () => {
      Feeding.count.mockResolvedValue(1)
      const date = new Date('2024-06-15')
      const result = await feedingRepository.countByUniqueAttributes(1, date, 'mañana', 'p1')
      expect(Feeding.count).toHaveBeenCalled()
      expect(result).toBe(1)
    })
  })

  describe('findByGalponId', () => {
    it('calls Feeding.findAll with includes', async () => {
      Feeding.findAll.mockResolvedValue([{ id: 1 }])
      const result = await feedingRepository.findByGalponId(1, { limit: 10 })
      expect(Feeding.findAll).toHaveBeenCalled()
      expect(result).toHaveLength(1)
    })
  })

  describe('countByGalponId', () => {
    it('calls Feeding.count', async () => {
      Feeding.count.mockResolvedValue(10)
      expect(await feedingRepository.countByGalponId(1)).toBe(10)
    })

    it('includes Cage model when cageType filter is provided', async () => {
      Feeding.count.mockResolvedValue(5)
      await feedingRepository.countByGalponId(1, { cageType: 'engorde' })
      expect(Feeding.count).toHaveBeenCalledWith(
        expect.objectContaining({ include: expect.any(Array) }),
      )
    })
  })

  describe('findAll', () => {
    it('calls Feeding.findAll with includes', async () => {
      Feeding.findAll.mockResolvedValue([{ id: 1 }])
      await feedingRepository.findAll()
      expect(Feeding.findAll).toHaveBeenCalled()
    })
  })

  describe('create', () => {
    it('calls Feeding.create with data', async () => {
      Feeding.create.mockResolvedValue({ id: 1 })
      await feedingRepository.create({ cageId: 1, galponId: 1 })
      expect(Feeding.create).toHaveBeenCalledWith({ cageId: 1, galponId: 1 })
    })
  })
})
