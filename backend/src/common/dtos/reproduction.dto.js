const toAvailableRabbitDTO = (rabbit) => ({
    id: rabbit.id,
    code: rabbit.code,
    name: rabbit.name,
    race: rabbit.race,
    age: rabbit.age,
    weight: rabbit.weight,
    imageUrl: rabbit.imageUrl,
    cageNumber: rabbit.assignments?.[0]?.cage?.number,
    cageType: rabbit.assignments?.[0]?.cage?.type,
    cageId: rabbit.assignments?.[0]?.cage?.id
});

const toReproductionDTO = (reproduction) => {
    const assignment = reproduction.female?.assignments?.[0] || null;
    const cage = assignment?.cage || null;
    const male = reproduction.male || null;

    let profileName = 'N/A';
    // El cron solo mueve a 'gestacion' o 'lactancia'
    const systemCanDoThis = ['gestacion', 'lactancia'].includes(reproduction.status);
    
    if (reproduction.updatedBySystem && systemCanDoThis) {
        profileName = 'Sistema Hoptolt';
    } else if (reproduction.profile) {
        profileName = reproduction.profile.fullName || reproduction.profile.username || reproduction.profile.email || 'N/A';
    }

    let profileObj = null;
    if (reproduction.profile) {
        profileObj = {
            username: reproduction.profile.username,
            fullName: reproduction.profile.fullName,
            email: reproduction.profile.email
        };
    }

    return {
        id: reproduction.id,
        femaleId: reproduction.femaleId,
        femaleCode: reproduction.female?.code || 'N/A',
        femaleName: reproduction.female?.name || '',
        femaleRace: reproduction.female?.race || '',
        femaleSex: reproduction.female?.sex || '',
        femaleBirthDate: reproduction.female?.birthDate || null,
        femaleAge: reproduction.female?.age,
        femaleWeight: reproduction.female?.weight,
        femalePurpose: reproduction.female?.purpose || '',
        maleId: reproduction.maleId,
        maleCode: male?.code || null,
        maleName: male?.name || '',
        maleRace: male?.race || '',
        maleSex: male?.sex || '',
        maleBirthDate: male?.birthDate || null,
        maleWeight: male?.weight || null,
        malePurpose: male?.purpose || '',
        maleImageUrl: male?.imageUrl || null,
        isMaleDeleted: !!male?.deletedAt,
        isFemaleDeleted: !reproduction.female || !!reproduction.female.deletedAt,
        mountDate: reproduction.mountDate,
        estimatedBirthDate: reproduction.estimatedBirthDate,
        bornKits: reproduction.bornKits,
        cancellationReason: reproduction.cancellationReason,
        status: reproduction.status,
        createdAt: reproduction.createdAt,
        updatedAt: reproduction.updatedAt,
        imageUrl: reproduction.female?.imageUrl || null,
        cageNumber: cage?.number || null,
        cageType: cage?.type || null,
        galponId: reproduction.galponId,
        profileName: profileName,
        profile: profileObj
    };
};

const toCalendarEntryDTO = (r, type, cage) => {
    if (type === 'receptive') {
        return {
            id: r.id, femaleId: r.femaleId, femaleCode: r.femaleCode, femaleName: r.femaleName,
            femaleImageUrl: r.femaleImageUrl || null, receptiveDate: r.receptiveDate,
            cageNumber: r.cageNumber, cageType: r.cageType, type: 'receptive'
        };
    } else if (type === 'weaning') {
        return {
            id: r.id, femaleId: r.femaleId, femaleCode: r.female?.code || 'N/A', femaleName: r.female?.name || '',
            femaleImageUrl: r.female?.imageUrl || null, maleId: r.maleId, maleCode: r.male?.code || null,
            maleName: r.male?.name || null, maleImageUrl: r.male?.imageUrl || null, mountDate: r.mountDate,
            estimatedBirthDate: r.estimatedBirthDate, estimatedWeaningDate: r.estimatedWeaningDate,
            cageNumber: cage?.number || null, cageType: cage?.type || null, type: 'weaning'
        };
    }
    return {
        id: r.id, femaleId: r.femaleId, femaleCode: r.female?.code || 'N/A', femaleName: r.female?.name || '',
        femaleImageUrl: r.female?.imageUrl || null, maleId: r.maleId, maleCode: r.male?.code || null,
        maleName: r.male?.name || null, maleImageUrl: r.male?.imageUrl || null, mountDate: r.mountDate,
        estimatedBirthDate: r.estimatedBirthDate, cageNumber: cage?.number || null, cageType: cage?.type || null,
        type: 'births'
    };
};

module.exports = { toAvailableRabbitDTO, toReproductionDTO, toCalendarEntryDTO };
