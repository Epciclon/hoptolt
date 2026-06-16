const validateCreateMortality = (req, res, next) => {
    const errors = [];
    const { rabbitId, cause } = req.body;

    if (!rabbitId) {
        errors.push('El ID del conejo es obligatorio.');
    }

    if (!cause || cause.trim() === '') {
        errors.push('La causa de muerte es obligatoria.');
    }

    if (errors.length > 0) return res.status(400).json({ success: false, errors });
    next();
};

module.exports = { validateCreateMortality };
