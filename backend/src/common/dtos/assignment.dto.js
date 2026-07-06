const toAssignmentDTO = (assignment) => ({
    id: assignment.id,
    cageId: assignment.cageId,
    rabbitId: assignment.rabbitId,
    galponId: assignment.galponId,
    status: assignment.status,
    assignedAt: assignment.assignedAt,
    rabbitCode: assignment.rabbit?.code,
    rabbitName: assignment.rabbit?.name,
    rabbitAge: assignment.rabbit?.age,
    rabbitWeight: assignment.rabbit?.weight,
    rabbitRace: assignment.rabbit?.race,
    cageNumber: assignment.cage?.number,
    cageType: assignment.cage?.type,
    photoUrl: assignment.rabbit?.imageUrl
});

module.exports = { toAssignmentDTO };
