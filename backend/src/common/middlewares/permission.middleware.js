const AppError = require('../../errors/AppError');
const { FarmMember } = require('../../domain/models');

/**
 * Middleware para verificar si el usuario tiene permisos específicos
 * @param {string} moduleName - Nombre del módulo (ej: 'cages', 'rabbits', 'feeding')
 * @param {string} action - Acción requerida (ej: 'canCreate', 'canRead', 'canUpdate', 'canDelete')
 */
const getMembershipData = async (req) => {
    const profileId = req.user.id;
    
    const { Profile, Galpon } = require('../../domain/models');
    const profile = await Profile.findByPk(profileId);
    
    if (!profile?.activeGalponId) {
        throw new AppError('No tienes un galpón activo seleccionado.', 403);
    }

    const galpon = await Galpon.findByPk(profile.activeGalponId);
    
    if (galpon && galpon.profileId === profileId) {
        return { isOwner: true, activeGalponId: profile.activeGalponId };
    }

    const membership = await FarmMember.findOne({
        where: { 
            profileId, 
            galponId: profile.activeGalponId, 
            status: 'active',
            role: 'worker'
        },
        include: [{ association: 'permissions' }]
    });

    if (!membership) {
        throw new AppError('No tienes acceso a este galpón.', 403);
    }

    return { isOwner: false, activeGalponId: profile.activeGalponId, membership };
};

const checkPermission = (moduleName, action) => {
    return async (req, res, next) => {
        try {
            const data = await getMembershipData(req);
            
            if (data.isOwner) {
                return next();
            }

            const permission = data.membership.permissions.find(p => p.moduleName === moduleName);
            
            if (!permission?.[action]) {
                throw new AppError(`No tienes permiso para ${action} en el módulo ${moduleName}.`, 403);
            }

            req.activeGalponId = data.activeGalponId;
            req.workerCages = data.membership.workerCages?.map(wc => wc.cageId) || [];
            
            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Middleware para verificar si el usuario puede acceder a un módulo específico
 * (cualquier acción del módulo)
 */
const checkModuleAccess = (moduleName) => {
    return async (req, res, next) => {
        try {
            const data = await getMembershipData(req);
            
            if (data.isOwner) {
                return next();
            }

            const permission = data.membership.permissions.find(p => p.moduleName === moduleName);
            
            if (!permission) {
                throw new AppError(`No tienes acceso al módulo ${moduleName}.`, 403);
            }

            const hasAnyPermission = permission.canCreate || permission.canRead || permission.canUpdate || permission.canDelete;
            
            if (!hasAnyPermission) {
                throw new AppError(`No tienes permisos en el módulo ${moduleName}.`, 403);
            }

            req.activeGalponId = data.activeGalponId;
            req.workerCages = data.membership.workerCages?.map(wc => wc.cageId) || [];
            
            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Middleware para filtrar datos por jaulas asignadas al trabajador
 * Debe usarse después de checkPermission o checkModuleAccess
 */
const filterByWorkerCages = (cageIdParam = 'cageId') => {
    return (req, res, next) => {
        if (req.user.role === 'owner') {
            return next(); // Los propietarios tienen acceso a todas las jaulas
        }

        const workerCages = req.workerCages || [];
        const requestedCageId = req.params[cageIdParam] || req.body[cageIdParam];

        if (requestedCageId && !workerCages.includes(Number(requestedCageId))) {
            throw new AppError('No tienes acceso a esta jaula.', 403);
        }

        next();
    };
};

module.exports = {
    checkPermission,
    checkModuleAccess,
    filterByWorkerCages
};
