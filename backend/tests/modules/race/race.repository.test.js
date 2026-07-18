jest.mock('../../../src/domain/models', () => ({
  Race: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
}))

const { Race } = require('../../../src/domain/models')
const raceRepository = require('../../../src/modules/race/race.repository')

const mockRace = { id: 1, name: 'NZW', profileId: 'p1', galponId: 1, update: jest.fn(), destroy: jest.fn() }

describe('RaceRepository', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('findById calls Race.findByPk', async () => {
    Race.findByPk.mockResolvedValue(mockRace)
    expect(await raceRepository.findById(1)).toBe(mockRace)
    expect(Race.findByPk).toHaveBeenCalledWith(1)
  })

  it('findByName calls Race.findOne with name', async () => {
    Race.findOne.mockResolvedValue(mockRace)
    await raceRepository.findByName('NZW')
    expect(Race.findOne).toHaveBeenCalledWith({ where: { name: 'NZW' } })
  })

  it('findByNameAndProfile calls Race.findOne with name and profileId', async () => {
    Race.findOne.mockResolvedValue(mockRace)
    await raceRepository.findByNameAndProfile('NZW', 'p1')
    expect(Race.findOne).toHaveBeenCalledWith({ where: { name: 'NZW', profileId: 'p1' } })
  })

  it('findByProfile calls Race.findAll with profileId', async () => {
    Race.findAll.mockResolvedValue([mockRace])
    const result = await raceRepository.findByProfile('p1')
    expect(Race.findAll).toHaveBeenCalledWith({ where: { profileId: 'p1' } })
    expect(result).toHaveLength(1)
  })

  it('countByProfile calls Race.count', async () => {
    Race.count.mockResolvedValue(3)
    expect(await raceRepository.countByProfile('p1')).toBe(3)
  })

  it('findByNameAndGalpon calls Race.findOne with name and galponId', async () => {
    Race.findOne.mockResolvedValue(mockRace)
    await raceRepository.findByNameAndGalpon('NZW', 1)
    expect(Race.findOne).toHaveBeenCalledWith({ where: { name: 'NZW', galponId: 1 } })
  })

  it('findByGalpon calls Race.findAll with galponId', async () => {
    Race.findAll.mockResolvedValue([mockRace])
    await raceRepository.findByGalpon(1)
    expect(Race.findAll).toHaveBeenCalledWith({ where: { galponId: 1 } })
  })

  it('findAll calls Race.findAll', async () => {
    Race.findAll.mockResolvedValue([mockRace])
    expect(await raceRepository.findAll()).toHaveLength(1)
  })

  it('create calls Race.create with data', async () => {
    Race.create.mockResolvedValue(mockRace)
    await raceRepository.create({ name: 'CAL' })
    expect(Race.create).toHaveBeenCalledWith({ name: 'CAL' })
  })

  it('update calls race.update with data', async () => {
    const race = { update: jest.fn() }
    await raceRepository.update(race, { name: 'CAL' })
    expect(race.update).toHaveBeenCalledWith({ name: 'CAL' })
  })

  it('delete calls race.destroy', async () => {
    const race = { destroy: jest.fn() }
    await raceRepository.delete(race)
    expect(race.destroy).toHaveBeenCalledWith()
  })
})
