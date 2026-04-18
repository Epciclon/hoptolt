const Vaccination = require('../models/vaccination');

exports.registerVaccination = async (req, res) => {
    try {
        const { codigo, mixomatosis, vhd } = req.body;

        // Validaciones básicas
        if (!codigo) {
            return res.status(400).json({ 
                message: 'El código del conejo es obligatorio' 
            });
        }

        if (!mixomatosis && !vhd) {
            return res.status(400).json({ 
                message: 'Debe seleccionar al menos una vacuna para poder realizar el registro' 
            });
        }

        // Obtener última vacunación del conejo
        const lastVaccination = await Vaccination.findOne({ codigo }).sort({ fecha: -1 });

        const now = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(now.getFullYear() - 1);

        // Validar restricción de un año para mixomatosis
        if (mixomatosis && lastVaccination && lastVaccination.lastMixomatosisDate) {
            if (lastVaccination.lastMixomatosisDate > oneYearAgo) {
                const lastDate = lastVaccination.lastMixomatosisDate.toLocaleDateString('es-ES');
                return res.status(400).json({ 
                    message: `Debe pasar un año para poder ingresar otra vacuna de mixomatosis. Último registro: ${lastDate} - Código: ${codigo}` 
                });
            }
        }

        // Validar restricción de un año para VHD
        if (vhd && lastVaccination && lastVaccination.lastVhdDate) {
            if (lastVaccination.lastVhdDate > oneYearAgo) {
                const lastDate = lastVaccination.lastVhdDate.toLocaleDateString('es-ES');
                return res.status(400).json({ 
                    message: `Debe pasar un año para poder ingresar otra vacuna VHD. Último registro: ${lastDate} - Código: ${codigo}` 
                });
            }
        }

        // Crear nuevo registro de vacunación
        const newVaccination = new Vaccination({
            codigo,
            mixomatosis: !!mixomatosis,
            vhd: !!vhd,
            fecha: now,
            lastMixomatosisDate: mixomatosis ? now : (lastVaccination?.lastMixomatosisDate || null),
            lastVhdDate: vhd ? now : (lastVaccination?.lastVhdDate || null)
        });

        await newVaccination.save();

        res.status(201).json({ 
            message: 'Se registró el control de vacunación',
            vaccination: newVaccination
        });

    } catch (error) {
        console.error('Error al registrar vacunación:', error);
        res.status(500).json({ 
            message: 'No se pudo registrar la vacunación. Intente nuevamente.' 
        });
    }
};

exports.checkVaccinationValidations = async (req, res) => {
    try {
        const { rabbits } = req.body;
        
        if (!rabbits || !Array.isArray(rabbits)) {
            return res.status(400).json({ 
                message: 'Se requiere un array de códigos de conejos' 
            });
        }

        const validationResults = {};
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        for (const codigo of rabbits) {
            const lastVaccination = await Vaccination.findOne({ codigo }).sort({ fecha: -1 });
            
            validationResults[codigo] = {
                canReceiveMixomatosis: true,
                canReceiveVhd: true,
                lastMixomatosis: null,
                lastVhd: null
            };

            if (lastVaccination) {
                if (lastVaccination.lastMixomatosisDate && lastVaccination.lastMixomatosisDate > oneYearAgo) {
                    validationResults[codigo].canReceiveMixomatosis = false;
                    validationResults[codigo].lastMixomatosis = lastVaccination.lastMixomatosisDate;
                }
                
                if (lastVaccination.lastVhdDate && lastVaccination.lastVhdDate > oneYearAgo) {
                    validationResults[codigo].canReceiveVhd = false;
                    validationResults[codigo].lastVhd = lastVaccination.lastVhdDate;
                }
            }
        }

        res.json({ validations: validationResults });
        
    } catch (error) {
        console.error('Error al verificar validaciones de vacunación:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor al verificar validaciones' 
        });
    }
};

exports.getVaccinationStatus = async (req, res) => {
    try {
        const { rabbits } = req.body;
        
        if (!rabbits || !Array.isArray(rabbits)) {
            return res.status(400).json({ 
                message: 'Se requiere un array de códigos de conejos' 
            });
        }

        const statusResults = {};
        
        for (const codigo of rabbits) {
            const lastVaccination = await Vaccination.findOne({ codigo }).sort({ fecha: -1 });
            
            statusResults[codigo] = {
                hasVaccinations: !!lastVaccination,
                lastMixomatosis: lastVaccination?.lastMixomatosisDate || null,
                lastVhd: lastVaccination?.lastVhdDate || null
            };
        }

        res.json({ status: statusResults });
        
    } catch (error) {
        console.error('Error al obtener estado de vacunaciones:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor al obtener estado de vacunaciones' 
        });
    }
};
