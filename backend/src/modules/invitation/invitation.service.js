const invitationRepository = require('./invitation.repository');
const farmMemberRepository = require('../farmMember/farmMember.repository');
const farmMemberService = require('../farmMember/farmMember.service');
const notificationService = require('../notification/notification.service');
const AppError = require('../../errors/AppError');

class InvitationService {
    /**
     * El propietario crea una invitación para un correo específico.
     */
    async createInvitation(galponId, email, requestingProfileId) {
        // Verificar que quien invita es propietario
        const ownerMembership = await farmMemberRepository.findMembership(requestingProfileId, galponId);
        if (!ownerMembership || ownerMembership.role !== 'owner' || ownerMembership.status !== 'active') {
            throw new AppError('No tienes permisos de propietario en este galpón.', 403);
        }

        // Verificar que el email no sea el mismo del usuario que invita (no invitarse a sí mismo)
        const { Profile } = require('../../domain/models');
        const requesterProfile = await Profile.findByPk(requestingProfileId);
        if (requesterProfile && requesterProfile.email.toLowerCase() === email.toLowerCase()) {
            throw new AppError('No puedes invitarte a ti mismo.', 400);
        }

        // Verificar que el usuario exista
        const invitedProfile = await Profile.findOne({ where: { email: email.toLowerCase() } });
        if (!invitedProfile) {
            throw new AppError('El usuario con este correo no está registrado en el sistema.', 400);
        }

        // Verificar que el usuario no sea ya trabajador en el mismo galpón
        const existingMembership = await farmMemberRepository.findMembership(invitedProfile.id, galponId);
        if (existingMembership && existingMembership.status === 'active') {
            throw new AppError('Este usuario ya es trabajador en este galpón.', 400);
        }

        // Verificar que no haya ya una invitación pendiente para ese email en ese galpón
        const existingPending = await invitationRepository.findPendingByEmail(email);
        const alreadyInvited = existingPending.find(i => i.galponId === Number(galponId));
        if (alreadyInvited) {
            throw new AppError('Ya existe una invitación pendiente para ese correo en este galpón.', 400);
        }

        const invitation = await invitationRepository.create({
            galponId,
            email: email.toLowerCase(),
            invitedBy: requestingProfileId,
            status: 'pending'
        });

        // Si el perfil existe, crear notificación de invitación
        const galpon = await invitationRepository.getGalponWithOwner(galponId);
        const inviterProfile = await Profile.findByPk(requestingProfileId);

        await notificationService.createNotification(invitedProfile.id, {
            type: 'invitation',
            title: 'Invitación a galpón',
            message: `Has sido invitado por ${inviterProfile?.fullName || 'un usuario'} a unirte como trabajador al galpón "${galpon.name}".`,
            data: {
                invitationToken: invitation.token,
                galponId: galpon.id,
                galponName: galpon.name,
                inviterName: inviterProfile?.fullName
            }
        });

        return invitation;
    }

    /**
     * Lista todas las invitaciones de un galpón (para el propietario).
     */
    async getInvitationsByGalpon(galponId, requestingProfileId) {
        const membership = await farmMemberRepository.findMembership(requestingProfileId, galponId);
        if (!membership || membership.role !== 'owner') {
            throw new AppError('No tienes permisos de propietario en este galpón.', 403);
        }
        return invitationRepository.findByGalponId(galponId);
    }

    /**
     * Retorna las invitaciones PENDIENTES para el email del usuario autenticado.
     * Se muestra al trabajador al iniciar sesión como notificación.
     */
    async getPendingInvitationsForMe(userEmail) {
        try {
            return await invitationRepository.findPendingByEmail(userEmail);
        } catch (error) {
            console.error('Error en getPendingInvitationsForMe:', error);
            throw error;
        }
    }

    /**
     * El trabajador acepta una invitación por su token.
     * Esto crea automáticamente el farm_member con role 'worker'.
     */
    async acceptInvitation(token, profileId, profileEmail) {
        const invitation = await invitationRepository.findByToken(token);
        if (!invitation) throw new AppError('Invitación no encontrada.', 404);
        if (invitation.status !== 'pending') throw new AppError('Esta invitación ya fue procesada.', 400);
        if (invitation.email !== profileEmail.toLowerCase()) {
            throw new AppError('Esta invitación no corresponde a tu cuenta.', 403);
        }

        // Crear el farm_member como worker
        await farmMemberService.createWorkerMembership(profileId, invitation.galponId);

        // Marcar invitación como aceptada
        await invitationRepository.updateStatus(invitation, 'accepted');

        // Establecer el galpón como activo en el perfil del trabajador
        const { Profile } = require('../../domain/models');
        await Profile.update({ activeGalponId: invitation.galponId }, { where: { id: profileId } });

        // Invalidar el cache del perfil
        const { clearCache } = require('../../common/middlewares/auth.middleware');
        clearCache(profileId);

        // Crear notificación al propietario
        const galpon = await invitationRepository.getGalponWithOwner(invitation.galponId);
        if (galpon && galpon.profileId) {
            // Obtener el perfil del trabajador para obtener su nombre de usuario
            const { Profile } = require('../../domain/models');
            const workerProfile = await Profile.findByPk(profileId);
            const workerName = workerProfile ? workerProfile.username : profileEmail;

            await notificationService.createNotification(galpon.profileId, {
                type: 'success',
                title: '¡Nuevo trabajador en tu galpón!',
                message: `${workerName} ha aceptado tu invitación para unirse al galpón "${galpon.name}".`,
                data: { galponId: galpon.id, galponName: galpon.name, workerEmail: profileEmail, workerName }
            });
        }

        // Crear notificación al trabajador
        await notificationService.createNotification(profileId, {
            type: 'success',
            title: '¡Te has unido al galpón!',
            message: `El galpón "${galpon.name}" ha sido agregado a tu lista de galpones y está activo.`,
            data: { galponId: galpon.id, galponName: galpon.name }
        });

        return invitation;
    }

    /**
     * El propietario revoca una invitación pendiente.
     */
    async revokeInvitation(token, requestingProfileId) {
        const invitation = await invitationRepository.findByToken(token);
        if (!invitation) throw new AppError('Invitación no encontrada.', 404);
        if (invitation.status !== 'pending') throw new AppError('Solo se pueden revocar invitaciones pendientes.', 400);

        // Permitir si el usuario es el propietario del galpón
        const membership = await farmMemberRepository.findMembership(requestingProfileId, invitation.galponId);
        const isOwner = membership && membership.role === 'owner';

        // O si el usuario es la persona invitada (cuyo email coincide con la invitación)
        const { Profile } = require('../../domain/models');
        const requesterProfile = await Profile.findByPk(requestingProfileId);
        const isInvitedUser = requesterProfile && requesterProfile.email.toLowerCase() === invitation.email.toLowerCase();

        if (!isOwner && !isInvitedUser) {
            throw new AppError('No tienes permisos para revocar esta invitación.', 403);
        }

        await invitationRepository.updateStatus(invitation, 'revoked');

        // Si fue el usuario invitado quien rechazó la invitación, notificar al propietario
        if (isInvitedUser) {
            const galpon = await invitationRepository.getGalponWithOwner(invitation.galponId);
            if (galpon && galpon.profileId) {
                const workerName = requesterProfile.username || requesterProfile.email;
                await notificationService.createNotification(galpon.profileId, {
                    type: 'info',
                    title: 'Invitación rechazada',
                    message: `${workerName} ha rechazado tu invitación para unirse al galpón "${galpon.name}".`,
                    data: {
                        galponId: galpon.id,
                        galponName: galpon.name,
                        workerEmail: invitation.email,
                        workerName
                    }
                });
            }
        }
    }
}

module.exports = new InvitationService();
