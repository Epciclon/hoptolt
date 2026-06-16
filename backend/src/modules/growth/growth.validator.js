const validateUpdateGrowth = (req, res, next) => {
    const errors = [];
    const { rabbitCode, weight } = req.body;

    if (!rabbitCode || rabbitCode.trim() === '') {
        errors.push('El código del conejo es obligatorio.');
    }

    if (weight !== undefined && weight !== null && weight !== '') {
        const w = parseFloat(weight);
        if (isNaN(w) || w <= 0 || w > 4.5) {
            errors.push('El peso debe ser un número positivo entre 0.1 y 4.5 kg.');
        }
    }

    if (errors.length > 0) return res.status(400).json({ success: false, errors });
    next();
};

module.exports = { validateUpdateGrowth };
