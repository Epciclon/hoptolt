/**
 * Middleware para inyectar el profileId del usuario autenticado en req.tenantId.
 * Los servicios usarán req.tenantId para filtrar los datos.
 */

const tenantFilter = (req, res, next) => {
    try {
        // Si hay usuario autenticado, inyectar su profileId en req.tenantId
        if (req.user && req.user.id) {
            req.tenantId = req.user.id;
        }
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { tenantFilter };
