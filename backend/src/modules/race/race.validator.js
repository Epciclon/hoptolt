const validateDescription = (description, errors) => {
    if (!description || description.trim() === '') {
        errors.push('La descripción de la raza es obligatoria.');
    } else {
        const descRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
        if (!descRegex.test(description.trim())) {
            errors.push('La descripción solo puede contener solo letras y espacios.');
        } else if (description.trim().length > 150) {
            errors.push('La descripción tiene un límite máximo de 150 caracteres.');
        }
    }
};

const validateCreateRace = (req, res, next) => {
    const errors = [];
    const { name, description } = req.body;

    if (!name || name.trim() === '') {
        errors.push('El nombre de la raza es obligatorio.');
    } else {
        const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
        if (!nameRegex.test(name.trim())) {
            errors.push('El nombre de la raza solo puede contener letras y espacios.');
        }
    }

    validateDescription(description, errors);

    if (errors.length > 0) return res.status(400).json({ success: false, errors });
    next();
};

const validateEditRace = (req, res, next) => {
    const errors = [];
    const { description } = req.body;

    validateDescription(description, errors);

    if (errors.length > 0) return res.status(400).json({ success: false, errors });
    next();
};

module.exports = { validateCreateRace, validateEditRace };
