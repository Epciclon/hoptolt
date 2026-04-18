const Deworming = require('../models/deworming');

exports.registerDeworming = async (req, res) => {
    try {
        const { codigo, desparasitacion } = req.body;

        // Validaciones básicas
        if (!codigo) {
            return res.status(400).json({ 
                message: 'El código del conejo es obligatorio' 
            });
        }

        if (!desparasitacion) {
            return res.status(400).json({ 
                message: 'Debe seleccionar la desparasitación para poder realizar el registro' 
            });
        }

        // Obtener última desparasitación del conejo
        const lastDeworming = await Deworming.findOne({ codigo }).sort({ fecha: -1 });

        const now = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);

        // Validar restricción de un mes
        if (lastDeworming && lastDeworming.lastDewormingDate) {
            if (lastDeworming.lastDewormingDate > oneMonthAgo) {
                const lastDate = lastDeworming.lastDewormingDate.toLocaleDateString('es-ES');
                return res.status(400).json({ 
                    message: `${codigo}: Debe pasar un mes para poder ingresar otra desparasitación. Último registro: ${lastDate}` 
                });
            }
        }

        // Crear nuevo registro de desparasitación
        const newDeworming = new Deworming({
            codigo,
            desparasitacion: !!desparasitacion,
            fecha: now,
            lastDewormingDate: now
        });

        await newDeworming.save();

        res.status(201).json({ 
            message: 'Se registró el control de desparasitación',
            deworming: newDeworming
        });

    } catch (error) {
        console.error('Error al registrar desparasitación:', error);
        res.status(500).json({ 
            message: 'No se pudo registrar la desparasitación. Intente nuevamente.' 
        });
    }
};

exports.checkDewormingValidations = async (req, res) => {
    try {
        const { rabbits } = req.body;
        
        if (!rabbits || !Array.isArray(rabbits)) {
            return res.status(400).json({ 
                message: 'Se requiere un array de códigos de conejos' 
            });
        }

        const validationResults = {};
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        for (const codigo of rabbits) {
            const lastDeworming = await Deworming.findOne({ codigo }).sort({ fecha: -1 });
            
            validationResults[codigo] = {
                canReceiveDeworming: true,
                lastDeworming: null
            };

            if (lastDeworming && lastDeworming.lastDewormingDate) {
                if (lastDeworming.lastDewormingDate > oneMonthAgo) {
                    validationResults[codigo].canReceiveDeworming = false;
                    validationResults[codigo].lastDeworming = lastDeworming.lastDewormingDate;
                }
            }
        }

        res.json({ validations: validationResults });
        
    } catch (error) {
        console.error('Error al verificar validaciones de desparasitación:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor al verificar validaciones' 
        });
    }
};

exports.getDewormingStatus = async (req, res) => {
    try {
        const { rabbits } = req.body;
        
        if (!rabbits || !Array.isArray(rabbits)) {
            return res.status(400).json({ 
                message: 'Se requiere un array de códigos de conejos' 
            });
        }

        const statusResults = {};
        
        for (const codigo of rabbits) {
            const lastDeworming = await Deworming.findOne({ codigo }).sort({ fecha: -1 });
            
            statusResults[codigo] = {
                hasDeworming: !!lastDeworming,
                lastDeworming: lastDeworming?.lastDewormingDate || null
            };
        }

        res.json({ status: statusResults });
        
    } catch (error) {
        console.error('Error al obtener estado de desparasitaciones:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor al obtener estado de desparasitaciones' 
        });
    }
};
