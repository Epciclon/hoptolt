const cron = require('node-cron');
const { Op } = require('sequelize');
const { Reproduction } = require('../../domain/models');

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

            for (const rep of montasToTransition) {
                await rep.update({
                    status: 'gestacion',
                    updatedBySystem: true
                });
            }

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

            for (const rep of gestacionesToTransition) {
                await rep.update({
                    status: 'lactancia',
                    updatedBySystem: true
                });
            }
        } catch (error) {
            // Error silencioso en cron
        }
    });
};

module.exports = startReproductionCron;
