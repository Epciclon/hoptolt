const { Galpon } = require('../../domain/models');
const AppError = require('../../errors/AppError');

exports.galponContext = async (req, res, next) => {
    try {
        // Usar el activeGalponId del perfil del usuario
        if (!req.user.activeGalponId) {
            throw new AppError('No hay un galpón activo seleccionado.', 400);
        }

        const activeGalpon = await Galpon.findByPk(req.user.activeGalponId);
        if (!activeGalpon) {
            throw new AppError('El galpón activo no existe.', 404);
        }

        req.activeGalpon = activeGalpon;
        req.galponId = activeGalpon.id;
        next();
    } catch (error) {
        next(error);
    }
};
