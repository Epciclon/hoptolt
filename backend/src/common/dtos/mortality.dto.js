const toMortalityDTO = (m) => {
    let name = 'Sistema';
    if (m.profile) {
        if (m.profile.fullName && m.profile.fullName.trim() !== '') {
            name = m.profile.fullName;
        } else if (m.profile.username && m.profile.username.trim() !== '') {
            name = m.profile.username;
        } else if (m.profile.email && m.profile.email.trim() !== '') {
            name = m.profile.email;
        }
    }
    return {
        id: m.id,
        rabbitId: m.rabbitId,
        rabbitCode: m.rabbit ? m.rabbit.code : 'N/A',
        rabbitName: m.rabbit ? m.rabbit.name : 'N/A',
        rabbitRace: m.rabbit ? m.rabbit.race : 'N/A',
        rabbitImageUrl: m.rabbit ? m.rabbit.imageUrl : null,
        cause: m.cause,
        observations: m.observations,
        responsible: name,
        profileUsername: m.profile ? m.profile.username : null,
        profileEmail: m.profile ? m.profile.email : null,
        deathDate: m.deathDate,
        isKits: m.isKits,
        numberOfKits: m.numberOfKits,
        galponId: m.galponId,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt
    };
};

module.exports = { toMortalityDTO };
