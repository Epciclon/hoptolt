const toFeedingDTO = (feeding) => ({
    id: feeding.id,
    cageId: feeding.cageId,
    cageNumber: feeding.cage?.number,
    cageType: feeding.cage?.type,
    foodTypes: feeding.foodTypes,
    justification: feeding.justification,
    feedingDate: feeding.feedingDate,
    shift: feeding.shift,
    galponId: feeding.galponId,
    profileId: feeding.profileId,
    profileName: feeding.profile ? feeding.profile.fullName : 'Desconocido',
    profile: feeding.profile ? {
        username: feeding.profile.username,
        fullName: feeding.profile.fullName,
        email: feeding.profile.email
    } : null,
    rabbits: feeding.rabbitsSnapshot || (feeding.cage?.assignments 
        ? feeding.cage.assignments.map(a => a.rabbit).filter(Boolean)
        : [])
});

module.exports = { toFeedingDTO };
