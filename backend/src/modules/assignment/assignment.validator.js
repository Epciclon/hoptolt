const validateAssignment = (req, res, next) => {
    const errors = [];
    const { cageNumber, rabbitCode } = req.body;

    if (cageNumber === undefined || cageNumber === null || cageNumber === '') {
        errors.push('El número de jaula es obligatorio.');
    } else if (!Number.isInteger(Number(cageNumber)) || Number(cageNumber) <= 0) {
        errors.push('El número de jaula debe ser un entero positivo.');
    }

    if (!rabbitCode || rabbitCode.trim() === '') {
        errors.push('El código del conejo es obligatorio.');
    } else {
        const codeRegex = /^[A-Z]\d{3}$/i;
        if (!codeRegex.test(rabbitCode.trim())) {
            errors.push('El código del conejo debe tener el formato [Letra][3 dígitos] (ej: R001).');
        }
    }

    if (errors.length > 0) return res.status(400).json({ success: false, errors });
    next();
};

const validateUnassign = (req, res, next) => {
    const errors = [];
    const { rabbitCode } = req.body;

    if (!rabbitCode || rabbitCode.trim() === '') {
        errors.push('El código del conejo es obligatorio.');
    }

    if (errors.length > 0) return res.status(400).json({ success: false, errors });
    next();
};

module.exports = { validateAssignment, validateUnassign };
