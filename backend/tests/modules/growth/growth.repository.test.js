jest.mock('sequelize', () => ({
  Op: { in: Symbol('in') },
}))

jest.mock('../../../src/domain/models', () => ({
  Growth: {
    findAll: jest.fn(),
    create: jest.fn(),
  },
}))

const { Op } = require('sequelize')
const { Growth } = require('../../../src/domain/models')
const growthRepository = require('../../../src/modules/growth/growth.repository')

describe('GrowthRepository', () => {
  beforeEach(() => { jest.clearAllMocks() })

  describe('findByRabbitCodes', () => {
    it('calls Growth.findAll with Op.in on rabbitCode', async () => {
      Growth.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }])
      const result = await growthRepository.findByRabbitCodes(['R001', 'R002'])
      expect(Growth.findAll).toHaveBeenCalledWith({
        where: { rabbitCode: { [Op.in]: ['R001', 'R002'] } },
      })
      expect(result).toHaveLength(2)
    })
  })

  describe('findAll', () => {
    it('calls Growth.findAll', async () => {
      Growth.findAll.mockResolvedValue([{ id: 1 }])
      expect(await growthRepository.findAll()).toHaveLength(1)
    })
  })

  describe('create', () => {
    it('calls Growth.create with data', async () => {
      Growth.create.mockResolvedValue({ id: 1 })
      await growthRepository.create({ rabbitCode: 'R001', weight: 2.5 })
      expect(Growth.create).toHaveBeenCalledWith({ rabbitCode: 'R001', weight: 2.5 })
    })
  })
})
