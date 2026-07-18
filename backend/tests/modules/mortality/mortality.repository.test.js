jest.mock('../../../src/common/helpers/repository.helper', () => ({
  buildCommonFilters: jest.fn().mockReturnValue({ whereClause: {}, rabbitWhere: {}, cageWhere: {} }),
}))

jest.mock('../../../src/domain/models', () => ({
  Mortality: {
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  Rabbit: {},
  Profile: {},
}))

const { Mortality } = require('../../../src/domain/models')
const mortalityRepository = require('../../../src/modules/mortality/mortality.repository')

describe('MortalityRepository', () => {
  beforeEach(() => { jest.clearAllMocks() })

  describe('findByGalponId', () => {
    it('calls Mortality.findAll with includes', async () => {
      Mortality.findAll.mockResolvedValue([{ id: 1 }])
      const result = await mortalityRepository.findByGalponId(1)
      expect(Mortality.findAll).toHaveBeenCalled()
      expect(result).toHaveLength(1)
    })

    it('filters by profileId and isKits when provided', async () => {
      Mortality.findAll.mockResolvedValue([{ id: 1 }])
      await mortalityRepository.findByGalponId(1, {}, 'p1', true)
      const callArg = Mortality.findAll.mock.calls[0][0]
      expect(callArg.where.profileId).toBe('p1')
      expect(callArg.where.isKits).toBe(true)
    })
  })

  describe('countByGalponId', () => {
    it('calls Mortality.count', async () => {
      Mortality.count.mockResolvedValue(3)
      expect(await mortalityRepository.countByGalponId(1)).toBe(3)
    })

    it('includes Rabbit model when races filter is provided', async () => {
      Mortality.count.mockResolvedValue(2)
      await mortalityRepository.countByGalponId(1, null, null, { races: 'NZW' })
      expect(Mortality.count).toHaveBeenCalledWith(
        expect.objectContaining({ include: expect.any(Array) }),
      )
    })
  })

  describe('findAll', () => {
    it('calls Mortality.findAll', async () => {
      Mortality.findAll.mockResolvedValue([{ id: 1 }])
      await mortalityRepository.findAll()
      expect(Mortality.findAll).toHaveBeenCalledWith()
    })
  })

  describe('create', () => {
    it('calls Mortality.create with data', async () => {
      Mortality.create.mockResolvedValue({ id: 1 })
      await mortalityRepository.create({ galponId: 1, rabbitId: 'r1' })
      expect(Mortality.create).toHaveBeenCalledWith({ galponId: 1, rabbitId: 'r1' })
    })
  })
})
