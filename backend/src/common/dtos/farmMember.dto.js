const toFarmMemberDTO = (member) => ({
    id: member.id,
    galponId: member.galponId,
    profileId: member.profileId,
    role: member.role,
    status: member.status,
    createdAt: member.createdAt,
    // Incluir datos del perfil si viene con eager loading
    profile: member.profile
        ? { id: member.profile.id, username: member.profile.username, fullName: member.profile.fullName, email: member.profile.email }
        : undefined,
    // Incluir datos del galpón si viene con eager loading
    galpon: member.galpon
        ? { id: member.galpon.id, name: member.galpon.name, location: member.galpon.location }
        : undefined,
    permissions: member.permissions || undefined,
    assignedCages: member.assignedCages || undefined
});

module.exports = { toFarmMemberDTO };
