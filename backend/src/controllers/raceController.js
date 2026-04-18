const Race = require('../models/race');

exports.registerRace = async (req, res) => {
    const { name, description } = req.body;

    // Validación simple
    if (!name || !description) {
        return res.status(400).json({ message: 'Nombre y descripción son obligatorios.' });
    }
    if (name.length < 2) {
        return res.status(400).json({ message: 'El nombre debe tener al menos 2 caracteres.' });
    }
    if (description.length < 5) {
        return res.status(400).json({ message: 'La descripción debe tener al menos 5 caracteres.' });
    }

    try {
        // Verifica unicidad
        const exists = await Race.findOne({ name: name.trim() });
        if (exists) {
            return res.status(400).json({ message: 'Ya existe una raza con ese nombre.' });
        }
        const race = new Race({ name: name.trim(), description: description.trim() });
        await race.save();
        res.status(201).json({ message: 'Raza registrada exitosamente.', race });
    } catch (error) {
        res.status(500).json({ message: 'Error al registrar la raza.', error: error.message });
    }
};

exports.getRaceByName = async (req, res) => {
    const { name } = req.query;
    if (!name || name.trim().length < 2) {
        return res.status(400).json({ message: 'Debe ingresar un nombre de raza válido (mínimo 2 caracteres).' });
    }
    try {
        const race = await Race.findOne({ name: name.trim() });
        if (!race) {
            return res.status(404).json({ message: 'Raza no encontrada.' });
        }
        res.status(200).json({ name: race.name, description: race.description });
    } catch (error) {
        res.status(500).json({ message: 'Error al consultar la raza.', error: error.message });
    }
};

exports.getAllRaces = async (req, res) => {
    try {
        const races = await Race.find({}, { name: 1, description: 1, _id: 0 });
        res.status(200).json(races);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener las razas.', error: error.message });
    }
};

exports.editRaceDescription = async (req, res) => {
    const { name } = req.params;
    const { description } = req.body;

    if (!description || description.trim().length < 5) {
        return res.status(400).json({ message: 'La descripción debe tener al menos 5 caracteres.' });
    }

    try {
        const updatedRace = await Race.findOneAndUpdate(
            { name: name.trim() },
            { description: description.trim() },
            { new: true }
        );
        if (!updatedRace) {
            return res.status(404).json({ message: 'Raza no encontrada.' });
        }
        res.status(200).json({ message: 'Raza editada exitosamente.', race: updatedRace });
    } catch (error) {
        res.status(500).json({ message: 'Error al editar la raza.', error: error.message });
    }
};

exports.deleteRace = async (req, res) => {
    const { name } = req.params;
    try {
        const deleted = await Race.findOneAndDelete({ name: name.trim() });
        if (!deleted) {
            return res.status(404).json({ message: 'Raza no encontrada.' });
        }
        res.status(200).json({ message: 'Raza eliminada con éxito.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la raza.', error: error.message });
    }
};
