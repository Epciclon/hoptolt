const { AuditLog, FarmMember, Profile, Notification } = require('../../domain/models');

/**
 * Registra un movimiento realizado por un trabajador en módulos sensibles de un galpón.
 * Si el usuario es propietario del galpón, no se registra para no saturar con acciones propias.
 */
async function recordWorkerChange({
    galponId,
    profileId,
    action, // 'crear' | 'modificar' | 'eliminar' | 'consultar'
    entity, // 'cages' | 'races' | 'rabbits' | 'assignments' | 'genealogy' | 'reports'
    entityId,
    itemName,
    summary,
    before,
    after
}) {
    try {
        if (!galponId || !profileId) return;

        // Comprobar membresía activa en el galpón
        const membership = await FarmMember.findOne({
            where: { galponId, profileId, status: 'active' }
        });

        // Solo se auditan las acciones hechas por trabajadores delegados
        if (!membership || membership.role !== 'worker') {
            return;
        }

        const profile = await Profile.findByPk(profileId);
        const workerName = profile?.fullName?.trim() || profile?.username?.trim() || 'Trabajador';

        const createdLog = await AuditLog.create({
            action,
            entity,
            entityId: Number(entityId) || 0,
            profileId,
            details: {
                galponId: Number(galponId),
                workerName,
                workerUsername: profile?.username || '',
                itemName: itemName || '',
                summary: summary || '',
                before: before || null,
                after: after || null
            }
        });

        // Notificar al dueño del galpón sobre esta acción sensible
        const ownerMember = await FarmMember.findOne({
            where: { galponId, role: 'owner', status: 'active' }
        });

        if (ownerMember?.profileId) {
            const ENTITY_LABELS = {
                cages: 'Jaulas',
                races: 'Razas',
                rabbits: 'Conejos',
                assignments: 'Asignaciones',
                genealogy: 'Genealogía',
                reports: 'Reportes'
            };
            const entityLabel = ENTITY_LABELS[entity] || entity;

            const { Op } = require('sequelize');
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            // Consultar todos los movimientos registrados hoy para este trabajador en este galpón
            const todayLogs = await AuditLog.findAll({
                where: {
                    profileId,
                    createdAt: { [Op.gte]: todayStart, [Op.lte]: todayEnd },
                    'details.galponId': Number(galponId)
                },
                order: [['createdAt', 'ASC']]
            });

            // Agrupar conteo de cambios por módulo
            const modulesMap = {};
            for (const log of todayLogs) {
                const ent = log.entity || 'general';
                modulesMap[ent] = (modulesMap[ent] || 0) + 1;
            }

            const distinctEntities = Object.keys(modulesMap);
            const totalChangesToday = todayLogs.length || 1;

            const modulesBreakdown = distinctEntities.map(ent => ({
                module: ent,
                label: ENTITY_LABELS[ent] || ent,
                count: modulesMap[ent]
            }));
            modulesBreakdown.sort((a, b) => b.count - a.count);

            // Armar mensaje claro y amigable sin paréntesis
            let message = '';
            if (totalChangesToday === 1) {
                if (entity === 'reports') {
                    message = action === 'descargar'
                        ? `**${workerName}** descargó el **${itemName || 'Reporte'}** en PDF`
                        : `**${workerName}** consultó la vista previa de **${itemName || 'Reportes'}**`;
                } else if (action === 'crear') {
                    message = itemName
                        ? `**${workerName}** agregó **${itemName}** en **${entityLabel}**`
                        : `**${workerName}** agregó un registro en **${entityLabel}**`;
                } else if (action === 'eliminar') {
                    message = itemName
                        ? `**${workerName}** eliminó **${itemName}** en **${entityLabel}**`
                        : `**${workerName}** eliminó un registro en **${entityLabel}**`;
                } else {
                    message = itemName
                        ? `**${workerName}** modificó **${itemName}** en **${entityLabel}**`
                        : `**${workerName}** modificó un registro en **${entityLabel}**`;
                }
            } else {
                message = `**${workerName}** realizó ${totalChangesToday} cambios hoy`;
            }

            // Buscar si ya existe una notificación de este trabajador en este galpón para el día de hoy
            const existingNotification = await Notification.findOne({
                where: {
                    profileId: ownerMember.profileId,
                    title: 'Control de Cambios',
                    createdAt: { [Op.gte]: todayStart, [Op.lte]: todayEnd },
                    'data.galponId': Number(galponId),
                    'data.workerProfileId': profileId
                },
                order: [['createdAt', 'DESC']]
            });

            if (existingNotification) {
                const updatedData = {
                    ...existingNotification.data,
                    changeCount: totalChangesToday,
                    modulesCount: distinctEntities.length,
                    modules: distinctEntities,
                    modulesBreakdown,
                    lastAction: action,
                    lastModule: entity,
                    lastModuleLabel: entityLabel,
                    lastItemName: itemName || '',
                    lastLogId: createdLog.id
                };

                existingNotification.changed('data', true);
                await existingNotification.update({
                    message,
                    data: updatedData,
                    read: false,
                    updatedAt: new Date()
                });
            } else {
                await Notification.create({
                    profileId: ownerMember.profileId,
                    type: 'info',
                    title: 'Control de Cambios',
                    message,
                    data: {
                        type: 'worker_sensitive_action',
                        module: entity,
                        moduleLabel: entityLabel,
                        galponId: Number(galponId),
                        action,
                        logId: createdLog.id,
                        lastLogId: createdLog.id,
                        workerName,
                        workerProfileId: profileId,
                        changeCount: totalChangesToday,
                        modulesCount: distinctEntities.length,
                        modules: distinctEntities,
                        modulesBreakdown,
                        lastItemName: itemName || '',
                        date: todayStart.toISOString().split('T')[0]
                    }
                });
            }
        }
    } catch (err) {
        console.error('Error al registrar movimiento en auditoría:', err);
    }
}

/**
 * Registra un movimiento o proceso automático ejecutado por HopTolt en un galpón.
 * No requiere profileId humano porque es ejecutado automáticamente por el sistema.
 */
async function recordSystemChange({
    galponId,
    action,
    entity,
    entityId = 0,
    itemName = '',
    summary = '',
    before = null,
    after = null
}) {
    try {
        if (!galponId) return null;

        const createdLog = await AuditLog.create({
            action,
            entity,
            entityId: Number(entityId) || 0,
            profileId: null,
            details: {
                galponId: Number(galponId),
                isSystem: true,
                systemActor: 'HopTolt',
                itemName: itemName || '',
                summary: summary || '',
                before: before || null,
                after: after || null
            }
        });

        return createdLog;
    } catch (err) {
        console.error('Error al registrar movimiento automático de HopTolt:', err);
        return null;
    }
}

module.exports = {
    recordWorkerChange,
    recordSystemChange
};

