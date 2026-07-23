const { FarmMember, Notification, Profile } = require('../../domain/models');
const reproductionRepository = require('../../modules/reproduction/reproduction.repository');

/**
 * Notifies the owner when a worker manually advances a reproduction phase.
 */
async function notifyOwnerOnManualPhaseChange(profileId, galponId, reproductionId, newPhase, newPhaseName) {
    try {
        const workerMember = await FarmMember.findOne({
            where: { profileId, galponId, status: 'active' },
            include: [{ model: Profile, as: 'profile' }]
        });

        if (workerMember?.role === 'worker') {
            const ownerMember = await FarmMember.findOne({
                where: { galponId, role: 'owner', status: 'active' }
            });

            if (ownerMember?.profileId) {
                const rep = await reproductionRepository.findByIdWithDetails(reproductionId);
                const code = rep?.female?.code || 'N/A';
                const name = rep?.female?.name ? ` ${rep.female.name}` : '';
                const workerName = workerMember.profile?.fullName || workerMember.profile?.username || 'Un trabajador';
                
                await Notification.create({
                    profileId: ownerMember.profileId,
                    type: 'info',
                    title: 'Cambio de Fase Manual',
                    message: `${workerName} ha movido manualmente a la coneja ${code}${name} a Fase ${newPhase} ${newPhaseName}.`,
                    data: {
                        type: 'reproduction_manual',
                        reproductionId,
                        phase: newPhase
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error notifying owner on manual phase change:', error);
    }
}

async function _notifyWorkersForPhaseChange(WorkerPermission, WorkerCage, Notification, workers, cageId, message, dataPayload) {
    await Promise.all(workers.map(async (worker) => {
        if (!worker.profileId) return;

        const hasPermission = await WorkerPermission.findOne({
            where: { farmMemberId: worker.id, moduleName: 'reproduccionyparto', canRead: true }
        });
        
        if (!hasPermission) return;
        
        const isAssigned = await WorkerCage.findOne({
            where: { farmMemberId: worker.id, cageId }
        });
        
        if (!isAssigned) return;
        
        await Notification.create({
            profileId: worker.profileId,
            type: 'info',
            title: 'Cambio de Fase Automático',
            message,
            data: dataPayload
        });
    }));
}

/**
 * Notifies the owner and relevant workers when the cron automatically advances a reproduction phase.
 */
async function notifyAutomatedPhaseChange(rep, newPhase, newPhaseName) {
    try {
        const { WorkerPermission, WorkerCage, Notification } = require('../../domain/models');
        const reproductionRepository = require('../../modules/reproduction/reproduction.repository');

        const fullRep = await reproductionRepository.findByIdWithDetails(rep.id);
        const female = fullRep?.female;
        if (!female) return;

        const code = female.code || 'N/A';
        const name = female.name ? ` ${female.name}` : '';
        const cageId = female.assignments?.[0]?.cageId;

        const ownerMember = await FarmMember.findOne({
            where: { galponId: rep.galponId, role: 'owner', status: 'active' }
        });

        const message = `El sistema Hoptolt ha movido automáticamente a la coneja ${code}${name} a Fase ${newPhase} ${newPhaseName}.`;
        const dataPayload = { type: 'reproduction_automated', phase: newPhase };

        if (ownerMember?.profileId) {
            await Notification.create({
                profileId: ownerMember.profileId,
                type: 'info',
                title: 'Cambio de Fase Automático',
                message,
                data: dataPayload
            });
        }

        if (cageId) {
            const workers = await FarmMember.findAll({
                where: { galponId: rep.galponId, role: 'worker', status: 'active' }
            });

            await _notifyWorkersForPhaseChange(WorkerPermission, WorkerCage, Notification, workers, cageId, message, dataPayload);
        }
    } catch (error) {
        console.error('Error notifying automated phase change:', error);
    }
}

module.exports = {
    notifyOwnerOnManualPhaseChange,
    notifyAutomatedPhaseChange
};
