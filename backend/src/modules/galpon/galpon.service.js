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

        const { Profile } = require('../../domain/models');
        await Promise.all([
            FarmMember.create({ profileId, galponId: galpon.id, role: 'owner', status: 'active' }),
            Profile.update({ activeGalponId: galpon.id }, { where: { id: profileId } })
        ]);

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

            const [ownGalpones, memberships, totalOwn, totalWorker] = await Promise.all([
                galponRepository.findByProfileId(profileId, { limit: limitValue, offset }),
                FarmMember.findAll({
                    where: { profileId, status: 'active', role: 'worker' },
                    include: [{ association: 'galpon' }],
                    limit: limitValue,
                    offset
                }),
                galponRepository.countByProfileId(profileId),
                FarmMember.count({
                    where: { profileId, status: 'active', role: 'worker' }
                })
            ]);

            const ownGalponesWithRole = ownGalpones.map(g => ({
                ...g.get({ plain: true }),
                memberRole: 'owner'
            }));

            const workerGalpones = memberships.map(m => ({
                ...m.galpon.get({ plain: true }),
                memberRole: 'worker'
            }));

            const allGalpones = [...ownGalponesWithRole];
            workerGalpones.forEach(wg => {
                if (!allGalpones.some(og => og.id === wg.id)) {
                    allGalpones.push(wg);
                }
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

        const [, cageCount] = await Promise.all([
            this._assertOwner(id, profileId),
            data.totalCapacity ? Cage.count({ where: { galponId: id } }) : Promise.resolve(0)
        ]);

        if (data.totalCapacity && cageCount > Number(data.totalCapacity)) {
            throw new AppError('No se puede reducir la capacidad total por debajo del número de jaulas existentes.', 400);
        }

        return galponRepository.update(galpon, data);
    }

    async deleteGalpon(id, profileId) {
        const galpon = await galponRepository.findById(id);
        if (!galpon) throw new AppError('Galpón no encontrado.', 404);

        const [, cageCount] = await Promise.all([
            this._assertOwner(id, profileId),
            Cage.count({ where: { galponId: id } })
        ]);

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
        if (!profile?.activeGalponId) return null;
        
        const [galpon, membership] = await Promise.all([
            galponRepository.findById(profile.activeGalponId),
            FarmMember.findOne({
                where: { profileId, galponId: profile.activeGalponId, status: 'active' }
            })
        ]);
        if (!galpon) return null;

        if (galpon.profileId === profileId) {
            return {
                ...galpon.get({ plain: true }),
                memberRole: 'owner'
            };
        }

        return {
            ...galpon.get({ plain: true }),
            memberRole: membership ? membership.role : null
        };
    }

    async setActiveGalpon(id, profileId) {
        const [galpon, membership] = await Promise.all([
            galponRepository.findById(id),
            FarmMember.findOne({
                where: { profileId, galponId: id, status: 'active' }
            })
        ]);
        if (!galpon) throw new AppError('Galpón no encontrado.', 404);
        if (!membership) throw new AppError('No tienes acceso a este galpón.', 403);

        const { Profile } = require('../../domain/models');
        await Profile.update({ activeGalponId: id }, { where: { id: profileId } });
        clearCache(profileId);

        return galpon;
    }

    async getGalponStats(galponId) {
        const galpon = await galponRepository.findById(galponId);
        if (!galpon) throw new AppError('Galpón no encontrado', 404);

        const { Rabbit, Reproduction } = require('../../domain/models');
        
        const [maleRabbits, femaleRabbits, plannedBirths, lactatingFemales, matingFemales] = await Promise.all([
            Rabbit.count({ where: { galponId, sex: 'macho' } }),
            Rabbit.count({ where: { galponId, sex: 'hembra' } }),
            Reproduction.count({ where: { galponId, status: 'gestacion' } }),
            Reproduction.count({ where: { galponId, status: 'lactancia' } }),
            Reproduction.count({ where: { galponId, status: 'monta' } })
        ]);
        
        return { maleRabbits, femaleRabbits, plannedBirths, lactatingFemales, matingFemales };
    }

    async _assertOwner(galponId, profileId) {
        const membership = await FarmMember.findOne({
            where: { profileId, galponId, role: 'owner', status: 'active' }
        });
        if (!membership) throw new AppError('No tienes permisos de propietario en este galpón.', 403);
    }
}

module.exports = new GalponService();
