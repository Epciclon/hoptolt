const AssignRabbit = require('../models/assignRabbit');
const Cage = require('../models/cage');
const Rabbit = require('../models/rabbit');


// Asignar conejo a jaula (un solo conejo por petición)
exports.assignRabbit = async (req, res) => {
    try {
        const { cageNumber, rabbitCode } = req.body;
        const cage = await Cage.findOne({ number: cageNumber });
        if (!cage) {
            return res.status(400).json({ message: 'La jaula seleccionada no existe.' });
        }
        if (!rabbitCode) {
            return res.status(400).json({ message: 'Debe proporcionar el código del conejo.' });
        }

        // Contar asignaciones actuales en la jaula
        const count = await AssignRabbit.countDocuments({ cageNumber, status: 'asignado' });
        if (count >= cage.capacity) {
            return res.status(400).json({ message: 'La capacidad de la jaula ha sido superada.' });
        }

        // Verificar si el conejo ya está asignado
        const alreadyAssigned = await AssignRabbit.findOne({ rabbitCode, status: 'asignado' });
        if (alreadyAssigned) {
            return res.status(400).json({ message: 'El conejo ya está asignado a una jaula.' });
        }

        const assign = new AssignRabbit({
            cageNumber: cage.number,
            cageType: cage.type,
            cageCapacity: cage.capacity,
            rabbitCode,
            status: 'asignado'
        });
        await assign.save();
        res.status(201).json({ message: 'Asignación registrada exitosamente.', assign });
    } catch (error) {
        res.status(500).json({ message: 'Error al asignar conejo a jaula.', error: error.message });
    }
};

// Listar asignaciones jaula-conejo (no agrupado)
exports.getAssignments = async (req, res) => {
    try {
        const assignments = await AssignRabbit.find({ status: 'asignado' });
        res.status(200).json(assignments);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener asignaciones.', error: error.message });
    }
};

// Quitar asignación de conejo a jaula (eliminar registro completamente)
exports.unassignRabbit = async (req, res) => {
    try {
        const { rabbitCode } = req.body;
        const assignment = await AssignRabbit.findOne({ rabbitCode, status: 'asignado' });
        if (!assignment) {
            return res.status(404).json({ message: 'El conejo no está asignado a ninguna jaula.' });
        }
        
        // Eliminar el registro completamente en lugar de cambiar el estado
        await AssignRabbit.deleteOne({ rabbitCode, status: 'asignado' });
        res.status(200).json({ message: 'Asignación eliminada exitosamente.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al quitar asignación.', error: error.message });
    }
};

// Eliminar asignación por código de conejo (para endpoint DELETE)
exports.deleteAssignmentByRabbitCode = async (req, res) => {
    try {
        const { rabbitCode } = req.params;
        const assignment = await AssignRabbit.findOne({ rabbitCode, status: 'asignado' });
        if (!assignment) {
            return res.status(404).json({ message: 'El conejo no está asignado a ninguna jaula.' });
        }
        
        // Eliminar el registro completamente
        await AssignRabbit.deleteOne({ rabbitCode, status: 'asignado' });
        res.status(200).json({ message: 'Asignación eliminada exitosamente.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar asignación.', error: error.message });
    }
};
