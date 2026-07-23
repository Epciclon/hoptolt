const farmMemberRepository = require('./farmMember.repository');
const { Galpon, Profile, Cage, Rabbit, Assignment } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const notificationService = require('../notification/notification.service');
const galponRepository = require('../galpon/galpon.repository');

class FarmMemberService {
    /**
     * Lista todos los trabajadores activos de un galpón.
     * Solo puede hacerlo el propietario del galpón.
     */
    async getWorkersByGalpon(galponId, requestingProfileId) {
        await this._assertOwner(galponId, requestingProfileId);
        const members = await farmMemberRepository.findByGalponId(galponId);
        // Solo retornar workers (no el propietario en la lista)
        return members.filter(m => m.role === 'worker');
    }

    /**
     * Lista TODOS los miembros activos de un galpón (incluyendo al propietario).
     * Útil para reportes y auditoría.
     */
    async getAllMembersByGalpon(galponId) {
        return farmMemberRepository.findByGalponId(galponId);
    }

    /**
     * Retorna todos los galpones donde participa el usuario (como owner o worker).
     */
    async getMembershipsForUser(profileId) {
        return farmMemberRepository.findByProfileId(profileId);
    }

    /**
     * Crea un FarmMember de tipo 'owner' cuando un usuario crea un galpón.
     * Llamado internamente desde galpon.service al crear un galpón.
     */
    async createOwnerMembership(profileId, galponId) {
        const existing = await farmMemberRepository.findMembership(profileId, galponId);
        if (existing) {
            // Si ya existe como inactive, reactivar como owner
            return farmMemberRepository.update(existing, { role: 'owner', status: 'active' });
        }
        return farmMemberRepository.create({ profileId, galponId, role: 'owner', status: 'active' });
    }

    /**
     * Crea un FarmMember de tipo 'worker' cuando se acepta una invitación.
     */
    async createWorkerMembership(profileId, galponId) {
        const existing = await farmMemberRepository.findMembership(profileId, galponId);
        if (existing?.status === 'active') {
            throw new AppError('Ya eres miembro de este galpón.', 400);
        }
        if (existing) {
            return farmMemberRepository.update(existing, { role: 'worker', status: 'active' });
        }
        return farmMemberRepository.create({ profileId, galponId, role: 'worker', status: 'active' });
    }

    /**
     * Obtiene un trabajador por ID con sus permisos y jaulas asignadas.
     * Solo el propietario del galpón puede ver estos detalles.
     */
    async getWorkerById(farmMemberId, requestingProfileId) {
        const member = await farmMemberRepository.findById(farmMemberId);
        if (!member) throw new AppError('Miembro no encontrado.', 404);
        
        await this._assertOwner(member.galponId, requestingProfileId);
        
        return member;
    }

    /**
     * Edita los datos de un trabajador (permisos y jaulas asignadas).
     * Solo el propietario del galpón puede editar.
     */
    async updateWorker(farmMemberId, data, requestingProfileId) {
        const member = await farmMemberRepository.findById(farmMemberId);
        if (!member) throw new AppError('Miembro no encontrado.', 404);
        if (member.role === 'owner') throw new AppError('No se puede editar al propietario del galpón.', 400);

        await this._assertOwner(member.galponId, requestingProfileId);

        // 1. Obtener estado anterior
        const oldCages = (member.assignedCages || []).map(c => c.cage.number);
        const oldModules = (member.permissions || [])
            .filter(p => p.canCreate || p.canRead || p.canUpdate || p.canDelete)
            .map(p => p.moduleName);

        // Actualizar permisos si se proporcionan
        if (data.permissions !== undefined) {
            await farmMemberRepository.replacePermissions(farmMemberId, data.permissions);
        }

        let newCagesNums = oldCages;
        // Actualizar jaulas si se proporcionan (solo jaulas con conejos asignados)
        if (data.cageIds !== undefined) {
            await this._validateOccupiedCages(data.cageIds, member.galponId);
            await farmMemberRepository.replaceWorkerCages(farmMemberId, data.cageIds);

            if (data.cageIds.length > 0) {
                const newCagesData = await Cage.findAll({ where: { id: data.cageIds } });
                newCagesNums = newCagesData.map(c => c.number);
            } else {
                newCagesNums = [];
            }
        }

        const newModules = data.permissions !== undefined 
            ? data.permissions.filter(p => p.canCreate || p.canRead || p.canUpdate || p.canDelete).map(p => p.moduleName)
            : oldModules;

        // Calcular diferencias
        const addedCages = newCagesNums.filter(c => !oldCages.includes(c));
        const removedCages = oldCages.filter(c => !newCagesNums.includes(c));
        const addedModules = newModules.filter(m => !oldModules.includes(m));
        const removedModules = oldModules.filter(m => !newModules.includes(m));

        // Enviar notificaciones si hubo cambios
        if (addedCages.length > 0 || addedModules.length > 0 || removedCages.length > 0 || removedModules.length > 0) {
            await this._sendUpdateNotifications(member, requestingProfileId, addedCages, addedModules, removedCages, removedModules);
        }

        return farmMemberRepository.findById(farmMemberId);
    }

    async _sendUpdateNotifications(member, requestingProfileId, addedCages, addedModules, removedCages, removedModules) {
        const ownerProfile = await Profile.findByPk(requestingProfileId);
        const galpon = await galponRepository.findById(member.galponId);
        
        const MODULE_NAMES = {
            feeding: 'alimentación', vaccination: 'vacunación', deworming: 'desparasitación',
            cleaning: 'limpieza', mortality: 'mortalidad', reproduction: 'reproducción y parto',
            reports: 'reportes', cages: 'jaulas', races: 'razas', rabbits: 'conejos',
            assignments: 'asignaciones', genealogy: 'genealogía'
        };
        const translate = (m) => MODULE_NAMES[m] || m;

        if (addedCages.length > 0 || addedModules.length > 0) {
            let parts = [];
            if (addedCages.length === 1) {
                parts.push(`la jaula ${addedCages[0]}`);
            } else if (addedCages.length > 1) {
                parts.push(`las jaulas ${addedCages.join(', ')}`);
            }
            
            if (addedModules.length === 1) {
                parts.push(`el proceso de ${translate(addedModules[0])}`);
            } else if (addedModules.length > 1) {
                parts.push(`los procesos de ${addedModules.map(translate).join(', ')}`);
            }
            
            await notificationService.createNotification(member.profileId, {
                type: 'info',
                title: 'Nuevas asignaciones',
                message: `${ownerProfile.username} te asignó ${parts.join(' y ')} en el galpón "${galpon.name}".`,
                data: { galponId: galpon.id }
            });
        }

        if (removedCages.length > 0 || removedModules.length > 0) {
            let parts = [];
            if (removedCages.length === 1) {
                parts.push(`la jaula ${removedCages[0]}`);
            } else if (removedCages.length > 1) {
                parts.push(`las jaulas ${removedCages.join(', ')}`);
            }
            
            if (removedModules.length === 1) {
                parts.push(`el proceso de ${translate(removedModules[0])}`);
            } else if (removedModules.length > 1) {
                parts.push(`los procesos de ${removedModules.map(translate).join(', ')}`);
            }
            
            await notificationService.createNotification(member.profileId, {
                type: 'info',
                title: 'Asignaciones removidas',
                message: `${ownerProfile.username} te quitó ${parts.join(' y ')} en el galpón "${galpon.name}".`,
                data: { galponId: galpon.id }
            });
        }
    }

    /**
     * Desvincula a un trabajador de un galpón (su cuenta permanece activa).
     * Solo el propietario puede hacer esto.
     */
    async removeWorker(farmMemberId, requestingProfileId) {
        const member = await farmMemberRepository.findById(farmMemberId);
        if (!member) throw new AppError('Miembro no encontrado.', 404);
        if (member.role === 'owner') throw new AppError('No se puede eliminar al propietario del galpón.', 400);

        await this._assertOwner(member.galponId, requestingProfileId);
        
        // Obtener información para notificaciones
        const galpon = await galponRepository.findById(member.galponId);
        const ownerProfile = await Profile.findByPk(requestingProfileId);

        await farmMemberRepository.deactivate(member);

        // Notificar al trabajador que fue eliminado del galpón
        await notificationService.createNotification(member.profileId, {
            type: 'error',
            title: 'Has sido eliminado del galpón',
            message: `Has sido eliminado del galpón "${galpon.name}" por ${ownerProfile.username}.`,
            data: { galponId: galpon.id, galponName: galpon.name, ownerName: ownerProfile.username }
        });
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    async _assertOwner(galponId, profileId) {
        const membership = await farmMemberRepository.findMembership(profileId, galponId);
        if (membership?.role !== 'owner' || membership?.status !== 'active') {
            throw new AppError('No tienes permisos de propietario en este galpón.', 403);
        }
    }

    async _validateOccupiedCages(cageIds, galponId) {
        if (!cageIds || cageIds.length === 0) return;
        
        await Promise.all(cageIds.map(async (cageId) => {
            const cage = await Cage.findOne({ where: { id: cageId, galponId } });
            if (!cage) throw new AppError(`La jaula ${cageId} no pertenece a este galpón.`, 400);
            
            const rabbitCount = await Assignment.count({ 
                where: { cageId, status: 'asignado' }
            });
            
            if (rabbitCount === 0) {
                throw new AppError(`La jaula #${cage.number} no tiene conejos asignados. Solo se pueden asignar jaulas ocupadas.`, 400);
            }
        }));
    }
}

module.exports = new FarmMemberService();
