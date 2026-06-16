const validateCreateRabbit = (req, res, next) => {
    const errors = [];
    const { name, race, sex, birthDate, weight, purpose } = req.body;

    if (!name || name.trim() === '') {
        errors.push('El nombre del conejo es obligatorio.');
    } else {
        const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
        if (!nameRegex.test(name.trim())) {
            errors.push('El nombre solo puede contener letras y espacios.');
        } else if (name.trim().length > 50) {
            errors.push('El nombre tiene un límite máximo de 50 caracteres.');
        }
    }

    if (!race || race.trim() === '') {
        errors.push('La raza es obligatoria.');
    }

    if (!sex || !['macho', 'hembra'].includes(sex)) {
        errors.push('El sexo debe ser "macho" o "hembra".');
    }

    if (!birthDate) {
        errors.push('La fecha de nacimiento es obligatoria.');
    } else {
        const bd = new Date(birthDate);
        const today = new Date();
        if (bd > today) {
            errors.push('La fecha de nacimiento no puede ser futura.');
        } else {
            const ageMonths = (today - bd) / (1000 * 60 * 60 * 24 * 30.44);
            if (ageMonths > 18) {
                errors.push('El conejo no puede tener más de 18 meses.');
            }
        }
    }

    if (weight === undefined || weight === null || weight === '') {
        errors.push('El peso es obligatorio.');
    } else {
        const w = parseFloat(weight);
        if (isNaN(w) || w <= 0 || w > 4.5) {
            errors.push('El peso debe ser un número positivo entre 0.1 y 4.5 kg.');
        }
    }

    if (!purpose || !['Reproducción', 'Engorde'].includes(purpose)) {
        errors.push('El propósito debe ser "Reproducción" o "Engorde".');
    }

    if (errors.length > 0) return res.status(400).json({ success: false, errors });
    next();
};

const validateEditRabbit = (req, res, next) => {
    const errors = [];
    const { name, race, sex, birthDate, weight, purpose } = req.body;

    if (name !== undefined && name !== null && name !== '') {
        const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
        if (!nameRegex.test(name.trim())) {
            errors.push('El nombre solo puede contener letras y espacios.');
        } else if (name.trim().length > 50) {
            errors.push('El nombre tiene un límite máximo de 50 caracteres.');
        }
    }

    if (sex && !['macho', 'hembra'].includes(sex)) {
        errors.push('El sexo debe ser "macho" o "hembra".');
    }

    if (birthDate) {
        const bd = new Date(birthDate);
        const today = new Date();
        if (bd > today) {
            errors.push('La fecha de nacimiento no puede ser futura.');
        } else {
            const ageMonths = (today - bd) / (1000 * 60 * 60 * 24 * 30.44);
            if (ageMonths > 18) {
                errors.push('El conejo no puede tener más de 18 meses.');
            }
        }
    }

    if (weight !== undefined && weight !== null && weight !== '') {
        const w = parseFloat(weight);
        if (isNaN(w) || w <= 0 || w > 4.5) {
            errors.push('El peso debe ser un número positivo entre 0.1 y 4.5 kg.');
        }
    }

    if (purpose && !['Reproducción', 'Engorde'].includes(purpose)) {
        errors.push('El propósito debe ser "Reproducción" o "Engorde".');
    }

    if (errors.length > 0) return res.status(400).json({ success: false, errors });
    next();
};

module.exports = { validateCreateRabbit, validateEditRabbit };
