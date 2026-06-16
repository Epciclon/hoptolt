const validateCreateVaccination = (req, res, next) => {
    const errors = [];
    const { rabbitIds, vaccines } = req.body;

    if (!Array.isArray(rabbitIds) || rabbitIds.length === 0) {
        errors.push('Debe seleccionar al menos un conejo.');
    }

    if (!Array.isArray(vaccines) || vaccines.length === 0) {
        errors.push('Debe seleccionar al menos una vacuna.');
    }

    if (errors.length > 0) return res.status(400).json({ success: false, errors });
    next();
};

module.exports = { validateCreateVaccination };
