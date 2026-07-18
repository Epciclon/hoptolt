jest.mock('../../../src/common/helpers/repository.helper', () => ({
  buildCommonFilters: jest.fn().mockReturnValue({ whereClause: {}, rabbitWhere: {}, cageWhere: {} }),
  buildRabbitProfileIncludes: jest.fn().mockReturnValue([]),
  buildRabbitCountInclude: jest.fn().mockReturnValue([]),
}))

jest.mock('../../../src/domain/models', () => ({
  Deworming: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
}))

const { Deworming } = require('../../../src/domain/models')
const dewormingRepository = require('../../../src/modules/deworming/deworming.repository')

describe('DewormingRepository', () => {
  beforeEach(() => { jest.clearAllMocks() })

  describe('findByGalponId', () => {
    it('calls Deworming.findAll with includes', async () => {
      Deworming.findAll.mockResolvedValue([{ id: 1 }])
      const result = await dewormingRepository.findByGalponId(1)
      expect(Deworming.findAll).toHaveBeenCalled()
      expect(result).toHaveLength(1)
    })
  })

  describe('countByGalponId', () => {
    it('calls Deworming.count', async () => {
      Deworming.count.mockResolvedValue(5)
      expect(await dewormingRepository.countByGalponId(1)).toBe(5)
    })

    it('includes Rabbit model when races filter is provided', async () => {
      Deworming.count.mockResolvedValue(2)
      await dewormingRepository.countByGalponId(1, { races: 'NZW' })
      expect(Deworming.count).toHaveBeenCalledWith(
        expect.objectContaining({ include: expect.any(Array) }),
      )
    })
  })

  describe('findByRabbitId', () => {
    it('calls Deworming.findAll with rabbitId', async () => {
      Deworming.findAll.mockResolvedValue([{ id: 1 }])
      await dewormingRepository.findByRabbitId('r1')
      expect(Deworming.findAll).toHaveBeenCalledWith({ where: { rabbitId: 'r1' } })
    })
  })

  describe('findLastDewormingByRabbit', () => {
    it('calls Deworming.findOne ordered by date DESC', async () => {
      Deworming.findOne.mockResolvedValue({ id: 1 })
      await dewormingRepository.findLastDewormingByRabbit('r1')
      expect(Deworming.findOne).toHaveBeenCalledWith({
        where: { rabbitId: 'r1' },
        order: [['dewormingDate', 'DESC']],
      })
    })
  })

  describe('findAll', () => {
    it('calls Deworming.findAll', async () => {
      Deworming.findAll.mockResolvedValue([])
      await dewormingRepository.findAll()
      expect(Deworming.findAll).toHaveBeenCalledWith()
    })
  })

  describe('create', () => {
    it('calls Deworming.create with data', async () => {
      Deworming.create.mockResolvedValue({ id: 1 })
      await dewormingRepository.create({ rabbitId: 'r1', galponId: 1 })
      expect(Deworming.create).toHaveBeenCalledWith({ rabbitId: 'r1', galponId: 1 })
    })
  })
})
