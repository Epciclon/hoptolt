const { Rabbit } = require('../../domain/models');
const AppError = require('../../errors/AppError');

const validateRegisterGenealogy = (req, res, next) => {
    const errors = [];
    const { rabbitId, fatherId, motherId } = req.body;

    if (!rabbitId) {
        errors.push('El ID del conejo es obligatorio.');
    }

    if (!fatherId && !motherId) {
        errors.push('Debe proporcionar al menos un padre o una madre.');
    }

    if (fatherId && fatherId === rabbitId) {
        errors.push('El padre no puede ser el mismo conejo.');
    }

    if (motherId && motherId === rabbitId) {
        errors.push('La madre no puede ser el mismo conejo.');
    }

    if (errors.length > 0) return res.status(400).json({ success: false, errors });
    next();
};

const validateEditGenealogy = (req, res, next) => {
    const errors = [];
    const { rabbitId, fatherId, motherId } = req.body;

    if (fatherId && fatherId === rabbitId) {
        errors.push('El padre no puede ser el mismo conejo.');
    }

    if (motherId && motherId === rabbitId) {
        errors.push('La madre no puede ser el mismo conejo.');
    }

    if (errors.length > 0) return res.status(400).json({ success: false, errors });
    next();
};

module.exports = { validateRegisterGenealogy, validateEditGenealogy };
