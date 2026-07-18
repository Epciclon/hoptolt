jest.mock('../../../src/common/helpers/repository.helper', () => ({
  buildCommonFilters: jest.fn().mockReturnValue({ whereClause: {}, rabbitWhere: {}, cageWhere: {} }),
  buildRabbitProfileIncludes: jest.fn().mockReturnValue([]),
  buildRabbitCountInclude: jest.fn().mockReturnValue([]),
}))

jest.mock('../../../src/domain/models', () => ({
  Vaccination: {
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
}))

const { Vaccination } = require('../../../src/domain/models')
const vaccinationRepository = require('../../../src/modules/vaccination/vaccination.repository')

describe('VaccinationRepository', () => {
  beforeEach(() => { jest.clearAllMocks() })

  describe('findByGalponId', () => {
    it('calls Vaccination.findAll with includes', async () => {
      Vaccination.findAll.mockResolvedValue([{ id: 1 }])
      const result = await vaccinationRepository.findByGalponId(1)
      expect(Vaccination.findAll).toHaveBeenCalled()
      expect(result).toHaveLength(1)
    })
  })

  describe('countByGalponId', () => {
    it('calls Vaccination.count', async () => {
      Vaccination.count.mockResolvedValue(5)
      expect(await vaccinationRepository.countByGalponId(1)).toBe(5)
    })

    it('includes Rabbit model when races filter is provided', async () => {
      Vaccination.count.mockResolvedValue(3)
      await vaccinationRepository.countByGalponId(1, { races: 'NZW' })
      expect(Vaccination.count).toHaveBeenCalledWith(
        expect.objectContaining({ include: expect.any(Array) }),
      )
    })
  })

  describe('findByRabbitId', () => {
    it('calls Vaccination.findAll with rabbitId', async () => {
      Vaccination.findAll.mockResolvedValue([{ id: 1 }])
      await vaccinationRepository.findByRabbitId('r1')
      expect(Vaccination.findAll).toHaveBeenCalledWith({ where: { rabbitId: 'r1' } })
    })
  })

  describe('findLastVaccinationByRabbitAndVaccine', () => {
    it('returns the last vaccination containing the vaccine', async () => {
      Vaccination.findAll.mockResolvedValue([
        { id: 1, vaccines: ['vacunaA'] },
        { id: 2, vaccines: ['vacunaB'] },
      ])
      const result = await vaccinationRepository.findLastVaccinationByRabbitAndVaccine('r1', 'vacunaA')
      expect(result.id).toBe(1)
    })

    it('returns null when vaccine not found', async () => {
      Vaccination.findAll.mockResolvedValue([{ vaccines: ['vacunaB'] }])
      expect(await vaccinationRepository.findLastVaccinationByRabbitAndVaccine('r1', 'vacunaA')).toBeNull()
    })
  })

  describe('findAll', () => {
    it('calls Vaccination.findAll', async () => {
      Vaccination.findAll.mockResolvedValue([])
      await vaccinationRepository.findAll()
      expect(Vaccination.findAll).toHaveBeenCalledWith()
    })
  })

  describe('create', () => {
    it('calls Vaccination.create with data', async () => {
      Vaccination.create.mockResolvedValue({ id: 1 })
      await vaccinationRepository.create({ rabbitId: 'r1', galponId: 1 })
      expect(Vaccination.create).toHaveBeenCalledWith({ rabbitId: 'r1', galponId: 1 })
    })
  })
})
