const validateCreateCage = (req, res, next) => {
    const errors = [];
    const { quantity, type, capacity, status } = req.body;

    if (quantity === undefined || quantity === null || quantity === '') {
        errors.push('La cantidad de jaulas es obligatoria.');
    } else if (!Number.isInteger(Number(quantity)) || Number(quantity) <= 0 || Number(quantity) > 9999) {
        errors.push('La cantidad debe ser un entero positivo menor o igual a 9999.');
    }

    if (!type || !['engorde', 'reproducción'].includes(type)) {
        errors.push('El tipo de jaula debe ser engorde o reproducción.');
    }

    if (capacity === undefined || capacity === null || capacity === '') {
        errors.push('La capacidad es obligatoria.');
    } else if (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0) {
        errors.push('La capacidad debe ser un número entero positivo.');
    } else if (type === 'reproducción' && Number(capacity) !== 1) {
        errors.push('La capacidad máxima para jaula de reproducción es 1.');
    } else if (type === 'engorde' && (Number(capacity) < 1 || Number(capacity) > 100)) {
        errors.push('La capacidad para jaula de engorde debe ser entre 1 y 100.');
    }

    if (status && !['operativa', 'mantenimiento'].includes(status)) {
        errors.push('El estado debe ser operativa o mantenimiento.');
    }

    if (errors.length > 0) return res.status(400).json({ success: false, errors });
    next();
};

const validateEditCage = (req, res, next) => {
    const errors = [];
    const { type, capacity, status } = req.body;

    if (type && !['engorde', 'reproducción'].includes(type)) {
        errors.push('El tipo de jaula debe ser engorde o reproducción.');
    }

    if (capacity !== undefined && capacity !== null && capacity !== '') {
        if (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0) {
            errors.push('La capacidad debe ser un número entero positivo.');
        } else if (type === 'reproducción' && Number(capacity) !== 1) {
            errors.push('La capacidad máxima para jaula de reproducción es 1.');
        } else if (type === 'engorde' && (Number(capacity) < 1 || Number(capacity) > 100)) {
            errors.push('La capacidad para jaula de engorde debe ser entre 1 y 100.');
        }
    }

    if (status && !['operativa', 'mantenimiento'].includes(status)) {
        errors.push('El estado debe ser operativa o mantenimiento.');
    }

    if (errors.length > 0) return res.status(400).json({ success: false, errors });
    next();
};

module.exports = { validateCreateCage, validateEditCage };
