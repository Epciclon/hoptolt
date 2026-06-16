const cleaningRepository = require('./cleaning.repository');
const { Cage, FarmMember } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { getPaginationParams, createPaginatedResponse } = require('../../common/helpers/pagination.helper');

class CleaningService {
    async registerCleaning(data, galponId, profileId) {
        const { cageIds } = data;

        if (!Array.isArray(cageIds) || cageIds.length === 0) {
            throw new AppError('Debe seleccionar al menos una jaula.', 400);
        }

        const { Cage, FarmMember, Profile } = require('../../domain/models');

        // Obtener el nombre del responsable desde su perfil de usuario
        const profile = await Profile.findByPk(profileId);
        if (!profile) throw new AppError('Usuario no encontrado.', 404);
        
        let responsibleName = 'Sistema';
        if (profile.fullName && profile.fullName.trim() !== '') {
            responsibleName = profile.fullName;
        } else if (profile.username && profile.username.trim() !== '') {
            responsibleName = profile.username;
        } else if (profile.email && profile.email.trim() !== '') {
            responsibleName = profile.email;
        }
        responsibleName = responsibleName.trim();

        // Obtener el miembro del galpón
        const membership = await FarmMember.findOne({
            where: { profileId, galponId, status: 'active' }
        });
        if (!membership) throw new AppError('No tienes acceso a este galpón.', 403);

        const createdCleanings = [];

        for (const cageId of cageIds) {
            const cage = await Cage.findByPk(cageId);
            if (!cage) throw new AppError(`La jaula con ID ${cageId} no existe.`, 404);
            if (cage.galponId !== galponId) throw new AppError(`La jaula #${cage.number} no pertenece al galpón activo.`, 400);

            // Si es trabajador, verificar asignación de jaula
            if (membership.role === 'worker') {
                const { WorkerCage } = require('../../domain/models');
                const workerCage = await WorkerCage.findOne({
                    where: { farmMemberId: membership.id, cageId }
                });
                if (!workerCage) {
                    throw new AppError(`No tienes asignada la jaula #${cage.number} para registrar su limpieza.`, 403);
                }
            }

            const cleaning = await cleaningRepository.create({
                cageId,
                cageNumber: cage.number,
                cleaningDate: new Date(),
                galponId,
                profileId
            });

            const cleaningJson = cleaning.toJSON();
            cleaningJson.responsible = responsibleName;
            createdCleanings.push(cleaningJson);

            // Eliminar notificaciones de advertencia de limpieza previas de forma segura y global
            const { Notification } = require('../../domain/models');
            const warnings = await Notification.findAll({
                where: { type: 'warning' }
            });
            for (const w of warnings) {
                if (w.data) {
                    let dataObj = w.data;
                    if (typeof dataObj === 'string') {
                        try { dataObj = JSON.parse(dataObj); } catch (e) { continue; }
                    }
                    if (dataObj && dataObj.type === 'cleaning_warning' && Number(dataObj.cageId) === Number(cageId)) {
                        await w.destroy();
                    }
                }
            }
        }

        return createdCleanings;
    }

    async getCleanings(galponId, profileId, page = 1, limit = 10) {
        if (!galponId) return createPaginatedResponse([], page, limit, 0);

        // Verificar que el usuario tiene acceso al galpón
        const membership = await FarmMember.findOne({
            where: { profileId, galponId, status: 'active' }
        });
        if (!membership) throw new AppError('No tienes acceso a este galpón.', 403);

        let cageIds = null;
        if (membership.role === 'worker') {
            const { WorkerCage } = require('../../domain/models');
            const workerCages = await WorkerCage.findAll({
                where: { farmMemberId: membership.id }
            });
            cageIds = workerCages.map(wc => wc.cageId);
        }

        const { limit: limitValue, offset, page: pageValue } = getPaginationParams(page, limit);
        const cleanings = await cleaningRepository.findByGalponId(galponId, { limit: limitValue, offset }, cageIds);
        const total = await cleaningRepository.countByGalponId(galponId, cageIds);

        const mappedCleanings = cleanings.map(c => {
            const plain = c.toJSON();
            let name = 'Sistema';
            if (plain.profile) {
                if (plain.profile.fullName && plain.profile.fullName.trim() !== '') {
                    name = plain.profile.fullName;
                } else if (plain.profile.username && plain.profile.username.trim() !== '') {
                    name = plain.profile.username;
                } else if (plain.profile.email && plain.profile.email.trim() !== '') {
                    name = plain.profile.email;
                }
            }
            return {
                ...plain,
                responsible: name.trim()
            };
        });

        return createPaginatedResponse(mappedCleanings, pageValue, limitValue, total);
    }
}

module.exports = new CleaningService();
