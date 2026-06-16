const catchAsync = require('../../common/middlewares/catchAsync');
const invitationService = require('./invitation.service');
const { toInvitationDTO } = require('../../common/dtos/invitation.dto');

exports.createInvitation = catchAsync(async (req, res) => {
    const invitation = await invitationService.createInvitation(
        Number(req.params.galponId),
        req.body.email,
        req.user.id
    );
    res.status(201).json({ success: true, message: 'Invitación creada exitosamente.', invitation: toInvitationDTO(invitation) });
});

exports.getInvitationsByGalpon = catchAsync(async (req, res) => {
    const invitations = await invitationService.getInvitationsByGalpon(
        Number(req.params.galponId),
        req.user.id
    );
    res.status(200).json({ success: true, invitations: invitations.map(toInvitationDTO) });
});

exports.getMyPendingInvitations = catchAsync(async (req, res) => {
    const invitations = await invitationService.getPendingInvitationsForMe(req.user.email);
    res.status(200).json({ success: true, invitations: invitations.map(toInvitationDTO) });
});

exports.acceptInvitation = catchAsync(async (req, res) => {
    const invitation = await invitationService.acceptInvitation(
        req.params.token,
        req.user.id,
        req.user.email
    );
    res.status(200).json({
        success: true,
        message: `Te has unido al galpón "${invitation.galpon?.name || ''}" exitosamente.`,
        invitation: toInvitationDTO(invitation)
    });
});

exports.revokeInvitation = catchAsync(async (req, res) => {
    await invitationService.revokeInvitation(req.params.token, req.user.id);
    res.status(200).json({ success: true, message: 'Invitación revocada.' });
});
