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
        if (existing && existing.status === 'active') {
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

        // Actualizar permisos si se proporcionan
        if (data.permissions !== undefined) {
            await farmMemberRepository.replacePermissions(farmMemberId, data.permissions);
        }

        // Actualizar jaulas si se proporcionan (solo jaulas con conejos asignados)
        if (data.cageIds !== undefined) {
            await this._validateOccupiedCages(data.cageIds, member.galponId);
            await farmMemberRepository.replaceWorkerCages(farmMemberId, data.cageIds);
        }

        return farmMemberRepository.findById(farmMemberId);
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
        const workerProfile = await profileRepository.findById(member.profileId);
        const ownerProfile = await profileRepository.findById(requestingProfileId);

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
        if (!membership || membership.role !== 'owner' || membership.status !== 'active') {
            throw new AppError('No tienes permisos de propietario en este galpón.', 403);
        }
    }

    async _validateOccupiedCages(cageIds, galponId) {
        if (!cageIds || cageIds.length === 0) return;
        for (const cageId of cageIds) {
            const cage = await Cage.findOne({ where: { id: cageId, galponId } });
            if (!cage) throw new AppError(`La jaula ${cageId} no pertenece a este galpón.`, 400);
            const rabbitCount = await Assignment.count({ 
                where: { cageId, status: 'asignado' }
            });
            if (rabbitCount === 0) {
                throw new AppError(`La jaula #${cage.number} no tiene conejos asignados. Solo se pueden asignar jaulas ocupadas.`, 400);
            }
        }
    }
}

module.exports = new FarmMemberService();
