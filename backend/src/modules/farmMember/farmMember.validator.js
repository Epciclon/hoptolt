const validateUpdateWorker = (req, res, next) => {
    const errors = [];
    const { permissions, cageIds } = req.body;

    if (permissions !== undefined && !Array.isArray(permissions)) {
        errors.push('El listado de permisos debe ser un arreglo.');
    }

    if (cageIds !== undefined) {
        if (!Array.isArray(cageIds)) {
            errors.push('El listado de jaulas asignadas debe ser un arreglo.');
        } else {
            for (const cageId of cageIds) {
                const num = Number(cageId);
                if (!Number.isInteger(num) || num <= 0) {
                    errors.push('Los identificadores de jaulas deben ser números enteros positivos.');
                    break;
                }
            }
        }
    }

    if (errors.length > 0) return res.status(400).json({ success: false, errors });
    next();
};

const validateLogReportAudit = (req, res, next) => {
    const errors = [];
    const { moduleName, format } = req.body;

    if (!moduleName || typeof moduleName !== 'string' || !moduleName.trim()) {
        errors.push('El nombre del módulo del reporte es obligatorio.');
    }

    if (format && !['preview', 'pdf', 'excel', 'csv'].includes(String(format).toLowerCase())) {
        errors.push('El formato del reporte no es válido.');
    }

    if (errors.length > 0) return res.status(400).json({ success: false, errors });
    next();
};

module.exports = {
    validateUpdateWorker,
    validateLogReportAudit
};

