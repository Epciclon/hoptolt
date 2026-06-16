const toFeedingDTO = (feeding) => ({
    id: feeding.id,
    cageId: feeding.cageId,
    cageNumber: feeding.cage?.number,
    cageType: feeding.cage?.type,
    foodTypes: feeding.foodTypes,
    justification: feeding.justification,
    feedingDate: feeding.feedingDate,
    galponId: feeding.galponId
});

module.exports = { toFeedingDTO };
