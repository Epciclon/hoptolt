const toRaceDTO = (race, includeImage = false) => {
    const dto = {
        id: race.id,
        name: race.name,
        description: race.description,
        imageUrl: race.imageUrl,
        galponId: race.galponId
    };

    return dto;
};

module.exports = { toRaceDTO };
