jest.mock('sequelize', () => ({
  Op: { in: Symbol('in') },
}))

jest.mock('../../../src/common/helpers/repository.helper', () => ({
  buildCommonFilters: jest.fn().mockReturnValue({ whereClause: {}, rabbitWhere: {}, cageWhere: {} }),
}))

jest.mock('../../../src/domain/models', () => ({
  Cleaning: {
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  Profile: {},
}))

const { Op } = require('sequelize')
const { Cleaning } = require('../../../src/domain/models')
const cleaningRepository = require('../../../src/modules/cleaning/cleaning.repository')

describe('CleaningRepository', () => {
  beforeEach(() => { jest.clearAllMocks() })

  describe('findByGalponId', () => {
    it('calls Cleaning.findAll with includes', async () => {
      Cleaning.findAll.mockResolvedValue([{ id: 1 }])
      const result = await cleaningRepository.findByGalponId(1)
      expect(Cleaning.findAll).toHaveBeenCalled()
      expect(result).toHaveLength(1)
    })

    it('filters by cageIds when provided', async () => {
      Cleaning.findAll.mockResolvedValue([{ id: 1 }])
      await cleaningRepository.findByGalponId(1, {}, [1, 2, 3])
      const callArg = Cleaning.findAll.mock.calls[0][0]
      expect(callArg.where.galponId).toBe(1)
      expect(callArg.where.cageId).toBeDefined()
    })
  })

  describe('countByGalponId', () => {
    it('calls Cleaning.count', async () => {
      Cleaning.count.mockResolvedValue(8)
      expect(await cleaningRepository.countByGalponId(1)).toBe(8)
    })

    it('filters by cageIds when provided', async () => {
      Cleaning.count.mockResolvedValue(5)
      await cleaningRepository.countByGalponId(1, [1, 2])
      const callArg = Cleaning.count.mock.calls[0][0]
      expect(callArg.where.cageId).toBeDefined()
    })

    it('includes Cage model when cageType filter is provided', async () => {
      Cleaning.count.mockResolvedValue(3)
      await cleaningRepository.countByGalponId(1, null, { cageType: 'engorde' })
      expect(Cleaning.count).toHaveBeenCalledWith(
        expect.objectContaining({ include: expect.any(Array) }),
      )
    })
  })

  describe('findAll', () => {
    it('calls Cleaning.findAll', async () => {
      Cleaning.findAll.mockResolvedValue([{ id: 1 }])
      await cleaningRepository.findAll()
      expect(Cleaning.findAll).toHaveBeenCalledWith()
    })
  })

  describe('create', () => {
    it('calls Cleaning.create with data', async () => {
      Cleaning.create.mockResolvedValue({ id: 1 })
      await cleaningRepository.create({ galponId: 1, cageId: 1 })
      expect(Cleaning.create).toHaveBeenCalledWith({ galponId: 1, cageId: 1 })
    })
  })
})
