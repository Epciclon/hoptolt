const toGalponDTO = (galpon) => ({
    id: galpon.id,
    name: galpon.name,
    province: galpon.province,
    location: galpon.location,
    totalCapacity: galpon.totalCapacity,
    foodTypes: galpon.foodTypes,
    vaccines: galpon.vaccines,
    dewormingPeriod: galpon.dewormingPeriod,
    profileId: galpon.profileId,
    memberRole: galpon.memberRole,
    createdAt: galpon.createdAt
});

module.exports = { toGalponDTO };
