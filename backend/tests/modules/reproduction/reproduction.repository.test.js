jest.mock('sequelize', () => ({
  Op: {
    gte: Symbol('gte'), lte: Symbol('lte'), in: Symbol('in'),
    or: Symbol('or'), iLike: Symbol('iLike'), between: Symbol('between'),
  },
}))

jest.mock('../../../src/common/helpers/repository.helper', () => ({
  buildCommonFilters: jest.fn().mockReturnValue({ whereClause: {}, rabbitWhere: {}, cageWhere: {} }),
}))

jest.mock('../../../src/domain/models', () => ({
  Reproduction: {
    findAll: jest.fn(), findOne: jest.fn(), findByPk: jest.fn(), count: jest.fn(), create: jest.fn(),
  },
  Rabbit: {}, Assignment: {}, Cage: {}, Profile: {},
}))

const { Reproduction } = require('../../../src/domain/models')
const reproductionRepository = require('../../../src/modules/reproduction/reproduction.repository')

describe('ReproductionRepository', () => {
  beforeEach(() => { jest.clearAllMocks() })

  describe('findLactatingFemaleIds', () => {
    it('returns a Set of femaleIds with status lactancia', async () => {
      Reproduction.findAll.mockResolvedValue([
        { femaleId: 'f1' }, { femaleId: 'f2' }, { femaleId: 'f1' },
      ])
      const result = await reproductionRepository.findLactatingFemaleIds(1)
      expect(Reproduction.findAll).toHaveBeenCalledWith({
        where: { galponId: 1, status: 'lactancia' },
        attributes: ['femaleId'],
      })
      expect(result).toEqual(new Set(['f1', 'f2']))
    })
  })

  describe('findActiveMountByFemaleId', () => {
    it('calls findOne with femaleId and date filter', async () => {
      Reproduction.findOne.mockResolvedValue({ id: 1 })
      const result = await reproductionRepository.findActiveMountByFemaleId('f1')
      expect(Reproduction.findOne).toHaveBeenCalled()
      expect(result).toBeDefined()
    })
  })

  describe('findByGalponId', () => {
    it('calls Reproduction.findAll with includes', async () => {
      Reproduction.findAll.mockResolvedValue([{ id: 1 }])
      const result = await reproductionRepository.findByGalponId(1, { limit: 10 })
      expect(Reproduction.findAll).toHaveBeenCalled()
      expect(result).toHaveLength(1)
    })

    it('passes status filter when provided', async () => {
      Reproduction.findAll.mockResolvedValue([{ id: 1 }])
      await reproductionRepository.findByGalponId(1, { status: 'monta' })
      const callArg = Reproduction.findAll.mock.calls[0][0]
      expect(callArg.where.status).toBe('monta')
    })

    it('passes search filter when provided', async () => {
      Reproduction.findAll.mockResolvedValue([{ id: 1 }])
      await reproductionRepository.findByGalponId(1, { search: 'Bunny' })
      const callArg = Reproduction.findAll.mock.calls[0][0]
      expect(callArg.where.galponId).toBe(1)
    })
  })

  describe('countByGalponId', () => {
    it('calls Reproduction.count', async () => {
      Reproduction.count.mockResolvedValue(8)
      expect(await reproductionRepository.countByGalponId(1)).toBe(8)
    })
  })

  describe('findById', () => {
    it('calls Reproduction.findByPk', async () => {
      Reproduction.findByPk.mockResolvedValue({ id: 1 })
      expect(await reproductionRepository.findById(1)).toEqual({ id: 1 })
    })
  })

  describe('findByIdWithDetails', () => {
    it('calls Reproduction.findByPk with includes', async () => {
      Reproduction.findByPk.mockResolvedValue({ id: 1 })
      await reproductionRepository.findByIdWithDetails(1)
      expect(Reproduction.findByPk).toHaveBeenCalledWith(1, expect.objectContaining({
        include: expect.any(Array),
      }))
    })
  })

  describe('findByMonthAndGalpon', () => {
    it('filters out completed statuses', async () => {
      Reproduction.findAll.mockResolvedValue([
        { status: 'monta' }, { status: 'gestacion' }, { status: 'completado' },
      ])
      const result = await reproductionRepository.findByMonthAndGalpon(1, 2024, 6)
      expect(result).toHaveLength(2)
      expect(result.every(r => ['monta', 'gestacion'].includes(r.status))).toBe(true)
    })
  })

  describe('findByDayAndGalpon', () => {
    it('filters out completed statuses', async () => {
      Reproduction.findAll.mockResolvedValue([
        { status: 'monta' }, { status: 'lactancia' },
      ])
      const result = await reproductionRepository.findByDayAndGalpon(1, 2024, 6, 15)
      expect(result).toHaveLength(1)
    })
  })

  describe('findAll', () => {
    it('calls Reproduction.findAll', async () => {
      Reproduction.findAll.mockResolvedValue([])
      await reproductionRepository.findAll()
      expect(Reproduction.findAll).toHaveBeenCalledWith({})
    })
  })

  describe('create', () => {
    it('calls Reproduction.create with data', async () => {
      Reproduction.create.mockResolvedValue({ id: 1 })
      const result = await reproductionRepository.create({ femaleId: 'f1', galponId: 1 })
      expect(Reproduction.create).toHaveBeenCalledWith({ femaleId: 'f1', galponId: 1 })
      expect(result.id).toBe(1)
    })
  })
})
