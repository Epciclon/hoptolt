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

        const { Profile } = require('../../domain/models');

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

        const { Cage, WorkerCage, Assignment, Rabbit, Notification } = require('../../domain/models');
        const { Op } = require('sequelize');

        // Precarga de Jaulas
        const cages = await Cage.findAll({ where: { id: { [Op.in]: cageIds } } });
        const cageMap = new Map();
        for (const c of cages) cageMap.set(c.id, c);

        // Precarga de Permisos (si es worker)
        const workerCagesSet = new Set();
        if (membership.role === 'worker') {
            const workerCages = await WorkerCage.findAll({
                where: { farmMemberId: membership.id, cageId: { [Op.in]: cageIds } }
            });
            for (const wc of workerCages) workerCagesSet.add(wc.cageId);
        }

        // Precarga de Asignaciones y Conejos
        const assignments = await Assignment.findAll({
            where: { cageId: { [Op.in]: cageIds }, status: 'asignado' },
            include: [{ model: Rabbit, as: 'rabbit', attributes: ['id', 'code', 'name', 'race', 'imageUrl'] }]
        });
        const assignmentsMap = new Map();
        for (const a of assignments) {
            if (!assignmentsMap.has(a.cageId)) assignmentsMap.set(a.cageId, []);
            assignmentsMap.get(a.cageId).push(a);
        }

        const createdCleanings = [];
        const processedCageIds = [];
        const toCreate = [];

        // Validación en memoria
        for (const cageId of cageIds) {
            const cage = cageMap.get(cageId);
            if (!cage) throw new AppError(`La jaula con ID ${cageId} no existe.`, 404);
            if (cage.galponId !== galponId) throw new AppError(`La jaula #${cage.number} no pertenece al galpón activo.`, 400);

            if (membership.role === 'worker' && !workerCagesSet.has(cageId)) {
                throw new AppError(`No tienes asignada la jaula #${cage.number} para registrar su limpieza.`, 403);
            }

            const cageAssignments = assignmentsMap.get(cageId) || [];
            const rabbitsSnapshot = cageAssignments.map(a => a.rabbit).filter(Boolean);

            toCreate.push({
                cageId,
                cageNumber: cage.number,
                cleaningDate: new Date(),
                galponId,
                profileId,
                rabbitsSnapshot,
                responsibleName // Propiedad temporal para construir el JSON después
            });
        }

        // Inserción masiva/concurrente
        const createdRecords = await Promise.all(toCreate.map(data => 
            cleaningRepository.create({
                cageId: data.cageId,
                cageNumber: data.cageNumber,
                cleaningDate: data.cleaningDate,
                galponId: data.galponId,
                profileId: data.profileId,
                rabbitsSnapshot: data.rabbitsSnapshot
            })
        ));

        // Formateo de respuesta
        for (let i = 0; i < createdRecords.length; i++) {
            const cleaningJson = createdRecords[i].toJSON();
            cleaningJson.responsible = toCreate[i].responsibleName;
            cleaningJson.rabbits = toCreate[i].rabbitsSnapshot;
            createdCleanings.push(cleaningJson);
            processedCageIds.push(toCreate[i].cageId);
        }

        // Limpieza de advertencias en batch (background) para evitar cuellos de botella de N+1
        this._bulkClearCleaningWarnings(processedCageIds, galponId, Notification).catch(err => console.error("Error clearing warnings:", err));

        const { notifyOwnerOnWorkerAction } = require('../../common/helpers/notification.helper');
        await notifyOwnerOnWorkerAction(profileId, galponId, 'cleaning', 'Limpieza');

        return createdCleanings;
    }

    async _bulkClearCleaningWarnings(cageIds, galponId, Notification) {
        if (!cageIds || cageIds.length === 0) return;
        const { FarmMember } = require('../../domain/models');
        const owner = await FarmMember.findOne({ where: { galponId, role: 'owner', status: 'active' }});
        
        const whereClause = {
            type: 'warning',
            title: 'Alerta de Limpieza Requerida'
        };
        if (owner) {
            whereClause.profileId = owner.profileId;
        }

        const warnings = await Notification.findAll({ where: whereClause });
        const toDestroy = [];
        
        for (const w of warnings) {
            if (!w.data) continue;
            let dataObj = typeof w.data === 'string' ? JSON.parse(w.data) : w.data;
            if (dataObj?.type === 'cleaning_warning' && cageIds.includes(Number(dataObj.cageId))) {
                toDestroy.push(w.id);
            }
        }

        if (toDestroy.length > 0) {
            await Notification.destroy({ where: { id: toDestroy } });
        }
    }

    async getCleanings(galponId, profileId, page = 1, limit = 10, filters = {}) {
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
        
        const queryOptions = filters.all ? {} : { limit: limitValue, offset };
        
        const cleanings = await cleaningRepository.findByGalponId(galponId, queryOptions, cageIds, filters);
        const total = await cleaningRepository.countByGalponId(galponId, cageIds, filters);

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
            let rabbits = [];
            if (plain.rabbitsSnapshot && (Array.isArray(plain.rabbitsSnapshot) ? plain.rabbitsSnapshot.length > 0 : Object.keys(plain.rabbitsSnapshot).length > 0)) {
                rabbits = typeof plain.rabbitsSnapshot === 'string' ? JSON.parse(plain.rabbitsSnapshot) : plain.rabbitsSnapshot;
            } else if (plain.Cage?.assignments) {
                rabbits = plain.Cage.assignments.map(a => a.rabbit).filter(Boolean);
            }
            delete plain.Cage; // Clean up just in case

            return {
                ...plain,
                responsible: name.trim(),
                rabbits
            };
        });

        return createPaginatedResponse(mappedCleanings, filters.all ? 1 : pageValue, filters.all ? mappedCleanings.length : limitValue, total);
    }
}

module.exports = new CleaningService();
