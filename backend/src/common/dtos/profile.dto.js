const toProfileDTO = (profile) => ({
    id: profile.id,
    username: profile.username,
    email: profile.email,
    fullName: profile.fullName,
    activeGalponId: profile.activeGalponId,
    createdAt: profile.createdAt,
    role: profile.role,
    permissions: profile.permissions
});

module.exports = { toProfileDTO };
