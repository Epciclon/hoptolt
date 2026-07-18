jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}))

jest.mock('sequelize', () => ({
  Op: { lte: Symbol('lte') },
}))

jest.mock('../../src/domain/models', () => ({
  Reproduction: {
    findAll: jest.fn(),
  },
}))

jest.mock('../../src/common/helpers/reproductionNotification.helper', () => ({
  notifyAutomatedPhaseChange: jest.fn().mockResolvedValue(undefined),
}))

const cron = require('node-cron')
const { Reproduction } = require('../../src/domain/models')
const { notifyAutomatedPhaseChange } = require('../../src/common/helpers/reproductionNotification.helper')
const startReproductionCron = require('../../src/infrastructure/crons/reproduction.cron')

describe('ReproductionCron', () => {
  let cronCallback

  beforeEach(() => {
    jest.clearAllMocks()
    startReproductionCron()
    ;[[, cronCallback]] = cron.schedule.mock.calls
  })

  describe('monta to gestacion transition', () => {
    it('advances records that are >= 24h old', async () => {
      const montaRep = { id: 1, status: 'monta', update: jest.fn().mockResolvedValue({}) }
      Reproduction.findAll
        .mockResolvedValueOnce([montaRep])
        .mockResolvedValueOnce([])

      await cronCallback()

      expect(Reproduction.findAll).toHaveBeenCalledTimes(2)
      expect(montaRep.update).toHaveBeenCalledWith({
        status: 'gestacion',
        updatedBySystem: true,
      })
      expect(notifyAutomatedPhaseChange).toHaveBeenCalledWith(montaRep, 2, 'Gestación')
    })
  })

  describe('gestacion to lactancia transition', () => {
    it('advances records that are >= 31 days old', async () => {
      const gestacionRep = { id: 2, status: 'gestacion', update: jest.fn().mockResolvedValue({}) }
      Reproduction.findAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([gestacionRep])

      await cronCallback()

      expect(gestacionRep.update).toHaveBeenCalledWith({
        status: 'lactancia',
        updatedBySystem: true,
      })
      expect(notifyAutomatedPhaseChange).toHaveBeenCalledWith(gestacionRep, 3, 'Lactancia')
    })
  })

  describe('threshold boundary', () => {
    it('does not advance records when none meet the threshold', async () => {
      Reproduction.findAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      await cronCallback()

      expect(notifyAutomatedPhaseChange).not.toHaveBeenCalled()
    })
  })

  describe('notifications', () => {
    it('sends a notification for each phase change', async () => {
      const rep1 = { id: 1, status: 'monta', update: jest.fn().mockResolvedValue({}) }
      const rep2 = { id: 3, status: 'monta', update: jest.fn().mockResolvedValue({}) }
      Reproduction.findAll
        .mockResolvedValueOnce([rep1, rep2])
        .mockResolvedValueOnce([])

      await cronCallback()

      expect(notifyAutomatedPhaseChange).toHaveBeenCalledTimes(2)
      expect(notifyAutomatedPhaseChange).toHaveBeenCalledWith(rep1, 2, 'Gestación')
      expect(notifyAutomatedPhaseChange).toHaveBeenCalledWith(rep2, 2, 'Gestación')
    })
  })

  describe('error handling', () => {
    it('catches errors without crashing', async () => {
      Reproduction.findAll.mockRejectedValueOnce(new Error('DB error'))
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      await cronCallback()

      expect(consoleSpy).toHaveBeenCalledWith('Error en el cron de reproducción:', 'DB error')
      consoleSpy.mockRestore()
    })
  })
})
