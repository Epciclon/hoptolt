const Feeding = require('../models/feeding');

exports.registerFeeding = async (req, res) => {
    try {
        const { codigo, heno, hierba, balanceado, justificacion } = req.body;
        
        // Obtener la fecha actual sin hora (solo día)
        const hoy = new Date();
        const inicioDelDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const finDelDia = new Date(inicioDelDia.getTime() + 24 * 60 * 60 * 1000);
        
        // Contar registros existentes para hoy
        const registrosHoy = await Feeding.countDocuments({
            codigo: codigo,
            fecha: {
                $gte: inicioDelDia,
                $lt: finDelDia
            }
        });

        // Validar límite de registros por día
        if (registrosHoy >= 2 && !justificacion) {
            return res.status(400).json({ 
                message: 'Ya ha registrado la alimentación dos veces hoy. ¿Desea registrar una vez más?',
                requiresJustification: true 
            });
        }

        if (registrosHoy >= 2 && justificacion && justificacion.trim() === '') {
            return res.status(400).json({ 
                message: 'Debe proporcionar una justificación para el registro adicional.' 
            });
        }

        if (registrosHoy >= 3) {
            return res.status(400).json({ 
                message: 'No se permiten más de 3 registros de alimentación por día.' 
            });
        }

        const nuevaAlimentacion = new Feeding({
            codigo,
            heno,
            hierba,
            balanceado,
            fecha: new Date(),
            justificacion: registrosHoy >= 2 ? justificacion : "No necesita justificación"
        });
        
        await nuevaAlimentacion.save();
        res.status(201).json({ message: 'Alimentación registrada exitosamente', feeding: nuevaAlimentacion });
    } catch (error) {
        console.error('Error al registrar alimentación:', error);
        res.status(500).json({ message: 'Error al registrar alimentación', error: error.message });
    }
};

// Función para obtener conteo de registros del día por conejo
exports.getDailyFeedingCount = async (req, res) => {
    try {
        const { codigo } = req.params;
        
        const hoy = new Date();
        const inicioDelDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const finDelDia = new Date(inicioDelDia.getTime() + 24 * 60 * 60 * 1000);
        
        const registrosHoy = await Feeding.countDocuments({
            codigo: codigo,
            fecha: {
                $gte: inicioDelDia,
                $lt: finDelDia
            }
        });

        res.json({ count: registrosHoy });
    } catch (error) {
        console.error('Error al obtener conteo de alimentación:', error);
        res.status(500).json({ message: 'Error al obtener conteo de alimentación', error: error.message });
    }
};

// Función para obtener conteos diarios de múltiples conejos
exports.getDailyFeedingCounts = async (req, res) => {
    try {
        const { rabbits } = req.body;
        
        if (!rabbits || !Array.isArray(rabbits)) {
            return res.status(400).json({ message: 'Se requiere un array de códigos de conejos' });
        }

        const hoy = new Date();
        const inicioDelDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const finDelDia = new Date(inicioDelDia.getTime() + 24 * 60 * 60 * 1000);
        
        // Obtener registros para todos los conejos
        const registrosPorConejo = await Promise.all(
            rabbits.map(async (codigo) => {
                const count = await Feeding.countDocuments({
                    codigo: codigo,
                    fecha: {
                        $gte: inicioDelDia,
                        $lt: finDelDia
                    }
                });
                return { codigo, count };
            })
        );

        // Crear un objeto mapa para fácil acceso
        const conteosMapa = {};
        registrosPorConejo.forEach(r => {
            conteosMapa[r.codigo] = r.count;
        });

        res.json({ counts: conteosMapa });
    } catch (error) {
        console.error('Error al obtener conteos de alimentación:', error);
        res.status(500).json({ message: 'Error al obtener conteos de alimentación', error: error.message });
    }
};

// Función para verificar registros diarios de múltiples conejos
exports.checkDailyFeedings = async (req, res) => {
    try {
        const { rabbits } = req.body;
        
        if (!rabbits || !Array.isArray(rabbits)) {
            return res.status(400).json({ message: 'Se requiere un array de códigos de conejos' });
        }

        const hoy = new Date();
        const inicioDelDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const finDelDia = new Date(inicioDelDia.getTime() + 24 * 60 * 60 * 1000);
        
        // Verificar registros para todos los conejos
        const registrosPorConejo = await Promise.all(
            rabbits.map(async (codigo) => {
                const count = await Feeding.countDocuments({
                    codigo: codigo,
                    fecha: {
                        $gte: inicioDelDia,
                        $lt: finDelDia
                    }
                });
                return { codigo, count };
            })
        );

        // Verificar si algún conejo ya tiene 2 o más registros
        const conejosConDosOMasRegistros = registrosPorConejo.filter(r => r.count >= 2);
        
        if (conejosConDosOMasRegistros.length > 0) {
            return res.json({ 
                requiresJustification: true,
                message: 'Algunos conejos ya tienen 2 registros hoy. Se requiere justificación.',
                affectedRabbits: conejosConDosOMasRegistros
            });
        }

        res.json({ requiresJustification: false });
    } catch (error) {
        console.error('Error al verificar registros diarios:', error);
        res.status(500).json({ message: 'Error al verificar registros diarios', error: error.message });
    }
};

// Función para obtener todos los registros de alimentación con filtros
exports.getAllFeedingRecords = async (req, res) => {
    try {
        const { codigo, startDate, endDate, limit = 50, page = 1 } = req.query;
        
        let filtros = {};
        
        // Filtrar por código si se proporciona
        if (codigo) {
            filtros.codigo = codigo;
        }
        
        // Filtrar por rango de fechas si se proporciona
        if (startDate || endDate) {
            filtros.fecha = {};
            if (startDate) {
                filtros.fecha.$gte = new Date(startDate);
            }
            if (endDate) {
                const fechaFin = new Date(endDate);
                fechaFin.setHours(23, 59, 59, 999); // Incluir todo el día
                filtros.fecha.$lte = fechaFin;
            }
        }
        
        const skip = (page - 1) * limit;
        
        const registros = await Feeding.find(filtros)
            .sort({ fecha: -1 })
            .limit(parseInt(limit))
            .skip(skip);
            
        const total = await Feeding.countDocuments(filtros);
        
        res.json({
            registros,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalRecords: total,
                recordsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener registros de alimentación:', error);
        res.status(500).json({ message: 'Error al obtener registros de alimentación', error: error.message });
    }
};