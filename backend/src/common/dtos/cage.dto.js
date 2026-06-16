const toCageDTO = (cage) => ({
    id: cage.id,
    number: cage.number,
    type: cage.type,
    capacity: cage.capacity,
    status: cage.status,
    galponId: cage.galponId
});

module.exports = { toCageDTO };
