const toIncidentDTO = (incident) => {
    if (!incident) return null;
    const data = typeof incident.toJSON === 'function' ? incident.toJSON() : incident;
    return {
        id: data.id,
        galponId: data.galponId,
        profileId: data.profileId,
        module: data.module,
        cageId: data.cageId,
        cages: data.cages || [],
        rabbitId: data.rabbitId,
        category: data.category,
        title: data.title,
        description: data.description,
        status: data.status,
        ownerResponse: data.ownerResponse,
        reviewedBy: data.reviewedBy,
        reviewedAt: data.reviewedAt,
        workerRead: data.workerRead,
        ownerRead: data.ownerRead,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        reporter: data.reporter || null,
        reviewer: data.reviewer || null,
        cage: data.cage || null,
        rabbit: data.rabbit || null
    };
};

module.exports = { toIncidentDTO };

