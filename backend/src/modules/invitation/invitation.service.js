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
        const { Profile } = require('../../domain/models');

        const [ownerMembership, requesterProfile, invitedProfile, existingPending] = await Promise.all([
            farmMemberRepository.findMembership(requestingProfileId, galponId),
            Profile.findByPk(requestingProfileId),
            Profile.findOne({ where: { email: email.toLowerCase() } }),
            invitationRepository.findPendingByEmail(email)
        ]);

        if (ownerMembership?.role !== 'owner' || ownerMembership?.status !== 'active') {
            throw new AppError('No tienes permisos de propietario en este galpón.', 403);
        }

        if (requesterProfile && requesterProfile.email.toLowerCase() === email.toLowerCase()) {
            throw new AppError('No puedes invitarte a ti mismo.', 400);
        }

        if (!invitedProfile) {
            throw new AppError('El usuario con este correo no está registrado en el sistema.', 400);
        }

        const existingMembership = await farmMemberRepository.findMembership(invitedProfile.id, galponId);
        if (existingMembership?.status === 'active') {
            throw new AppError('Este usuario ya es trabajador en este galpón.', 400);
        }

        const alreadyInvited = existingPending.some(i => i.galponId === Number(galponId));
        if (alreadyInvited) {
            throw new AppError('Ya existe una invitación pendiente para ese correo en este galpón.', 400);
        }

        const [invitation, galpon] = await Promise.all([
            invitationRepository.create({
                galponId,
                email: email.toLowerCase(),
                invitedBy: requestingProfileId,
                status: 'pending'
            }),
            invitationRepository.getGalponWithOwner(galponId)
        ]);

        const inviterName = requesterProfile?.fullName?.trim() || requesterProfile?.username || 'el propietario';

        await notificationService.createNotification(invitedProfile.id, {
            type: 'invitation',
            title: 'Invitación a galpón',
            message: `Has sido invitado por ${inviterName} a unirte como trabajador al galpón "${galpon.name}".`,
            data: {
                invitationToken: invitation.token,
                galponId: galpon.id,
                galponName: galpon.name,
                inviterName
            }
        });

        return invitation;
    }

    /**
     * Lista todas las invitaciones de un galpón (para el propietario).
     */
    async getInvitationsByGalpon(galponId, requestingProfileId) {
        const membership = await farmMemberRepository.findMembership(requestingProfileId, galponId);
        if (membership?.role !== 'owner') {
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

        const { Profile } = require('../../domain/models');
        const [, , , galpon, workerProfile] = await Promise.all([
            farmMemberService.createWorkerMembership(profileId, invitation.galponId),
            invitationRepository.updateStatus(invitation, 'accepted'),
            Profile.update({ activeGalponId: invitation.galponId }, { where: { id: profileId } }),
            invitationRepository.getGalponWithOwner(invitation.galponId),
            Profile.findByPk(profileId)
        ]);

        const { clearCache } = require('../../common/middlewares/auth.middleware');
        clearCache(profileId);

        const notificationPromises = [];
        if (galpon?.profileId) {
            const workerName = workerProfile?.fullName?.trim() || workerProfile?.username || profileEmail;
            notificationPromises.push(
                notificationService.createNotification(galpon.profileId, {
                    type: 'info',
                    title: '¡Nuevo trabajador en tu galpón!',
                    message: `${workerName} ha aceptado tu invitación para unirse al galpón "${galpon.name}".`,
                    data: { galponId: galpon.id, galponName: galpon.name, workerEmail: profileEmail, workerName }
                })
            );
        }

        notificationPromises.push(
            notificationService.createNotification(profileId, {
                type: 'info',
                title: '¡Te has unido al galpón!',
                message: `El galpón "${galpon.name}" ha sido agregado a tu lista de galpones y está activo.`,
                data: { galponId: galpon.id, galponName: galpon.name }
            })
        );

        await Promise.all(notificationPromises);

        return invitation;
    }

    /**
     * El propietario revoca una invitación pendiente.
     */
    async revokeInvitation(token, requestingProfileId) {
        const invitation = await invitationRepository.findByToken(token);
        if (!invitation) throw new AppError('Invitación no encontrada.', 404);
        if (invitation.status !== 'pending') throw new AppError('Solo se pueden revocar invitaciones pendientes.', 400);

        const { Profile } = require('../../domain/models');
        const [membership, requesterProfile] = await Promise.all([
            farmMemberRepository.findMembership(requestingProfileId, invitation.galponId),
            Profile.findByPk(requestingProfileId)
        ]);

        const isOwner = membership?.role === 'owner';
        const isInvitedUser = requesterProfile && requesterProfile.email.toLowerCase() === invitation.email.toLowerCase();

        if (!isOwner && !isInvitedUser) {
            throw new AppError('No tienes permisos para revocar esta invitación.', 403);
        }

        await invitationRepository.updateStatus(invitation, 'revoked');

        if (isInvitedUser) {
            const galpon = await invitationRepository.getGalponWithOwner(invitation.galponId);
            if (galpon?.profileId) {
                const workerName = requesterProfile?.fullName?.trim() || requesterProfile?.username || requesterProfile.email;
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
