const AppError = require('../../errors/AppError');
const { FarmMember, WorkerPermission } = require('../../domain/models');
const { Op } = require('sequelize');

// Mapeo de nombres en español normalizados a nombres en inglés
const spanishToEnglishMap = {
    'alimentacion': 'feeding',
    'vacunacion': 'vaccination',
    'desparasitacion': 'deworming',
    'limpieza': 'cleaning',
    'mortalidad': 'mortality',
    'reproduccionyparto': 'reproduction',
    'reportes': 'reports',
    'jaulas': 'cages',
    'razas': 'races',
    'conejos': 'rabbits',
    'asignar': 'assignments',
    'genealogia': 'genealogy',
    'usuarios': 'farmMembers',
    'galpones': 'galpones'
};

// Mapeo inverso de inglés a español normalizado
const englishToSpanishMap = Object.fromEntries(
    Object.entries(spanishToEnglishMap).map(([spanish, english]) => [english, spanish])
);

// Módulos de control que requieren acceso a assignments.canRead automáticamente
const CONTROL_MODULES = [
    'feeding', 'vaccination', 'deworming', 'cleaning', 'mortality', 'reproduction',
    'alimentacion', 'alimentación', 'vacunacion', 'vacunación', 'desparasitacion', 'desparasitación',
    'limpieza', 'mortalidad', 'reproduccionyparto', 'reproducción y parto'
];

const REPRODUCTION_MODULE_VARIANTS = ['reproduction', 'reproduccion', 'reproduccionyparto', 'reproducción y parto'];
const REPORTABLE_MODULES = ['feeding', 'cleaning', 'deworming', 'vaccination', 'mortality', 'reproduction'];

const MODULE_EXTRA_VARIANTS = {
    feeding: ['alimentación', 'Alimentación'],
    alimentacion: ['alimentación', 'Alimentación'],
    vaccination: ['vacunación', 'Vacunación'],
    vacunacion: ['vacunación', 'Vacunación'],
    deworming: ['desparasitación', 'Desparasitación'],
    desparasitacion: ['desparasitación', 'Desparasitación'],
    cleaning: ['Limpieza'],
    limpieza: ['Limpieza'],
    mortality: ['Mortalidad'],
    mortalidad: ['Mortalidad'],
    reproduction: ['reproducción y parto', 'Reproducción y Parto'],
    reproduccionyparto: ['reproducción y parto', 'Reproducción y Parto']
};

const ACTION_DISPLAY_NAMES = {
    canRead: 'consultar',
    canCreate: 'crear',
    canUpdate: 'editar',
    canDelete: 'eliminar'
};

const MODULE_DISPLAY_NAMES = {
    'cages': 'Jaulas',
    'jaulas': 'Jaulas',
    'races': 'Razas',
    'razas': 'Razas',
    'rabbits': 'Conejos',
    'conejos': 'Conejos',
    'assignments': 'Asignaciones',
    'asignar': 'Asignaciones',
    'genealogy': 'Genealogía',
    'genealogia': 'Genealogía',
    'reports': 'Reportes',
    'reportes': 'Reportes',
    'feeding': 'Alimentación',
    'alimentacion': 'Alimentación',
    'vaccination': 'Vacunación',
    'vacunacion': 'Vacunación',
    'deworming': 'Desparasitación',
    'desparasitacion': 'Desparasitación',
    'cleaning': 'Limpieza',
    'limpieza': 'Limpieza',
    'mortality': 'Mortalidad',
    'mortalidad': 'Mortalidad',
    'reproduction': 'Reproducción y Parto',
    'reproduccionyparto': 'Reproducción y Parto',
    'farmMembers': 'Equipo de Trabajo',
    'usuarios': 'Equipo de Trabajo',
    'galpones': 'Galpones'
};

const getCandidateModuleNames = (moduleName) => {
    const lower = moduleName.toLowerCase();
    const candidateNames = new Set([
        moduleName,
        lower,
        spanishToEnglishMap[lower],
        englishToSpanishMap[lower]
    ].filter(Boolean));

    for (const name of Array.from(candidateNames)) {
        const variants = MODULE_EXTRA_VARIANTS[name];
        if (variants) {
            variants.forEach(variant => candidateNames.add(variant));
        }
    }
    return Array.from(candidateNames);
};

const checkControlModulesFallback = async (membershipId, moduleName, action) => {
    if (moduleName !== 'assignments' || action !== 'canRead') return false;
    const hasControlPermission = await WorkerPermission.findOne({
        where: {
            farmMemberId: membershipId,
            moduleName: { [Op.in]: CONTROL_MODULES },
            [Op.or]: [
                { canRead: true },
                { canCreate: true }
            ]
        }
    });
    return Boolean(hasControlPermission);
};

const checkReproductionFallbacks = async (membershipId, moduleName, action, req) => {
    if (moduleName === 'genealogy' && action === 'canCreate') {
        return Boolean(await WorkerPermission.findOne({
            where: {
                farmMemberId: membershipId,
                moduleName: { [Op.in]: REPRODUCTION_MODULE_VARIANTS },
                canCreate: true
            }
        }));
    }

    if (moduleName === 'mortality' && action === 'canCreate') {
        return Boolean(await WorkerPermission.findOne({
            where: {
                farmMemberId: membershipId,
                moduleName: { [Op.in]: REPRODUCTION_MODULE_VARIANTS },
                [Op.or]: [{ canCreate: true }, { canUpdate: true }]
            }
        }));
    }

    if (moduleName === 'mortality' && action === 'canRead') {
        return Boolean(await WorkerPermission.findOne({
            where: {
                farmMemberId: membershipId,
                moduleName: { [Op.in]: REPRODUCTION_MODULE_VARIANTS },
                canRead: true
            }
        }));
    }

    if (moduleName === 'rabbits' && action === 'canCreate') {
        return Boolean(await WorkerPermission.findOne({
            where: {
                farmMemberId: membershipId,
                moduleName: { [Op.in]: REPRODUCTION_MODULE_VARIANTS },
                [Op.or]: [{ canCreate: true }, { canUpdate: true }]
            }
        }));
    }

    if (moduleName === 'reproduction' && action === 'canDelete' && req.body?.action === 'fail') {
        return Boolean(await WorkerPermission.findOne({
            where: {
                farmMemberId: membershipId,
                moduleName: { [Op.in]: REPRODUCTION_MODULE_VARIANTS },
                canUpdate: true
            }
        }));
    }

    return false;
};

const checkCrossModuleFallbacks = async (membershipId, moduleName, action, req) => {
    if (moduleName === 'rabbits' && action === 'canRead') {
        const hasRelatedPermission = await WorkerPermission.findOne({
            where: {
                farmMemberId: membershipId,
                moduleName: { [Op.in]: ['genealogy', 'genealogia', 'genealogía', ...REPRODUCTION_MODULE_VARIANTS] },
                [Op.or]: [{ canRead: true }, { canCreate: true }, { canUpdate: true }]
            }
        });
        if (hasRelatedPermission) return true;
    }

    if (moduleName === 'reproduction' && action === 'canRead' && req.path?.includes('/female/')) {
        const hasRabbitPermission = await WorkerPermission.findOne({
            where: {
                farmMemberId: membershipId,
                moduleName: { [Op.in]: ['rabbits', 'conejos', 'conejo'] },
                canRead: true
            }
        });
        if (hasRabbitPermission) return true;
    }

    if ((moduleName === 'rabbits' || moduleName === 'cages') && action === 'canRead') {
        const hasAssignmentPermission = await WorkerPermission.findOne({
            where: {
                farmMemberId: membershipId,
                moduleName: { [Op.in]: ['assignments', 'asignarjaula', 'asignaciones', 'asignar jaula', 'asignacion', 'asignación', 'asignar'] },
                [Op.or]: [{ canRead: true }, { canCreate: true }]
            }
        });
        if (hasAssignmentPermission) return true;
    }

    if ((moduleName === 'deworming' || moduleName === 'vaccination') && action === 'canRead') {
        const hasRabbitPermission = await WorkerPermission.findOne({
            where: {
                farmMemberId: membershipId,
                moduleName: { [Op.in]: ['rabbits', 'conejos', 'conejo'] },
                canRead: true
            }
        });
        if (hasRabbitPermission) return true;
    }

    if (REPORTABLE_MODULES.includes(moduleName) && action === 'canRead') {
        const hasReportsPermission = await WorkerPermission.findOne({
            where: {
                farmMemberId: membershipId,
                moduleName: { [Op.in]: ['reports', 'reportes', 'reporte'] },
                canRead: true
            }
        });
        if (hasReportsPermission) return true;
    }

    return false;
};

const hasWorkerPermission = async (membershipId, moduleName, action, req) => {
    const candidateNames = getCandidateModuleNames(moduleName);
    const permission = await WorkerPermission.findOne({
        where: {
            farmMemberId: membershipId,
            moduleName: { [Op.in]: candidateNames }
        }
    });

    if (permission?.[action]) return true;

    if (await checkControlModulesFallback(membershipId, moduleName, action)) return true;
    if (await checkReproductionFallbacks(membershipId, moduleName, action, req)) return true;
    if (await checkCrossModuleFallbacks(membershipId, moduleName, action, req)) return true;

    return false;
};

const throwPermissionError = (moduleName, action) => {
    const actionText = ACTION_DISPLAY_NAMES[action] || action;
    const moduleText = MODULE_DISPLAY_NAMES[moduleName] || moduleName;
    throw new AppError(`No tienes permisos para ${actionText} en el módulo ${moduleText}.`, 403);
};

/**
 * Middleware para autorizar acceso basado en el rol del usuario en su galpón activo
 * y sus permisos específicos si es trabajador.
 * 
 * @param {string} moduleName - Nombre del módulo [ej. 'cages', 'rabbits', 'deworming']
 * @param {string} action - Acción requerida ['canRead', 'canCreate', 'canUpdate', 'canDelete']
 */
const requirePermission = (moduleName, action) => {
    return async (req, res, next) => {
        try {
            const profile = req.user;
            
            if (moduleName === 'races') {
                return next();
            }

            if (!profile.activeGalponId) {
                throw new AppError('Debe seleccionar un galpón activo para realizar esta acción.', 403);
            }

            const membership = await FarmMember.findOne({
                where: { 
                    profileId: profile.id, 
                    galponId: profile.activeGalponId, 
                    status: 'active' 
                }
            });

            if (!membership) {
                throw new AppError('No tiene acceso al galpón activo o su membresía está inactiva.', 403);
            }

            if (membership.role === 'owner') {
                return next();
            }

            const isAuthorized = await hasWorkerPermission(membership.id, moduleName, action, req);
            if (!isAuthorized) {
                throwPermissionError(moduleName, action);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = { requirePermission };
