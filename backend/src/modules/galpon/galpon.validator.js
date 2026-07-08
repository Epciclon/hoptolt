const PROVINCES = new Set([
    'Azuay', 'Bolívar', 'Cañar', 'Carchi', 'Chimborazo', 'Cotopaxi', 'El Oro',
    'Esmeraldas', 'Galápagos', 'Guayas', 'Imbabura', 'Loja', 'Los Ríos',
    'Manabí', 'Morona Santiago', 'Napo', 'Orellana', 'Pastaza', 'Pichincha',
    'Santa Elena', 'Santo Domingo de los Tsáchilas', 'Sucumbíos', 'Tungurahua',
    'Zamora Chinchipe', 'Otros'
]);

const checkName = (name, errors) => {
    if (!name || name.trim() === '') {
        errors.push('El nombre del galpón es obligatorio.');
    } else {
        const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
        if (!nameRegex.test(name.trim())) {
            errors.push('El nombre del galpón solo puede contener letras y espacios.');
        } else if (name.trim().length > 50) {
            errors.push('El nombre del galpón tiene un límite máximo de 50 caracteres.');
        }
    }
};

const checkProvinceAndLocation = (province, location, errors) => {
    if (!province || !PROVINCES.has(province)) {
        errors.push('La provincia debe ser una opción válida de la lista predefinida.');
    }
    if (!location || location.trim() === '') {
        errors.push('La ubicación es obligatoria.');
    } else if (location.trim().length > 100) {
        errors.push('La ubicación tiene un límite máximo de 100 caracteres.');
    }
};

const checkCapacityAndFood = (totalCapacity, foodTypes, errors) => {
    if (totalCapacity === undefined || totalCapacity === null || totalCapacity === '') {
        errors.push('La capacidad total es obligatoria.');
    } else if (!Number.isInteger(Number(totalCapacity)) || Number(totalCapacity) <= 0) {
        errors.push('La capacidad total debe ser un número entero positivo.');
    }
    if (!Array.isArray(foodTypes) || foodTypes.length === 0) {
        errors.push('Debe seleccionar al menos un tipo de alimento.');
    }
};

const checkVaccines = (vaccines, errors) => {
    if (!Array.isArray(vaccines) || vaccines.length === 0) {
        errors.push('Debe seleccionar al menos una vacuna.');
    } else {
        for (const vaccine of vaccines) {
            if (!vaccine.name || vaccine.name.trim() === '') {
                errors.push('Cada vacuna debe tener un nombre.');
            }
            if (!vaccine.period || !Number.isInteger(Number(vaccine.period)) || Number(vaccine.period) <= 0) {
                errors.push('Cada vacuna debe tener un período válido (número entero positivo).');
            }
        }
    }
};

const checkDeworming = (dewormingPeriod, errors) => {
    if (dewormingPeriod === undefined || dewormingPeriod === null || dewormingPeriod === '') {
        errors.push('El período de desparasitación es obligatorio.');
    } else if (!Number.isInteger(Number(dewormingPeriod)) || Number(dewormingPeriod) <= 0) {
        errors.push('El período de desparasitación debe ser un número entero positivo.');
    }
};

const checkVaccinesAndDeworming = (vaccines, dewormingPeriod, errors) => {
    checkVaccines(vaccines, errors);
    checkDeworming(dewormingPeriod, errors);
};

const validateCreateGalpon = (req, res, next) => {
    const errors = [];
    const { name, province, location, totalCapacity, foodTypes, vaccines, dewormingPeriod } = req.body;

    checkName(name, errors);
    checkProvinceAndLocation(province, location, errors);
    checkCapacityAndFood(totalCapacity, foodTypes, errors);
    checkVaccinesAndDeworming(vaccines, dewormingPeriod, errors);

    if (errors.length > 0) return res.status(400).json({ success: false, errors });
    next();
};

const validateEditGalpon = (req, res, next) => {
    const errors = [];
    const { name, province, location, totalCapacity, foodTypes, vaccines, dewormingPeriod } = req.body;

    checkEditName(name, errors);
    checkEditProvinceAndLocation(province, location, errors);
    checkEditCapacityAndFood(totalCapacity, foodTypes, errors);
    checkEditVaccinesAndDeworming(vaccines, dewormingPeriod, errors);

    if (errors.length > 0) return res.status(400).json({ success: false, errors });
    next();
};

const checkEditName = (name, errors) => {
    if (name !== undefined && name !== null && name !== '') {
        const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
        if (!nameRegex.test(name.trim())) {
            errors.push('El nombre del galpón solo puede contener letras y espacios.');
        } else if (name.trim().length > 50) {
            errors.push('El nombre del galpón tiene un límite máximo de 50 caracteres.');
        }
    }
};

const checkEditProvinceAndLocation = (province, location, errors) => {
    if (province && !PROVINCES.has(province)) {
        errors.push('La provincia debe ser una opción válida de la lista predefinida.');
    }
    if (location !== undefined && location !== null && location !== '') {
        if (location.trim().length > 100) {
            errors.push('La ubicación tiene un límite máximo de 100 caracteres.');
        }
    }
};

const checkEditCapacityAndFood = (totalCapacity, foodTypes, errors) => {
    if (totalCapacity !== undefined && totalCapacity !== null && totalCapacity !== '') {
        if (!Number.isInteger(Number(totalCapacity)) || Number(totalCapacity) <= 0) {
            errors.push('La capacidad total debe ser un número entero positivo.');
        }
    }
    if (foodTypes !== undefined && Array.isArray(foodTypes)) {
        if (foodTypes.length === 0) {
            errors.push('Debe seleccionar al menos un tipo de alimento.');
        }
    }
};

const checkEditVaccines = (vaccines, errors) => {
    if (vaccines !== undefined && Array.isArray(vaccines)) {
        if (vaccines.length === 0) {
            errors.push('Debe seleccionar al menos una vacuna.');
        } else {
            for (const vaccine of vaccines) {
                if (!vaccine.name || vaccine.name.trim() === '') {
                    errors.push('Cada vacuna debe tener un nombre.');
                }
                if (!vaccine.period || !Number.isInteger(Number(vaccine.period)) || Number(vaccine.period) <= 0) {
                    errors.push('Cada vacuna debe tener un período válido (número entero positivo).');
                }
            }
        }
    }
};

const checkEditDeworming = (dewormingPeriod, errors) => {
    if (dewormingPeriod !== undefined && dewormingPeriod !== null && dewormingPeriod !== '') {
        if (!Number.isInteger(Number(dewormingPeriod)) || Number(dewormingPeriod) <= 0) {
            errors.push('El período de desparasitación debe ser un número entero positivo.');
        }
    }
};

const checkEditVaccinesAndDeworming = (vaccines, dewormingPeriod, errors) => {
    checkEditVaccines(vaccines, errors);
    checkEditDeworming(dewormingPeriod, errors);
};

module.exports = { validateCreateGalpon, validateEditGalpon };
