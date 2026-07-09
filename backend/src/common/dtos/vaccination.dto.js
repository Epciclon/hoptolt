const toVaccinationDTO = (vaccination) => ({
    id: vaccination.id,
    rabbitId: vaccination.rabbitId,
    rabbitCode: vaccination.rabbit ? vaccination.rabbit.code : null,
    rabbitName: vaccination.rabbit ? vaccination.rabbit.name : null,
    vaccines: vaccination.vaccines || [],
    vaccinationDate: vaccination.vaccinationDate,
    galponId: vaccination.galponId,
    profileId: vaccination.profileId,
    rabbit: vaccination.rabbit ? {
        code: vaccination.rabbit.code,
        name: vaccination.rabbit.name,
        race: vaccination.rabbit.race,
        imageUrl: vaccination.rabbit.imageUrl,
        assignments: vaccination.rabbit.assignments ? vaccination.rabbit.assignments.map(a => ({
            cage: a.cage ? {
                id: a.cage.id,
                number: a.cage.number
            } : null
        })) : []
    } : null,
    profile: vaccination.profile ? {
        username: vaccination.profile.username,
        fullName: vaccination.profile.fullName,
        email: vaccination.profile.email
    } : null
});

module.exports = { toVaccinationDTO };
