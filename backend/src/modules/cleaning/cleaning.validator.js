const validateCreateCleaning = (req, res, next) => {
    const errors = [];
    const { cageIds } = req.body;

    if (!Array.isArray(cageIds) || cageIds.length === 0) {
        errors.push('Debe seleccionar al menos una jaula.');
    } else {
        for (const id of cageIds) {
            if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
                errors.push('Los IDs de jaulas deben ser enteros positivos.');
                break;
            }
        }
    }

    if (errors.length > 0) return res.status(400).json({ success: false, errors });
    next();
};

module.exports = { validateCreateCleaning };
