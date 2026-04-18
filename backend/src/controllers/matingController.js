const Mating = require('../models/mating');
const AssignRabbit = require('../models/assignRabbit');
const Rabbit = require('../models/rabbit');

// Listar conejas disponibles para monta (edad >= 4, sexo hembra, jaula asignada)
exports.getAvailableFemales = async (req, res) => {
    try {
        // Conejas con edad >= 4, sexo hembra
        const females = await Rabbit.find({ sex: 'hembra', age: { $gte: 4 } });
        // Buscar jaula asignada
        const assignments = await AssignRabbit.find({ status: 'asignado' });
        const assignedCodes = assignments.map(a => a.rabbitCode);
        const result = females
            .filter(f => assignedCodes.includes(f.code))
            .map(f => {
                const assign = assignments.find(a => a.rabbitCode === f.code);
                return {
                    code: f.code,
                    age: f.age,
                    sex: f.sex,
                    cageNumber: assign?.cageNumber
                };
            });
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: 'No se pudo obtener la lista de conejas.', error: err.message });
    }
};

// Registrar datos de monta
exports.registerMating = async (req, res) => {
    try {
        const { rabbitCode, cageNumber, matingDate } = req.body;
        if (!rabbitCode || !cageNumber || !matingDate) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
        }
        // Validar que la coneja existe y cumple requisitos
        const rabbit = await Rabbit.findOne({ code: rabbitCode, sex: 'hembra', age: { $gte: 4 } });
        if (!rabbit) {
            return res.status(400).json({ message: 'La coneja seleccionada no es válida.' });
        }
        // Validar que tiene jaula asignada
        const assignment = await AssignRabbit.findOne({ rabbitCode, status: 'asignado' });
        if (!assignment || assignment.cageNumber !== cageNumber) {
            return res.status(400).json({ message: 'La coneja no tiene jaula asignada.' });
        }
        // Validar que no tenga monta activa (fecha de parto pendiente)
        const activeMating = await Mating.findOne({
            rabbitCode,
            status: 'activo',
            birthDate: { $gte: new Date() }
        });
        if (activeMating) {
            return res.status(400).json({ message: 'La coneja ya tiene una monta activa.' });
        }
        // Validar fecha de monta
        const matingDateObj = new Date(matingDate);
        if (isNaN(matingDateObj.getTime())) {
            return res.status(400).json({ message: 'La fecha de monta no es válida.' });
        }
        // Calcular fecha estimada de parto (30 días después)
        const birthDate = new Date(matingDateObj);
        birthDate.setDate(birthDate.getDate() + 30);

        // Registrar
        const newMating = new Mating({
            rabbitCode,
            cageNumber,
            matingDate: matingDateObj,
            birthDate,
            status: 'activo'
        });
        await newMating.save();
        res.status(201).json({ message: 'Se registró la fecha de monta.', mating: newMating });
    } catch (err) {
        res.status(500).json({ message: 'Error al registrar la monta.', error: err.message });
    }
};

// Listar montas activas (para eliminar parto)
exports.getActiveMatings = async (req, res) => {
    try {
        // Solo montas activas (no eliminadas, no finalizadas)
        const matings = await Mating.find({ status: 'activo' });
        res.json(matings);
    } catch (err) {
        res.status(500).json({ message: 'No se pudo obtener la lista de montas.', error: err.message });
    }
};

// Eliminar parto (elimina la monta)
exports.deleteMating = async (req, res) => {
    try {
        const { id } = req.params;
        const mating = await Mating.findById(id);
        if (!mating) {
            return res.status(404).json({ message: 'No se encontró el registro de monta.' });
        }
        mating.status = 'eliminado';
        await mating.save();
        res.json({ message: 'El parto ha sido eliminado con éxito.' });
    } catch (err) {
        res.status(500).json({ message: 'Error al eliminar el parto.', error: err.message });
    }
};
