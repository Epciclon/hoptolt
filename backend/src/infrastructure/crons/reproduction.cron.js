const cron = require('node-cron');
const { Op } = require('sequelize');
const { Reproduction } = require('../../domain/models');

const processMontaToGestacion = async (rep) => {
    const { notifyAutomatedPhaseChange } = require('../../common/helpers/reproductionNotification.helper');
    const { recordSystemChange } = require('../../common/helpers/audit.helper');
    const reproductionRepository = require('../../modules/reproduction/reproduction.repository');

    await rep.update({
        status: 'gestacion',
        updatedBySystem: true
    });
    await notifyAutomatedPhaseChange(rep, 2, 'Gestación');

    const fullRep = await reproductionRepository.findByIdWithDetails(rep.id);
    const code = fullRep?.female?.code || 'Coneja';
    const femaleLabel = fullRep?.female?.name ? `${fullRep.female.name} - ${code}` : code;

    await recordSystemChange({
        galponId: rep.galponId,
        action: 'Paso a gestación',
        entity: 'reproduction',
        entityId: rep.id,
        itemName: femaleLabel,
        summary: `HopTolt avanzó automáticamente a la coneja ${femaleLabel} a Fase 2 Gestación tras cumplirse 24 horas de la monta`
    });
};

const processGestacionToLactancia = async (rep) => {
    const { notifyAutomatedPhaseChange } = require('../../common/helpers/reproductionNotification.helper');
    const { recordSystemChange } = require('../../common/helpers/audit.helper');
    const reproductionRepository = require('../../modules/reproduction/reproduction.repository');

    await rep.update({
        status: 'lactancia',
        updatedBySystem: true
    });
    await notifyAutomatedPhaseChange(rep, 3, 'Lactancia');

    const fullRep = await reproductionRepository.findByIdWithDetails(rep.id);
    const code = fullRep?.female?.code || 'Coneja';
    const femaleLabel = fullRep?.female?.name ? `${fullRep.female.name} - ${code}` : code;

    await recordSystemChange({
        galponId: rep.galponId,
        action: 'Paso a lactancia',
        entity: 'reproduction',
        entityId: rep.id,
        itemName: femaleLabel,
        summary: `HopTolt avanzó automáticamente a la coneja ${femaleLabel} a Fase 3 Lactancia tras cumplirse 31 días de gestación estimada`
    });
};

// Correr cada hora ('0 * * * *')
const startReproductionCron = () => {
    cron.schedule('0 * * * *', async () => {
        try {
            const now = new Date();

            // 1. Fase 1 a Fase 2 (Monta a Gestación) - Producción: 24 horas
            const threshold1 = new Date(now.getTime() - (24 * 60 * 60 * 1000));

            const montasToTransition = await Reproduction.findAll({
                where: {
                    status: 'monta',
                    mountDate: {
                        [Op.lte]: threshold1
                    }
                }
            });

            await Promise.all(montasToTransition.map(rep => processMontaToGestacion(rep)));

            // 2. Fase 2 a Fase 3 (Gestación a Lactancia) - Producción: 31 días desde mountDate
            const threshold2 = new Date(now.getTime() - (31 * 24 * 60 * 60 * 1000));

            const gestacionesToTransition = await Reproduction.findAll({
                where: {
                    status: 'gestacion',
                    mountDate: {
                        [Op.lte]: threshold2
                    }
                }
            });

            await Promise.all(gestacionesToTransition.map(rep => processGestacionToLactancia(rep)));
        } catch (error) {
            console.error('Error en el cron de reproducción:', error.message);
        }
    });
};

module.exports = startReproductionCron;
