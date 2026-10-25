const AppError = require('../../errors/AppError');
const { FarmMember, WorkerPermission } = require('../../domain/models');

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

/**
 * Middleware para autorizar acceso basado en el rol del usuario en su galpón activo
 * y sus permisos específicos si es trabajador.
 * 
 * @param {string} moduleName - Nombre del módulo (ej. 'cages', 'rabbits', 'deworming')
 * @param {string} action - Acción requerida ('canRead', 'canCreate', 'canUpdate', 'canDelete')
 */
const requirePermission = (moduleName, action) => {
    return async (req, res, next) => {
        try {
            const profile = req.user; // Asignado por auth.middleware.js
            
            // El módulo de races no requiere galpón activo, ya que las razas son por perfil
            if (moduleName === 'races') {
                // Los propietarios tienen acceso total a razas
                return next();
            }

            if (!profile.activeGalponId) {
                throw new AppError('Debe seleccionar un galpón activo para realizar esta acción.', 403);
            }

            // Verificar si el usuario es miembro activo del galpón seleccionado
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

            // Los propietarios ('owner') tienen acceso total a todos los módulos
            if (membership.role === 'owner') {
                return next();
            }

            // Para trabajadores ('worker'), buscar sus permisos específicos en este módulo
            const { Op } = require('sequelize');
            const candidateNames = new Set([
                moduleName,
                moduleName.toLowerCase(),
                spanishToEnglishMap[moduleName.toLowerCase()],
                englishToSpanishMap[moduleName.toLowerCase()]
            ].filter(Boolean));

            if (candidateNames.has('feeding') || candidateNames.has('alimentacion')) {
                candidateNames.add('alimentación');
                candidateNames.add('Alimentación');
            }
            if (candidateNames.has('vaccination') || candidateNames.has('vacunacion')) {
                candidateNames.add('vacunación');
                candidateNames.add('Vacunación');
            }
            if (candidateNames.has('deworming') || candidateNames.has('desparasitacion')) {
                candidateNames.add('desparasitación');
                candidateNames.add('Desparasitación');
            }
            if (candidateNames.has('cleaning') || candidateNames.has('limpieza')) {
                candidateNames.add('Limpieza');
            }
            if (candidateNames.has('mortality') || candidateNames.has('mortalidad')) {
                candidateNames.add('Mortalidad');
            }
            if (candidateNames.has('reproduction') || candidateNames.has('reproduccionyparto')) {
                candidateNames.add('reproducción y parto');
                candidateNames.add('Reproducción y Parto');
            }

            let permission = await WorkerPermission.findOne({
                where: {
                    farmMemberId: membership.id,
                    moduleName: { [Op.in]: Array.from(candidateNames) }
                }
            });

            // Si se solicita acceso a assignments.canRead y el trabajador tiene permisos de control,
            // conceder acceso automáticamente
            if (moduleName === 'assignments' && action === 'canRead' && !permission?.[action]) {
                const hasControlPermission = await WorkerPermission.findOne({
                    where: {
                        farmMemberId: membership.id,
                        moduleName: { [Op.in]: CONTROL_MODULES },
                        [Op.or]: [
                            { canRead: true },
                            { canCreate: true }
                        ]
                    }
                });
                
                if (hasControlPermission) {
                    // Conceder acceso automático a assignments.canRead
                    return next();
                }
            }

            // Si se solicita registrar genealogía (canCreate) y el trabajador tiene permiso de reproducción (canCreate),
            // permitir el registro ya que el destete de crías en reproducción vincula automáticamente su árbol
            if (moduleName === 'genealogy' && action === 'canCreate' && !permission?.[action]) {
                const hasReproductionPermission = await WorkerPermission.findOne({
                    where: {
                        farmMemberId: membership.id,
                        moduleName: { [Op.in]: ['reproduction', 'reproduccion', 'reproduccionyparto', 'reproducción y parto'] },
                        canCreate: true
                    }
                });

                if (hasReproductionPermission) {
                    return next();
                }
            }

            // Si se solicita registrar mortalidad (canCreate) y el trabajador tiene permiso de reproducción (canCreate o canUpdate),
            // permitir el registro de bajas de gazapos durante lactancia o muerte de la coneja en gestación
            if (moduleName === 'mortality' && action === 'canCreate' && !permission?.[action]) {
                const hasReproductionPermission = await WorkerPermission.findOne({
                    where: {
                        farmMemberId: membership.id,
                        moduleName: { [Op.in]: ['reproduction', 'reproduccion', 'reproduccionyparto', 'reproducción y parto'] },
                        [Op.or]: [{ canCreate: true }, { canUpdate: true }]
                    }
                });

                if (hasReproductionPermission) {
                    return next();
                }
            }

            // Si se solicita consultar mortalidad (canRead) y el trabajador tiene permiso de reproducción (canRead),
            // permitir la consulta de bajas de gazapos para el panel e historial reproductivo
            if (moduleName === 'mortality' && action === 'canRead' && !permission?.[action]) {
                const hasReproductionPermission = await WorkerPermission.findOne({
                    where: {
                        farmMemberId: membership.id,
                        moduleName: { [Op.in]: ['reproduction', 'reproduccion', 'reproduccionyparto', 'reproducción y parto'] },
                        canRead: true
                    }
                });

                if (hasReproductionPermission) {
                    return next();
                }
            }

            // Si se solicita registrar conejo (canCreate) y el trabajador tiene permiso de reproducción (canCreate o canUpdate),
            // permitir el registro ya que en el destete se incorporan las nuevas crías
            if (moduleName === 'rabbits' && action === 'canCreate' && !permission?.[action]) {
                const hasReproductionPermission = await WorkerPermission.findOne({
                    where: {
                        farmMemberId: membership.id,
                        moduleName: { [Op.in]: ['reproduction', 'reproduccion', 'reproduccionyparto', 'reproducción y parto'] },
                        [Op.or]: [{ canCreate: true }, { canUpdate: true }]
                    }
                });

                if (hasReproductionPermission) {
                    return next();
                }
            }

            // Si se solicita consultar conejos (canRead) y el trabajador tiene permisos en genealogía o reproducción,
            // permitir la consulta para mostrar el catálogo genealógico, sugerir nombres y cargar datos de parejas
            if (moduleName === 'rabbits' && action === 'canRead' && !permission?.[action]) {
                const hasRelatedPermission = await WorkerPermission.findOne({
                    where: {
                        farmMemberId: membership.id,
                        moduleName: { [Op.in]: ['genealogy', 'genealogia', 'genealogía', 'reproduction', 'reproduccion', 'reproduccionyparto', 'reproducción y parto'] },
                        [Op.or]: [{ canRead: true }, { canCreate: true }, { canUpdate: true }]
                    }
                });

                if (hasRelatedPermission) {
                    return next();
                }
            }

            // Si se solicita consultar historial reproductivo de una coneja y el trabajador tiene permiso en conejos (canRead)
            if (moduleName === 'reproduction' && action === 'canRead' && !permission?.[action] && req.path?.includes('/female/')) {
                const hasRabbitPermission = await WorkerPermission.findOne({
                    where: {
                        farmMemberId: membership.id,
                        moduleName: { [Op.in]: ['rabbits', 'conejos', 'conejo'] },
                        canRead: true
                    }
                });

                if (hasRabbitPermission) {
                    return next();
                }
            }

            // Si se solicita cancelar reproducción con estado fallido (aborto, no preñada) y el trabajador tiene canUpdate
            if (moduleName === 'reproduction' && action === 'canDelete' && req.body?.action === 'fail' && !permission?.[action]) {
                const hasUpdatePermission = await WorkerPermission.findOne({
                    where: {
                        farmMemberId: membership.id,
                        moduleName: { [Op.in]: ['reproduction', 'reproduccion', 'reproduccionyparto', 'reproducción y parto'] },
                        canUpdate: true
                    }
                });

                if (hasUpdatePermission) {
                    return next();
                }
            }

            // Si se solicita consultar conejos o jaulas (canRead) y el trabajador tiene permisos en asignaciones (canRead o canCreate),
            // permitir la consulta para poblar los selectores de asignación
            if ((moduleName === 'rabbits' || moduleName === 'cages') && action === 'canRead' && !permission?.[action]) {
                const hasAssignmentPermission = await WorkerPermission.findOne({
                    where: {
                        farmMemberId: membership.id,
                        moduleName: { [Op.in]: ['assignments', 'asignarjaula', 'asignaciones', 'asignar jaula', 'asignacion', 'asignación', 'asignar'] },
                        [Op.or]: [{ canRead: true }, { canCreate: true }]
                    }
                });

                if (hasAssignmentPermission) {
                    return next();
                }
            }

            // Si se solicita consultar vacunaciones o desparasitaciones y el trabajador tiene permiso de conejos (canRead),
            // permitir la lectura para visualizar la ficha médica del conejo
            if ((moduleName === 'deworming' || moduleName === 'vaccination') && action === 'canRead' && !permission?.[action]) {
                const hasRabbitPermission = await WorkerPermission.findOne({
                    where: {
                        farmMemberId: membership.id,
                        moduleName: { [Op.in]: ['rabbits', 'conejos', 'conejo'] },
                        canRead: true
                    }
                });

                if (hasRabbitPermission) {
                    return next();
                }
            }

            // Si se solicita consultar datos operativos para generar reportes y el trabajador tiene permiso en reportes (canRead),
            // permitir la lectura de los módulos del reporte (alimentación, limpieza, vacunación, desparasitación, mortalidad, reproducción)
            const reportableModules = ['feeding', 'cleaning', 'deworming', 'vaccination', 'mortality', 'reproduction'];
            if (reportableModules.includes(moduleName) && action === 'canRead' && !permission?.[action]) {
                const hasReportsPermission = await WorkerPermission.findOne({
                    where: {
                        farmMemberId: membership.id,
                        moduleName: { [Op.in]: ['reports', 'reportes', 'reporte'] },
                        canRead: true
                    }
                });

                if (hasReportsPermission) {
                    return next();
                }
            }

            if (!permission?.[action]) {
                const actionNames = {
                    canRead: 'consultar',
                    canCreate: 'crear',
                    canUpdate: 'editar',
                    canDelete: 'eliminar'
                };
                const moduleDisplayNames = {
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
                const actionText = actionNames[action] || action;
                const moduleText = moduleDisplayNames[moduleName] || moduleName;
                throw new AppError(`No tienes permisos para ${actionText} en el módulo ${moduleText}.`, 403);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = { requirePermission };
