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

            if (!permission?.[action]) {
                const actionNames = {
                    canRead: 'leer',
                    canCreate: 'crear',
                    canUpdate: 'modificar',
                    canDelete: 'eliminar'
                };
                throw new AppError(`No tiene permisos para ${actionNames[action]} en el módulo ${moduleName}.`, 403);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = { requirePermission };
