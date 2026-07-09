const toCleaningDTO = (cleaning) => ({
    id: cleaning.id,
    cageId: cleaning.cageId,
    cageNumber: cleaning.cageNumber || cleaning.Cage?.number,
    responsible: cleaning.responsible || (cleaning.profile ? cleaning.profile.fullName || cleaning.profile.username : 'Desconocido'),
    profile: cleaning.profile ? {
        username: cleaning.profile.username,
        fullName: cleaning.profile.fullName,
        email: cleaning.profile.email
    } : null,
    cleaningDate: cleaning.cleaningDate,
    rabbits: cleaning.rabbits || (cleaning.Cage?.assignments ? cleaning.Cage.assignments.map(a => a.rabbit).filter(Boolean) : [])
});

module.exports = { toCleaningDTO };
