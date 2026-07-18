jest.mock('sequelize', () => ({
  Op: { gte: Symbol('gte') },
}))

jest.mock('../../../src/domain/models', () => ({
  Rabbit: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
}))

const { Op } = require('sequelize')
const { Rabbit } = require('../../../src/domain/models')
const rabbitRepository = require('../../../src/modules/rabbit/rabbit.repository')

const createRabbit = (data = {}) => ({
  id: 1,
  code: 'R001',
  name: 'Bunny',
  ...data,
  update: jest.fn().mockResolvedValue({ ...data }),
  destroy: jest.fn().mockResolvedValue(true),
})

describe('RabbitRepository', () => {
  beforeEach(() => { jest.clearAllMocks() })

  describe('findById', () => {
    it('calls Rabbit.findByPk with id', async () => {
      Rabbit.findByPk.mockResolvedValue(createRabbit())
      const result = await rabbitRepository.findById(1)
      expect(Rabbit.findByPk).toHaveBeenCalledWith(1)
      expect(result).toBeDefined()
    })
  })

  describe('findByCode', () => {
    it('calls Rabbit.findOne with code', async () => {
      Rabbit.findOne.mockResolvedValue(createRabbit())
      await rabbitRepository.findByCode('R001')
      expect(Rabbit.findOne).toHaveBeenCalledWith({ where: { code: 'R001' } })
    })
  })

  describe('findByRace', () => {
    it('calls Rabbit.findAll with race', async () => {
      Rabbit.findAll.mockResolvedValue([createRabbit()])
      const result = await rabbitRepository.findByRace('NZW')
      expect(Rabbit.findAll).toHaveBeenCalledWith({ where: { race: 'NZW' } })
      expect(result).toHaveLength(1)
    })
  })

  describe('findByGalpon', () => {
    it('calls Rabbit.findAll with galponId and merges options', async () => {
      Rabbit.findAll.mockResolvedValue([createRabbit()])
      await rabbitRepository.findByGalpon(1, { where: { sex: 'macho' } })
      expect(Rabbit.findAll).toHaveBeenCalledWith({
        where: { galponId: 1, sex: 'macho' },
      })
    })
  })

  describe('countByGalpon', () => {
    it('calls Rabbit.count with galponId', async () => {
      Rabbit.count.mockResolvedValue(5)
      expect(await rabbitRepository.countByGalpon(1)).toBe(5)
      expect(Rabbit.count).toHaveBeenCalledWith({ where: { galponId: 1 } })
    })
  })

  describe('findByRaceAndGalpon', () => {
    it('calls Rabbit.findAll with race and galponId', async () => {
      Rabbit.findAll.mockResolvedValue([createRabbit()])
      await rabbitRepository.findByRaceAndGalpon('NZW', 1)
      expect(Rabbit.findAll).toHaveBeenCalledWith({ where: { race: 'NZW', galponId: 1 } })
    })
  })

  describe('findByGalponAndSexAndMinAge', () => {
    it('calls Rabbit.findAll with Op.gte on age', async () => {
      Rabbit.findAll.mockResolvedValue([createRabbit()])
      await rabbitRepository.findByGalponAndSexAndMinAge(1, 'hembra', 6)
      expect(Rabbit.findAll).toHaveBeenCalledWith({
        where: { galponId: 1, sex: 'hembra', age: { [Op.gte]: 6 } },
      })
    })
  })

  describe('findAll', () => {
    it('calls Rabbit.findAll', async () => {
      Rabbit.findAll.mockResolvedValue([createRabbit()])
      expect(await rabbitRepository.findAll()).toHaveLength(1)
    })
  })

  describe('create', () => {
    it('calls Rabbit.create with data', async () => {
      Rabbit.create.mockResolvedValue(createRabbit())
      await rabbitRepository.create({ code: 'R002' })
      expect(Rabbit.create).toHaveBeenCalledWith({ code: 'R002' })
    })
  })

  describe('update', () => {
    it('calls rabbit.update with data', async () => {
      const rabbit = createRabbit()
      await rabbitRepository.update(rabbit, { name: 'Updated' })
      expect(rabbit.update).toHaveBeenCalledWith({ name: 'Updated' })
    })
  })

  describe('delete', () => {
    it('calls rabbit.destroy', async () => {
      const rabbit = createRabbit()
      await rabbitRepository.delete(rabbit)
      expect(rabbit.destroy).toHaveBeenCalledWith()
    })
  })
})
