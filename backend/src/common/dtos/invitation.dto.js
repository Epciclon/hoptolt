const toInvitationDTO = (inv) => ({
    id: inv.id,
    galponId: inv.galponId,
    email: inv.email,
    token: inv.token,
    status: inv.status,
    createdAt: inv.createdAt,
    // Incluir nombre del galpón si viene con eager loading
    galpon: inv.galpon
        ? { id: inv.galpon.id, name: inv.galpon.name, location: inv.galpon.location }
        : undefined,
    // Incluir información del invitador si viene con eager loading
    inviter: inv.inviter
        ? { id: inv.inviter.id, fullName: inv.inviter.fullName, username: inv.inviter.username }
        : undefined
});

module.exports = { toInvitationDTO };
