const toDewormingDTO = (deworming) => ({
    id: deworming.id,
    rabbitId: deworming.rabbitId,
    rabbitCode: deworming.rabbit ? deworming.rabbit.code : null,
    rabbitName: deworming.rabbit ? deworming.rabbit.name : null,
    dewormingDate: deworming.dewormingDate,
    galponId: deworming.galponId,
    profileId: deworming.profileId,
    rabbit: deworming.rabbit ? {
        code: deworming.rabbit.code,
        name: deworming.rabbit.name,
        race: deworming.rabbit.race,
        imageUrl: deworming.rabbit.imageUrl,
        assignments: deworming.rabbit.assignments ? deworming.rabbit.assignments.map(a => ({
            cage: a.cage ? {
                id: a.cage.id,
                number: a.cage.number
            } : null
        })) : []
    } : null,
    profile: deworming.profile ? {
        username: deworming.profile.username,
        fullName: deworming.profile.fullName,
        email: deworming.profile.email
    } : null
});

module.exports = { toDewormingDTO };
