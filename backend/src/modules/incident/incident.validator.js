const VALID_CATEGORIES = [
    'Dificultad en la Tarea',
    'Problema en Jaula',
    'Salud del Conejo',
    'Falta de Insumos',
    'Limpieza e Higiene',
    'Aviso General'
];

const VALID_MODULES = [
    'general',
    'alimentacion',
    'limpieza',
    'vacunacion',
    'desparasitacion',
    'reproduccion',
    'mortalidad'
];

const validateCreateIncident = (req, res, next) => {
    const errors = [];
    const { title, description, category, module, cageId, cageIds, rabbitId } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
        errors.push('El motivo de la novedad es obligatorio.');
    } else if (title.trim().length > 200) {
        errors.push('El motivo de la novedad no puede superar los 200 caracteres.');
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
        errors.push('La explicación de la novedad es obligatoria.');
    }

    if (category && !VALID_CATEGORIES.includes(category.trim())) {
        errors.push('El tipo de novedad seleccionado no es válido.');
    }

    if (module && typeof module === 'string' && module.trim()) {
        const normalized = module.trim().toLowerCase();
        if (!VALID_MODULES.includes(normalized)) {
            errors.push('La labor seleccionada no es válida.');
        }
    }

    if (cageId !== undefined && cageId !== null && cageId !== '') {
        const numCage = Number(cageId);
        if (!Number.isInteger(numCage) || numCage <= 0) {
            errors.push('El identificador de jaula debe ser un número entero positivo.');
        }
    }

    if (cageIds !== undefined && cageIds !== null) {
        if (!Array.isArray(cageIds)) {
            errors.push('El listado de jaulas debe ser un arreglo.');
        } else {
            for (const id of cageIds) {
                const num = Number(id);
                if (!Number.isInteger(num) || num <= 0) {
                    errors.push('Los identificadores de jaulas deben ser números enteros positivos.');
                    break;
                }
            }
        }
    }

    if (rabbitId !== undefined && rabbitId !== null && rabbitId !== '') {
        const numRabbit = Number(rabbitId);
        if (!Number.isInteger(numRabbit) || numRabbit <= 0) {
            errors.push('El identificador de conejo debe ser un número entero positivo.');
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors, message: errors.join(', ') });
    }
    next();
};

const validateRespondIncident = (req, res, next) => {
    const errors = [];
    const { status, ownerResponse } = req.body;

    if (status && !['pending', 'reviewed', 'resolved'].includes(status)) {
        errors.push('El estado de la novedad debe ser atendida o pendiente.');
    }

    if (status !== 'pending') {
        if (!ownerResponse || typeof ownerResponse !== 'string' || !ownerResponse.trim()) {
            errors.push('La respuesta para el trabajador es obligatoria.');
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors, message: errors.join(', ') });
    }
    next();
};

const validateIncidentId = (req, res, next) => {
    const id = req.params.id;
    if (id === 'all') return next();

    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) {
        return res.status(400).json({
            success: false,
            errors: ['El identificador de la novedad debe ser un número entero positivo.'],
            message: 'El identificador de la novedad debe ser un número entero positivo.'
        });
    }
    next();
};

module.exports = {
    validateCreateIncident,
    validateRespondIncident,
    validateIncidentId
};
