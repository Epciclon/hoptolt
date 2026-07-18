jest.mock('../../../src/domain/models', () => ({
  Genealogy: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
  Rabbit: {},
}))

const { Genealogy } = require('../../../src/domain/models')
const genealogyRepository = require('../../../src/modules/genealogy/genealogy.repository')

describe('GenealogyRepository', () => {
  beforeEach(() => { jest.clearAllMocks() })

  describe('findByRabbitId', () => {
    it('calls Genealogy.findOne with rabbitId and includes', async () => {
      Genealogy.findOne.mockResolvedValue({ id: 1 })
      const result = await genealogyRepository.findByRabbitId('r1')
      expect(Genealogy.findOne).toHaveBeenCalledWith({
        where: { rabbitId: 'r1' },
        include: expect.any(Array),
      })
      expect(result).toBeDefined()
    })
  })

  describe('findByGalponId', () => {
    it('calls Genealogy.findAll with galponId and includes', async () => {
      Genealogy.findAll.mockResolvedValue([{ id: 1 }])
      const result = await genealogyRepository.findByGalponId(1)
      expect(Genealogy.findAll).toHaveBeenCalledWith({
        where: { galponId: 1 },
        include: expect.any(Array),
      })
      expect(result).toHaveLength(1)
    })
  })

  describe('findAll', () => {
    it('calls Genealogy.findAll with includes', async () => {
      Genealogy.findAll.mockResolvedValue([{ id: 1 }])
      const result = await genealogyRepository.findAll()
      expect(Genealogy.findAll).toHaveBeenCalledWith({ include: expect.any(Array) })
      expect(result).toHaveLength(1)
    })
  })

  describe('create', () => {
    it('calls Genealogy.create with data', async () => {
      Genealogy.create.mockResolvedValue({ id: 1 })
      await genealogyRepository.create({ rabbitId: 'r1', fatherId: 'f1' })
      expect(Genealogy.create).toHaveBeenCalledWith({ rabbitId: 'r1', fatherId: 'f1' })
    })
  })

  describe('update', () => {
    it('calls genealogy.update with data', async () => {
      const genealogy = { update: jest.fn().mockResolvedValue({}) }
      await genealogyRepository.update(genealogy, { motherId: 'm1' })
      expect(genealogy.update).toHaveBeenCalledWith({ motherId: 'm1' })
    })
  })

  describe('delete', () => {
    it('calls genealogy.destroy', async () => {
      const genealogy = { destroy: jest.fn().mockResolvedValue(true) }
      await genealogyRepository.delete(genealogy)
      expect(genealogy.destroy).toHaveBeenCalledWith()
    })
  })
})
