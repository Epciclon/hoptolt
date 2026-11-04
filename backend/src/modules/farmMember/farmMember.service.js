const farmMemberRepository = require('./farmMember.repository');
const { Profile, Cage, Assignment, Notification, WorkerPermission, AuditLog } = require('../../domain/models');
const { Sequelize, Op } = require('sequelize');
const AppError = require('../../errors/AppError');
const notificationService = require('../notification/notification.service');
const galponRepository = require('../galpon/galpon.repository');
const { recordWorkerChange } = require('../../common/helpers/audit.helper');

class FarmMemberService {
    /**
     * Lista todos los trabajadores activos de un galpón.
     * Solo puede hacerlo el propietario del galpón.
     */
    async getWorkersByGalpon(galponId, requestingProfileId) {
        const [, members] = await Promise.all([
            this._assertOwner(galponId, requestingProfileId),
            farmMemberRepository.findByGalponId(galponId)
        ]);
        return members.filter(m => m.role === 'worker');
    }

    /**
     * Lista TODOS los miembros de un galpón (incluyendo activos, inactivos y al propietario).
     * Útil para reportes y auditoría histórica.
     */
    async getAllMembersByGalpon(galponId) {
        return farmMemberRepository.findByGalponId(galponId, true);
    }

    /**
     * Retorna todos los galpones donde participa el usuario (como owner o worker).
     */
    async getMembershipsForUser(profileId) {
        return farmMemberRepository.findByProfileId(profileId);
    }

    /**
     * Crea un FarmMember de tipo 'owner' cuando un usuario crea un galpón.
     * Llamado internamente desde galpon.service al crear un galpón.
     */
    async createOwnerMembership(profileId, galponId) {
        const existing = await farmMemberRepository.findMembership(profileId, galponId);
        if (existing) {
            return farmMemberRepository.update(existing, { role: 'owner', status: 'active' });
        }
        return farmMemberRepository.create({ profileId, galponId, role: 'owner', status: 'active' });
    }

    /**
     * Crea un FarmMember de tipo 'worker' cuando se acepta una invitación.
     */
    async createWorkerMembership(profileId, galponId) {
        const existing = await farmMemberRepository.findMembership(profileId, galponId);
        if (existing?.status === 'active') {
            throw new AppError('Ya eres miembro de este galpón.', 400);
        }
        if (existing) {
            await Promise.all([
                farmMemberRepository.replacePermissions(existing.id, []),
                farmMemberRepository.replaceWorkerCages(existing.id, [])
            ]);
            return farmMemberRepository.update(existing, { role: 'worker', status: 'active' });
        }
        return farmMemberRepository.create({ profileId, galponId, role: 'worker', status: 'active' });
    }

    /**
     * Obtiene un trabajador por ID con sus permisos y jaulas asignadas.
     * Solo el propietario del galpón puede ver estos detalles.
     */
    async getWorkerById(farmMemberId, requestingProfileId) {
        const member = await farmMemberRepository.findById(farmMemberId);
        if (!member) throw new AppError('Miembro no encontrado.', 404);
        
        await this._assertOwner(member.galponId, requestingProfileId);
        
        return member;
    }

    /**
     * Edita los datos de un trabajador (permisos y jaulas asignadas).
     * Solo el propietario del galpón puede editar.
     */
    async updateWorker(farmMemberId, data, requestingProfileId) {
        const member = await farmMemberRepository.findById(farmMemberId);
        if (!member) throw new AppError('Miembro no encontrado.', 404);
        if (member.role === 'owner') throw new AppError('No se puede editar al propietario del galpón.', 400);

        await this._assertOwner(member.galponId, requestingProfileId);

        // 1. Obtener estado anterior
        const oldCages = (member.assignedCages || []).map(c => c.cage.number);
        const oldModules = (member.permissions || [])
            .filter(p => p.canCreate || p.canRead || p.canUpdate || p.canDelete)
            .map(p => p.moduleName);

        // Actualizar permisos si se proporcionan
        if (data.permissions !== undefined) {
            await farmMemberRepository.replacePermissions(farmMemberId, data.permissions);
        }

        let newCagesNums = oldCages;
        // Actualizar jaulas si se proporcionan (solo jaulas con conejos asignados)
        if (data.cageIds !== undefined) {
            await this._validateOccupiedCages(data.cageIds, member.galponId);
            await farmMemberRepository.replaceWorkerCages(farmMemberId, data.cageIds);

            if (data.cageIds.length > 0) {
                const newCagesData = await Cage.findAll({ where: { id: data.cageIds } });
                newCagesNums = newCagesData.map(c => c.number);
            } else {
                newCagesNums = [];
            }
        }

        const newModules = data.permissions !== undefined 
            ? data.permissions.filter(p => p.canCreate || p.canRead || p.canUpdate || p.canDelete).map(p => p.moduleName)
            : oldModules;

        // Calcular diferencias
        const addedCages = newCagesNums.filter(c => !oldCages.includes(c));
        const removedCages = oldCages.filter(c => !newCagesNums.includes(c));
        const addedModules = newModules.filter(m => !oldModules.includes(m));
        const removedModules = oldModules.filter(m => !newModules.includes(m));

        // Enviar notificaciones y sincronizar aviso de responsabilidad en paralelo
        await Promise.all([
            (addedCages.length > 0 || addedModules.length > 0 || removedCages.length > 0 || removedModules.length > 0)
                ? this._sendUpdateNotifications(member, requestingProfileId, addedCages, addedModules, removedCages, removedModules)
                : Promise.resolve(),
            this._syncContractNotification(member, requestingProfileId, addedModules)
        ]);

        return farmMemberRepository.findById(farmMemberId);
    }

    async _sendUpdateNotifications(member, requestingProfileId, addedCages, addedModules, removedCages, removedModules) {
        const [ownerProfile, galpon] = await Promise.all([
            Profile.findByPk(requestingProfileId),
            galponRepository.findById(member.galponId)
        ]);
        const ownerName = ownerProfile?.fullName?.trim() || ownerProfile?.username || 'El propietario';
        
        const MODULE_NAMES = {
            feeding: 'alimentación', vaccination: 'vacunación', deworming: 'desparasitación',
            cleaning: 'limpieza', mortality: 'mortalidad', reproduction: 'reproducción y parto',
            reports: 'reportes', cages: 'jaulas', races: 'razas', rabbits: 'conejos',
            assignments: 'asignaciones', genealogy: 'genealogía'
        };
        const translate = (m) => MODULE_NAMES[m] || m;

        const SENSITIVE_MODULES = ['cages', 'races', 'rabbits', 'assignments', 'genealogy', 'reports'];
        const addedBreedingModules = addedModules.filter(m => !SENSITIVE_MODULES.includes(m));

        const notifPromises = [];

        if (addedCages.length > 0 || addedBreedingModules.length > 0) {
            let parts = [];
            if (addedCages.length === 1) {
                parts.push(`la jaula ${addedCages[0]}`);
            } else if (addedCages.length > 1) {
                parts.push(`las jaulas ${addedCages.join(', ')}`);
            }
            
            if (addedBreedingModules.length === 1) {
                parts.push(`el proceso de ${translate(addedBreedingModules[0])}`);
            } else if (addedBreedingModules.length > 1) {
                parts.push(`los procesos de ${addedBreedingModules.map(translate).join(', ')}`);
            }
            
            notifPromises.push(
                notificationService.createNotification(member.profileId, {
                    type: 'info',
                    title: 'Nuevas asignaciones',
                    message: `${ownerName} te asignó ${parts.join(' y ')} en el galpón "${galpon.name}".`,
                    data: { galponId: galpon.id, type: 'task_assignment', category: 'breeding' }
                })
            );
        }

        if (removedCages.length > 0 || removedModules.length > 0) {
            let parts = [];
            if (removedCages.length === 1) {
                parts.push(`la jaula ${removedCages[0]}`);
            } else if (removedCages.length > 1) {
                parts.push(`las jaulas ${removedCages.join(', ')}`);
            }
            
            if (removedModules.length === 1) {
                parts.push(`el proceso de ${translate(removedModules[0])}`);
            } else if (removedModules.length > 1) {
                parts.push(`los procesos de ${removedModules.map(translate).join(', ')}`);
            }
            
            notifPromises.push(
                notificationService.createNotification(member.profileId, {
                    type: 'info',
                    title: 'Asignaciones removidas',
                    message: `${ownerName} te quitó ${parts.join(' y ')} en el galpón "${galpon.name}".`,
                    data: { galponId: galpon.id, type: 'task_assignment', action: 'removed' }
                })
            );
        }

        if (notifPromises.length > 0) {
            await Promise.all(notifPromises);
        }
    }

    /**
     * Desvincula a un trabajador de un galpón (su cuenta permanece activa).
     * Solo el propietario puede hacer esto.
     */
    async removeWorker(farmMemberId, requestingProfileId) {
        const member = await farmMemberRepository.findById(farmMemberId);
        if (!member) throw new AppError('Miembro no encontrado.', 404);
        if (member.role === 'owner') throw new AppError('No se puede eliminar al propietario del galpón.', 400);

        const [, galpon, ownerProfile, workerProfile] = await Promise.all([
            this._assertOwner(member.galponId, requestingProfileId),
            galponRepository.findById(member.galponId),
            Profile.findByPk(requestingProfileId),
            Profile.findByPk(member.profileId)
        ]);
        const ownerName = ownerProfile?.fullName?.trim() || ownerProfile?.username || 'el propietario';

        await Promise.all([
            farmMemberRepository.deactivate(member),
            Notification.destroy({
                where: {
                    profileId: member.profileId,
                    [Op.and]: [
                        Sequelize.literal(`("data"->>'isContract')::boolean = true`),
                        Sequelize.literal(`("data"->>'galponId') = '${String(member.galponId).replace(/'/g, '')}'`)
                    ]
                }
            })
        ]);

        if (workerProfile && workerProfile.activeGalponId === member.galponId) {
            await workerProfile.update({ activeGalponId: null });
            const { clearCache } = require('../../common/middlewares/auth.middleware');
            clearCache(member.profileId);
        }

        await notificationService.createNotification(member.profileId, {
            type: 'error',
            title: 'Has sido eliminado del galpón',
            message: `Has sido eliminado del galpón "${galpon.name}" por ${ownerName}.`,
            data: { galponId: galpon.id, galponName: galpon.name, ownerName }
        });
    }

    /**
     * Sincroniza el aviso de responsabilidad para trabajadores con permisos sensibles.
     */
    async _syncContractNotification(member, requestingProfileId, addedModules = []) {
        const SENSITIVE_MODULES = ['cages', 'races', 'rabbits', 'assignments', 'genealogy', 'reports'];
        const SENSITIVE_LABELS = {
            cages: 'jaulas',
            races: 'razas',
            rabbits: 'conejos',
            assignments: 'asignaciones',
            genealogy: 'genealogía',
            reports: 'reportes'
        };

        const [currentPermissions, galpon, ownerProfile, existingContracts] = await Promise.all([
            WorkerPermission.findAll({ where: { farmMemberId: member.id } }),
            galponRepository.findById(member.galponId),
            requestingProfileId ? Profile.findByPk(requestingProfileId) : Promise.resolve(null),
            Notification.findAll({
                where: {
                    profileId: member.profileId,
                    [Op.and]: [
                        Sequelize.literal(`("data"->>'isContract')::boolean = true`),
                        Sequelize.literal(`("data"->>'galponId') = '${String(member.galponId).replace(/'/g, '')}'`)
                    ]
                }
            })
        ]);

        const safePermissions = Array.isArray(currentPermissions) ? currentPermissions : [];
        const safeContracts = Array.isArray(existingContracts) ? existingContracts : [];

        const activeSensitiveModules = safePermissions
            .filter(p => SENSITIVE_MODULES.includes(p.moduleName) && (p.canCreate || p.canRead || p.canUpdate || p.canDelete))
            .map(p => p.moduleName);

        const galponName = galpon?.name || 'tu galpón asignado';
        const ownerName = ownerProfile?.fullName?.trim() || ownerProfile?.username || 'El dueño';

        if (activeSensitiveModules.length > 0) {
            const formattedModules = activeSensitiveModules.map(m => SENSITIVE_LABELS[m] || m);
            let modulesList = '';
            if (formattedModules.length === 1) {
                modulesList = formattedModules[0];
            } else if (formattedModules.length > 1) {
                modulesList = `${formattedModules.slice(0, -1).join(', ')} y ${formattedModules[formattedModules.length - 1]}`;
            }

            const message = `${ownerName} te dio permiso para manejar ${modulesList} en el galpón "${galponName}". Todo cambio queda guardado con tu nombre bajo tu responsabilidad.`;

            if (safeContracts.length > 0) {
                await Notification.destroy({
                    where: {
                        id: { [Op.in]: safeContracts.map(c => c.id) }
                    }
                });
            }

            await notificationService.createNotification(member.profileId, {
                type: 'warning',
                title: 'Aviso importante de responsabilidad',
                message,
                data: {
                    isContract: true,
                    type: 'sensitive_permission_contract',
                    galponId: member.galponId,
                    farmMemberId: member.id,
                    modules: activeSensitiveModules
                }
            });
        } else if (safeContracts.length > 0) {
            await Notification.destroy({
                where: {
                    id: { [Op.in]: safeContracts.map(c => c.id) }
                }
            });
        }
    }

    /**
     * Consulta el registro de control de cambios del galpón (solo propietario).
     */
    async getAuditLogsByGalpon(galponId, requestingProfileId, filters = {}, page = 1, limit = 20) {
        await this._assertOwner(galponId, requestingProfileId);
        
        const cleanGalponId = String(galponId).replace(/'/g, '');
        const andClauses = [
            Sequelize.literal(`("AuditLog"."details"->>'galponId') = '${cleanGalponId}'`)
        ];

        const isSystemRequest = filters.isSystem === true || filters.isSystem === 'true' || filters.source === 'system';
        if (isSystemRequest) {
            andClauses.push(Sequelize.literal(`("AuditLog"."details"->>'isSystem') = 'true'`));
        } else {
            andClauses.push(Sequelize.literal(`(("AuditLog"."details"->>'isSystem') IS NULL OR ("AuditLog"."details"->>'isSystem') = 'false')`));
        }

        const where = {
            [Op.and]: andClauses
        };

        if (filters.profileId) {
            where.profileId = filters.profileId;
        }

        if (filters.entity) {
            where.entity = filters.entity;
        }

        if (filters.action) {
            where.action = filters.action;
        }

        if (filters.startDate) {
            where.createdAt = where.createdAt || {};
            where.createdAt[Op.gte] = new Date(filters.startDate);
        }

        if (filters.endDate) {
            where.createdAt = where.createdAt || {};
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            where.createdAt[Op.lte] = end;
        }

        const parsedPage = Math.max(1, parseInt(page, 10) || 1);
        const parsedLimit = Math.max(1, parseInt(limit, 10) || 20);
        const offset = (parsedPage - 1) * parsedLimit;

        const { count, rows } = await AuditLog.findAndCountAll({
            where,
            include: [
                {
                    model: Profile,
                    as: 'profile',
                    attributes: ['id', 'fullName', 'username', 'email']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parsedLimit,
            offset
        });

        return {
            total: count,
            page: parsedPage,
            limit: parsedLimit,
            totalPages: Math.ceil(count / parsedLimit),
            logs: rows
        };
    }

    /**
     * Registra auditoría cuando un trabajador genera o consulta un reporte.
     */
    async logReportAudit(galponId, profileId, { moduleName, moduleLabel, startDate, endDate, format }) {
        const isDownload = format === 'pdf' || format === 'excel' || format === 'csv';
        const action = isDownload ? 'descargar' : 'consultar';
        const formatLabel = isDownload ? (format ? format.toUpperCase() : 'PDF') : 'Vista previa';
        const summary = isDownload
            ? `Descargó el reporte de ${moduleLabel || moduleName || 'estadísticas'} del galpón en ${formatLabel}`
            : `Consultó la vista previa del reporte de ${moduleLabel || moduleName || 'estadísticas'} del galpón`;

        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentLog = await AuditLog.findOne({
            where: {
                profileId,
                entity: 'reports',
                createdAt: { [Op.gte]: fiveMinutesAgo },
                'details.galponId': Number(galponId),
                'details.after.module': moduleName
            },
            order: [['createdAt', 'DESC']]
        });

        if (recentLog) {
            recentLog.action = action;
            const currentDetails = recentLog.details || {};
            recentLog.details = {
                ...currentDetails,
                summary,
                after: {
                    module: moduleName,
                    moduleLabel: moduleLabel || currentDetails.after?.moduleLabel,
                    startDate: startDate || currentDetails.after?.startDate || null,
                    endDate: endDate || currentDetails.after?.endDate || null,
                    format: formatLabel
                }
            };
            recentLog.changed('details', true);
            await recentLog.save();
            return { success: true, updated: true };
        }

        await recordWorkerChange({
            galponId,
            profileId,
            action,
            entity: 'reports',
            entityId: 0,
            itemName: `Reporte de ${moduleLabel || moduleName || 'Estadísticas'}`,
            summary,
            before: null,
            after: {
                module: moduleName,
                moduleLabel,
                startDate: startDate || null,
                endDate: endDate || null,
                format: formatLabel
            }
        });
        return { success: true };
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    async _assertOwner(galponId, profileId) {
        const membership = await farmMemberRepository.findMembership(profileId, galponId);
        if (membership?.role !== 'owner' || membership?.status !== 'active') {
            throw new AppError('No tienes permisos de propietario en este galpón.', 403);
        }
    }

    async _validateOccupiedCages(cageIds, galponId) {
        if (!cageIds || cageIds.length === 0) return;
        
        await Promise.all(cageIds.map(async (cageId) => {
            const [cage, rabbitCount] = await Promise.all([
                Cage.findOne({ where: { id: cageId, galponId } }),
                Assignment.count({ where: { cageId, status: 'asignado' } })
            ]);
            if (!cage) throw new AppError(`La jaula ${cageId} no pertenece a este galpón.`, 400);
            
            if (rabbitCount === 0) {
                throw new AppError(`La jaula ${cage.number} no tiene conejos asignados. Solo se pueden asignar jaulas ocupadas.`, 400);
            }
        }));
    }
}

module.exports = new FarmMemberService();
