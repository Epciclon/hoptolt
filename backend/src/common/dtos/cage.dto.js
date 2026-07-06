const toCageDTO = (cage) => ({
    id: cage.id,
    number: cage.number,
    type: cage.type,
    capacity: cage.capacity,
    status: cage.status,
    galponId: cage.galponId,
    assignedCount: cage.assignedCount,
    occupancyStatus: cage.occupancyStatus
});

module.exports = { toCageDTO };
