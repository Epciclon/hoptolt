jest.mock('../../../src/domain/models', () => ({
  Assignment: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  Rabbit: {},
  Cage: {},
}))

const { Assignment } = require('../../../src/domain/models')
const assignmentRepository = require('../../../src/modules/assignment/assignment.repository')

describe('AssignmentRepository', () => {
  beforeEach(() => { jest.clearAllMocks() })

  describe('findById', () => {
    it('calls Assignment.findByPk', async () => {
      Assignment.findByPk.mockResolvedValue({ id: 1 })
      expect(await assignmentRepository.findById(1)).toBeDefined()
    })
  })

  describe('findActiveByRabbitId', () => {
    it('calls Assignment.findOne with rabbitId and status asignado', async () => {
      Assignment.findOne.mockResolvedValue({ id: 1 })
      await assignmentRepository.findActiveByRabbitId('r1')
      expect(Assignment.findOne).toHaveBeenCalledWith({
        where: { rabbitId: 'r1', status: 'asignado' },
      })
    })
  })

  describe('findActiveByRabbitCode', () => {
    it('calls Assignment.findOne with rabbitCode and status asignado', async () => {
      Assignment.findOne.mockResolvedValue({ id: 1 })
      await assignmentRepository.findActiveByRabbitCode('R001')
      expect(Assignment.findOne).toHaveBeenCalledWith({
        where: { rabbitCode: 'R001', status: 'asignado' },
      })
    })
  })

  describe('countActiveByCageNumber', () => {
    it('calls Assignment.count with cageNumber and status asignado', async () => {
      Assignment.count.mockResolvedValue(3)
      expect(await assignmentRepository.countActiveByCageNumber('J-01')).toBe(3)
      expect(Assignment.count).toHaveBeenCalledWith({
        where: { cageNumber: 'J-01', status: 'asignado' },
      })
    })
  })

  describe('countActiveByCageId', () => {
    it('calls Assignment.count with cageId and status asignado', async () => {
      Assignment.count.mockResolvedValue(2)
      expect(await assignmentRepository.countActiveByCageId(1)).toBe(2)
    })
  })

  describe('findActiveByCageId', () => {
    it('calls Assignment.findAll with cageId and status asignado', async () => {
      Assignment.findAll.mockResolvedValue([{ id: 1 }])
      await assignmentRepository.findActiveByCageId(1)
      expect(Assignment.findAll).toHaveBeenCalledWith({
        where: { cageId: 1, status: 'asignado' },
      })
    })
  })

  describe('findAllActive', () => {
    it('calls Assignment.findAll with status asignado', async () => {
      Assignment.findAll.mockResolvedValue([{ id: 1 }])
      await assignmentRepository.findAllActive()
      expect(Assignment.findAll).toHaveBeenCalledWith({ where: { status: 'asignado' } })
    })
  })

  describe('findByGalponId', () => {
    it('includes Rabbit and Cage models', async () => {
      Assignment.findAll.mockResolvedValue([{ id: 1 }])
      await assignmentRepository.findByGalponId(1)
      expect(Assignment.findAll).toHaveBeenCalledWith({
        where: { galponId: 1, status: 'asignado' },
        include: expect.any(Array),
      })
    })
  })

  describe('findAll', () => {
    it('calls Assignment.findAll', async () => {
      Assignment.findAll.mockResolvedValue([{ id: 1 }])
      expect(await assignmentRepository.findAll()).toHaveLength(1)
    })
  })

  describe('create', () => {
    it('calls Assignment.create with data', async () => {
      Assignment.create.mockResolvedValue({ id: 1 })
      await assignmentRepository.create({ rabbitId: 'r1', cageId: 1 })
      expect(Assignment.create).toHaveBeenCalledWith({ rabbitId: 'r1', cageId: 1 })
    })
  })

  describe('update', () => {
    it('calls assignment.update with data', async () => {
      const assignment = { update: jest.fn() }
      await assignmentRepository.update(assignment, { status: 'inactivo' })
      expect(assignment.update).toHaveBeenCalledWith({ status: 'inactivo' })
    })
  })

  describe('delete', () => {
    it('calls assignment.destroy', async () => {
      const assignment = { destroy: jest.fn() }
      await assignmentRepository.delete(assignment)
      expect(assignment.destroy).toHaveBeenCalledWith()
    })
  })
})
