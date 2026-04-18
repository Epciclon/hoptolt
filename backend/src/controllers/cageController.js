const Cage = require('../models/cage');
const { validateCageData } = require('../utils/cageValidations');

exports.registerCage = async (req, res) => {
    const errors = validateCageData(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });

    try {
        const exists = await Cage.findOne({ number: req.body.number });
        if (exists) return res.status(400).json({ errors: ['El número de jaula ya existe.'] });

        const cage = new Cage(req.body);
        await cage.save();
        res.status(201).json({ message: 'Jaula registrada con éxito', cage });
    } catch (err) {
        res.status(500).json({ message: 'Error en la base de datos', error: err.message });
    }
};

exports.getCage = async (req, res) => {
    const number = Number(req.params.number);
    if (!Number.isInteger(number) || number <= 0) {
        return res.status(400).json({ message: 'Sólo números enteros positivos.' });
    }
    try {
        const cage = await Cage.findOne({ number });
        if (!cage) return res.status(404).json({ message: 'No se encontraron jaulas.' });
        res.json(cage);
    } catch (err) {
        res.status(500).json({ message: 'Error en la base de datos', error: err.message });
    }
};

exports.getAllCages = async (req, res) => {
    try {
        const cages = await Cage.find();
        res.json(cages);
    } catch (err) {
        res.status(500).json({ message: 'Error en la base de datos', error: err.message });
    }
};

exports.editCage = async (req, res) => {
    const number = Number(req.params.number);
    const errors = validateCageData({ ...req.body, number }, false);
    if (errors.length > 0) return res.status(400).json({ errors });

    try {
        const cage = await Cage.findOneAndUpdate(
            { number },
            { type: req.body.type, capacity: req.body.capacity },
            { new: true }
        );
        if (!cage) return res.status(404).json({ message: 'No se encontró la jaula.' });
        res.json({ message: 'Jaula editada con éxito', cage });
    } catch (err) {
        res.status(500).json({ message: 'Error en la base de datos', error: err.message });
    }
};

exports.deleteCage = async (req, res) => {
    const number = Number(req.params.number);
    try {
        const cage = await Cage.findOneAndDelete({ number });
        if (!cage) return res.status(404).json({ message: 'No se encontró la jaula.' });
        res.json({ message: 'Jaula eliminada correctamente.' });
    } catch (err) {
        res.status(500).json({ message: 'Error en la base de datos', error: err.message });
    }
};