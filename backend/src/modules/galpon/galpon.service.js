const galponRepository = require('./galpon.repository');
const { Cage, FarmMember } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { getPaginationParams, createPaginatedResponse } = require('../../common/helpers/pagination.helper');
const { clearCache } = require('../../common/middlewares/auth.middleware');

class GalponService {
    /**
     * Crea un nuevo galpón y registra al usuario como propietario (owner).
     */
    async registerGalpon(data, profileId) {
        const { name, province, location, totalCapacity, foodTypes, vaccines, dewormingPeriod } = data;

        // Verificar si ya existe un galpón con el mismo nombre para este usuario
        const existing = await galponRepository.findByNameAndProfileId(name.trim(), profileId);
        if (existing) throw new AppError('El nombre del galpón ya está en uso.', 400);

        const galpon = await galponRepository.create({
            name: name.trim(),
            province,
            location: location.trim(),
            totalCapacity: Number(totalCapacity),
            foodTypes,
            vaccines,
            dewormingPeriod: Number(dewormingPeriod),
            profileId
        });

        // Crear membresía de propietario automáticamente
        await FarmMember.create({ profileId, galponId: galpon.id, role: 'owner', status: 'active' });

        // Establecer como activo en el perfil del usuario
        const { Profile } = require('../../domain/models');
        await Profile.update({ activeGalponId: galpon.id }, { where: { id: profileId } });

        // Invalidar el cache del perfil para que el middleware de autenticación obtenga el activeGalponId actualizado
        clearCache(profileId);

        return galpon;
    }

    async getGalponById(id) {
        const galpon = await galponRepository.findById(id);
        if (!galpon) throw new AppError('Galpón no encontrado.', 404);
        return galpon;
    }

    async getGalponByName(name) {
        if (!name || name.trim() === '') {
            throw new AppError('El nombre del galpón es obligatorio.', 400);
        }
        const galpon = await galponRepository.findByName(name.trim());
        if (!galpon) throw new AppError('Galpón no encontrado.', 404);
        return galpon;
    }

    /**
     * Retorna todos los galpones del usuario autenticado
     * (tanto donde es owner como donde es worker activo).
     * Con paginación para optimizar rendimiento.
     */
    async getAllGalpones(profileId, page = 1, limit = 10) {
        try {
            const { limit: limitValue, offset, page: pageValue } = getPaginationParams(page, limit);

            // Obtener galpones propios (owner) con paginación
            const ownGalpones = await galponRepository.findByProfileId(profileId, { limit: limitValue, offset });
            const ownGalponesWithRole = ownGalpones.map(g => ({
                ...g.get({ plain: true }),
                memberRole: 'owner'
            }));

            // Obtener galpones donde es worker (a través de FarmMember) con paginación
            const memberships = await FarmMember.findAll({
                where: { profileId, status: 'active', role: 'worker' },
                include: [{ association: 'galpon' }],
                limit: limitValue,
                offset
            });
            const workerGalpones = memberships.map(m => ({
                ...m.galpon.get({ plain: true }),
                memberRole: 'worker'
            }));

            // Combinar ambos (evitar duplicados)
            const allGalpones = [...ownGalponesWithRole];
            workerGalpones.forEach(wg => {
                if (!allGalpones.find(og => og.id === wg.id)) {
                    allGalpones.push(wg);
                }
            });

            // Obtener total para paginación
            const totalOwn = await galponRepository.countByProfileId(profileId);
            const totalWorker = await FarmMember.count({
                where: { profileId, status: 'active', role: 'worker' }
            });
            const total = totalOwn + totalWorker;

            return createPaginatedResponse(allGalpones, pageValue, limitValue, total);
        } catch (error) {
            console.error('Error en getAllGalpones:', error);
            throw error;
        }
    }

    async editGalpon(id, data, profileId) {
        const galpon = await galponRepository.findById(id);
        if (!galpon) throw new AppError('Galpón no encontrado.', 404);

        // Solo el propietario puede editar los detalles del galpón
        await this._assertOwner(id, profileId);

        if (data.totalCapacity) {
            const cageCount = await Cage.count({ where: { galponId: id } });
            if (cageCount > Number(data.totalCapacity)) {
                throw new AppError('No se puede reducir la capacidad total por debajo del número de jaulas existentes.', 400);
            }
        }

        return galponRepository.update(galpon, data);
    }

    async deleteGalpon(id, profileId) {
        const galpon = await galponRepository.findById(id);
        if (!galpon) throw new AppError('Galpón no encontrado.', 404);

        // Solo el propietario puede eliminar galpones (trabajadores nunca pueden eliminar)
        await this._assertOwner(id, profileId);

        const cageCount = await Cage.count({ where: { galponId: id } });
        if (cageCount > 0) {
            throw new AppError('No se puede eliminar un galpón que tiene jaulas asociadas.', 400);
        }

        await galponRepository.delete(galpon);
    }

    /**
     * El galpón activo ahora se almacena en el perfil del usuario (activeGalponId).
     */
    async getActiveGalpon(profileId) {
        const { Profile } = require('../../domain/models');
        const profile = await Profile.findByPk(profileId);
        if (!profile || !profile.activeGalponId) return null;
        
        const galpon = await galponRepository.findById(profile.activeGalponId);
        if (!galpon) return null;

        // Verificar si el usuario es propietario del galpón (creador)
        if (galpon.profileId === profileId) {
            return {
                ...galpon.get({ plain: true }),
                memberRole: 'owner'
            };
        }

        // Obtener el rol del usuario en este galpón a través de farm_members
        const membership = await FarmMember.findOne({
            where: { profileId, galponId: galpon.id, status: 'active' }
        });

        return {
            ...galpon.get({ plain: true }),
            memberRole: membership ? membership.role : null
        };
    }

    async setActiveGalpon(id, profileId) {
        const galpon = await galponRepository.findById(id);
        if (!galpon) throw new AppError('Galpón no encontrado.', 404);

        // Verificar que el usuario tiene membresía en ese galpón
        const membership = await FarmMember.findOne({
            where: { profileId, galponId: id, status: 'active' }
        });
        if (!membership) throw new AppError('No tienes acceso a este galpón.', 403);

        const { Profile } = require('../../domain/models');
        await Profile.update({ activeGalponId: id }, { where: { id: profileId } });

        return galpon;
    }

    async _assertOwner(galponId, profileId) {
        const membership = await FarmMember.findOne({
            where: { profileId, galponId, role: 'owner', status: 'active' }
        });
        if (!membership) throw new AppError('No tienes permisos de propietario en este galpón.', 403);
    }
}

module.exports = new GalponService();
