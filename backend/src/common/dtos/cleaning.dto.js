const toCleaningDTO = (cleaning) => {
    let snapshotRabbits = null;
    if (cleaning.rabbitsSnapshot && (Array.isArray(cleaning.rabbitsSnapshot) ? cleaning.rabbitsSnapshot.length > 0 : Object.keys(cleaning.rabbitsSnapshot).length > 0)) {
        snapshotRabbits = typeof cleaning.rabbitsSnapshot === 'string' ? JSON.parse(cleaning.rabbitsSnapshot) : cleaning.rabbitsSnapshot;
    }

    return {
        id: cleaning.id,
        cageId: cleaning.cageId,
        cageNumber: cleaning.cageNumber || cleaning.Cage?.number,
        responsible: cleaning.responsible || (cleaning.profile ? cleaning.profile.fullName || cleaning.profile.username || cleaning.profile.email : 'Desconocido'),
        profile: cleaning.profile ? {
            username: cleaning.profile.username,
            fullName: cleaning.profile.fullName,
            email: cleaning.profile.email
        } : null,
        cleaningDate: cleaning.cleaningDate,
        rabbits: cleaning.rabbits || snapshotRabbits || (cleaning.Cage?.assignments ? cleaning.Cage.assignments.map(a => a.rabbit).filter(Boolean) : [])
    };
};

module.exports = { toCleaningDTO };
