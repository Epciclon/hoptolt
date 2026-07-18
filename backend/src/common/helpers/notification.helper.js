const { FarmMember, Notification, Profile } = require('../../domain/models');

/**
 * Notifies the owner of a galpón when a worker registers an action.
 * @param {string} profileId - The profile ID of the user performing the action.
 * @param {number} galponId - The ID of the galpón.
 * @param {string} moduleName - The internal module name (e.g., 'feeding').
 * @param {string} moduleLabel - The user-friendly module name (e.g., 'Alimentación').
 */
async function notifyOwnerOnWorkerAction(profileId, galponId, moduleName, moduleLabel) {
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
                const workerName = workerMember.profile?.fullName || workerMember.profile?.username || 'Un trabajador';
                await Notification.create({
                    profileId: ownerMember.profileId,
                    type: 'info',
                    title: 'Registro de Actividad',
                    message: `${workerName} registró ${moduleLabel}`,
                    data: {
                        type: 'worker_action',
                        module: moduleName,
                        profileId: workerMember.profileId
                    }
                });
            }
        }
    } catch (error) {
        console.error(`Error notifying owner about worker action in ${moduleName}:`, error);
    }
}

module.exports = {
    notifyOwnerOnWorkerAction
};
