const { FarmMember, Notification, Profile } = require('../../domain/models');
const { Op } = require('sequelize');

/**
 * Notifica al dueño del galpón cuando un trabajador registra una acción.
 * Consolida las actividades dentro del mismo módulo para evitar saturar con múltiples notificaciones.
 * Regla de estilo: CERO paréntesis, datos clave en negrilla adaptativa (**).
 *
 * @param {string} profileId - ID del perfil del trabajador que realiza la acción.
 * @param {number} galponId - ID del galpón.
 * @param {string} moduleName - Nombre interno del módulo (ej: 'feeding', 'cleaning').
 * @param {string} moduleLabel - Nombre visible del módulo (ej: 'Alimentación', 'Limpieza').
 * @param {number} itemCount - Cantidad de elementos registrados (ej: número de jaulas o conejos).
 * @param {string} unitName - Unidad registrada ('jaula', 'conejo', 'caso').
 */
async function notifyOwnerOnWorkerAction(profileId, galponId, moduleName, moduleLabel, itemCount = 1, unitName = 'jaula') {
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
                const safeCount = Math.max(1, Number(itemCount) || 1);

                // Buscar si ya existe una notificación no leída de este módulo y galpón hoy
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);

                const existingNotifications = await Notification.findAll({
                    where: {
                        profileId: ownerMember.profileId,
                        type: 'info',
                        createdAt: { [Op.gte]: todayStart }
                    },
                    order: [['createdAt', 'DESC']]
                });

                const existing = existingNotifications.find(n => {
                    const d = typeof n.data === 'string' ? JSON.parse(n.data || '{}') : (n.data || {});
                    return d.type === 'worker_action' && d.module === moduleName && Number(d.galponId) === Number(galponId) && !n.read;
                });

                if (existing) {
                    const d = typeof existing.data === 'string' ? JSON.parse(existing.data || '{}') : (existing.data || {});
                    const workers = (d && typeof d === 'object' && d.workers) ? { ...d.workers } : {};
                    const prevCount = workers[profileId]?.count || 0;
                    workers[profileId] = {
                        name: workerName,
                        count: prevCount + safeCount
                    };

                    const workersList = Object.values(workers);
                    const totalItems = workersList.reduce((acc, w) => acc + w.count, 0);
                    const unitPlural = totalItems === 1 ? unitName : (unitName === 'jaula' ? 'jaulas' : (unitName === 'conejo' ? 'conejos' : `${unitName}s`));

                    let message = '';
                    if (workersList.length === 1) {
                        message = `**${workerName}** registró ${moduleLabel.toLowerCase()} en **${totalItems} ${unitPlural}**`;
                    } else {
                        message = `**${workersList.length} trabajadores** registraron ${moduleLabel.toLowerCase()} en **${totalItems} ${unitPlural}**`;
                    }

                    existing.changed('data', true);
                    await existing.update({
                        title: `Registro de ${moduleLabel}`,
                        message,
                        data: {
                            type: 'worker_action',
                            module: moduleName,
                            moduleLabel,
                            galponId,
                            workers,
                            workersList,
                            totalCount: totalItems,
                            unitName,
                            lastWorkerName: workerName
                        },
                        read: false,
                        updatedAt: new Date()
                    });
                } else {
                    const workers = {
                        [profileId]: {
                            name: workerName,
                            count: safeCount
                        }
                    };
                    const workersList = [{ name: workerName, count: safeCount }];
                    const unitPlural = safeCount === 1 ? unitName : (unitName === 'jaula' ? 'jaulas' : (unitName === 'conejo' ? 'conejos' : `${unitName}s`));
                    const message = `**${workerName}** registró ${moduleLabel.toLowerCase()} en **${safeCount} ${unitPlural}**`;

                    await Notification.create({
                        profileId: ownerMember.profileId,
                        type: 'info',
                        title: `Registro de ${moduleLabel}`,
                        message,
                        data: {
                            type: 'worker_action',
                            module: moduleName,
                            moduleLabel,
                            galponId,
                            workers,
                            workersList,
                            totalCount: safeCount,
                            unitName,
                            lastWorkerName: workerName
                        }
                    });
                }
            }
        }
    } catch (error) {
        console.error(`Error notifying owner about worker action in ${moduleName}:`, error);
    }
}

module.exports = {
    notifyOwnerOnWorkerAction
};
