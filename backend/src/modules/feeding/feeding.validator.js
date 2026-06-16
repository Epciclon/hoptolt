const validateCreateFeeding = (req, res, next) => {
    const errors = [];
    const { cageIds, foodTypes, justification } = req.body;

    if (!Array.isArray(cageIds) || cageIds.length === 0) {
        errors.push('Debe seleccionar al menos una jaula.');
    }

    if (!Array.isArray(foodTypes) || foodTypes.length === 0) {
        errors.push('Debe seleccionar al menos un tipo de alimento.');
    }

    if (justification !== undefined && justification !== null && justification !== '') {
        if (typeof justification !== 'string' || justification.trim() === '') {
            errors.push('La justificación debe ser un texto no vacío.');
        }
    }

    if (errors.length > 0) return res.status(400).json({ success: false, errors });
    next();
};

module.exports = { validateCreateFeeding };
