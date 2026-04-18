const Rabbit = require('../models/rabbit');
const Race = require('../models/race');
const { validateRabbitData, validateCodeUniqueness } = require('../utils/rabbitValidations');

// Registrar un nuevo conejo
exports.registerRabbit = async (req, res) => {
    console.log('Datos recibidos:', req.body);
    const { race, code, sex, age, weight, purpose } = req.body;

    try {
        // Validar datos
        const validation = await validateRabbitData(req.body);
        if (!validation.valid) {
            return res.status(400).json({ errors: validation.errors });
        }

        // Validar unicidad del código
        const codeValidation = await validateCodeUniqueness(code);
        if (!codeValidation.valid) {
            return res.status(400).json({ message: codeValidation.message });
        }

        const newRabbit = new Rabbit({ race, code, sex, age, weight, purpose });
        await newRabbit.save();
        res.status(201).json({ message: 'Conejo registrado exitosamente', rabbit: newRabbit });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al registrar el conejo', error: error.message });
    }
};

// Obtener un conejo por código
exports.getRabbit = async (req, res) => {
    const { code } = req.params;

    try {
        const rabbit = await Rabbit.findOne({ code });
        if (!rabbit) {
            return res.status(404).json({ message: 'Conejo no encontrado' });
        }
        res.status(200).json(rabbit);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el conejo', error: error.message });
    }
};

// Editar un conejo
exports.editRabbit = async (req, res) => {
    const { code } = req.params; // Código original del conejo
    const { sex, age, weight, purpose } = req.body; // Solo campos editables

    console.log('Editando conejo:', { originalCode: code, data: req.body });

    try {
        // Obtener el conejo actual para preservar raza y código
        const existingRabbit = await Rabbit.findOne({ code });
        if (!existingRabbit) {
            return res.status(404).json({ message: 'Conejo no encontrado' });
        }

        // Validar solo los campos editables (excepto raza y código que son inmutables)
        const editableFieldsValidation = {
            race: existingRabbit.race, // Mantener raza original para validación
            code: existingRabbit.code, // Mantener código original para validación
            sex,
            age,
            weight,
            purpose
        };

        const validation = await validateRabbitData(editableFieldsValidation);
        if (!validation.valid) {
            console.log('Errores de validación:', validation.errors);
            return res.status(400).json({ errors: validation.errors });
        }

        // Actualizar solo los campos editables
        const updatedRabbit = await Rabbit.findOneAndUpdate(
            { code }, // Buscar por código original
            { 
                sex, 
                age, 
                weight, 
                purpose 
                // No incluimos race ni code para mantenerlos inmutables
            },
            { new: true }
        );
        
        console.log('Conejo actualizado exitosamente:', updatedRabbit);
        res.status(200).json({ message: 'Conejo actualizado exitosamente', rabbit: updatedRabbit });
    } catch (error) {
        console.error('Error al actualizar conejo:', error);
        res.status(500).json({ message: 'Error al actualizar el conejo', error: error.message });
    }
};

// Eliminar un conejo
exports.deleteRabbit = async (req, res) => {
    const { code } = req.params;

    try {
        const deletedRabbit = await Rabbit.findOneAndDelete({ code });
        if (!deletedRabbit) {
            return res.status(404).json({ message: 'Conejo no encontrado' });
        }
        res.status(200).json({ message: 'Conejo eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el conejo', error: error.message });
    }
};

// Obtener todos los conejos
exports.getAllRabbits = async (req, res) => {
    try {
        const rabbits = await Rabbit.find();
        res.status(200).json(rabbits);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los conejos', error: error.message });
    }
};

// Obtener todas las razas disponibles
exports.getAvailableRaces = async (req, res) => {
    try {
        const races = await Race.find({}, 'name description');
        res.status(200).json(races);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener las razas', error: error.message });
    }
};