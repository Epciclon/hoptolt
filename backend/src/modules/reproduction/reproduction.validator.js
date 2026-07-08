const validateCreateReproduction = (req, res, next) => {
    const errors = [];
    const { femaleId, mountDate } = req.body;

    if (!femaleId) {
        errors.push('El ID de la coneja es obligatorio.');
    }

    if (!mountDate) {
        errors.push('La fecha de monta es obligatoria.');
    }

    if (errors.length > 0) return res.status(400).json({ success: false, errors });
    next();
};

const validateEditReproduction = (req, res, next) => {
    const errors = [];
    const { mountDate } = req.body;

    if (mountDate) {
        const md = new Date(mountDate);
        const today = new Date();
        if (md > today) {
            errors.push('La fecha de monta no puede ser futura.');
        }
    }

    if (errors.length > 0) return res.status(400).json({ success: false, errors });
    next();
};

module.exports = { validateCreateReproduction, validateEditReproduction };
