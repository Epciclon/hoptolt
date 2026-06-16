const toAssignmentDTO = (assignment) => ({
    id: assignment.id,
    cageId: assignment.cageId,
    rabbitId: assignment.rabbitId,
    galponId: assignment.galponId,
    status: assignment.status,
    assignedAt: assignment.assignedAt,
    rabbitCode: assignment.rabbit?.code,
    rabbitName: assignment.rabbit?.name,
    cageNumber: assignment.cage?.number,
    cageType: assignment.cage?.type
});

module.exports = { toAssignmentDTO };
