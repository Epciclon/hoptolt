const { Op } = require('sequelize');
const { Rabbit, Assignment, Cage, FarmMember, Galpon, WorkerCage, Notification, AuditLog, Growth } = require('../../domain/models');
const AppError = require('../../errors/AppError');

const ongoingChecks = new Map();

class GrowthService {
    calculateEstimatedWeight(purpose, ageMonths) {
        if (purpose === 'Engorde') {
            const table = {
                0: 0.05, 1: 0.6, 2: 1.7, 3: 2.6, 4: 3.5, 5: 3.9, 6: 4.1, 7: 4.2
            };
            return ageMonths >= 8 ? 4.2 : (table[ageMonths] || 4.2);
        } else if (purpose === 'Reproducción') {
            const table = {
                0: 0.05, 1: 0.6, 2: 1.7, 3: 2.4, 4: 3.2, 5: 3.7, 6: 4.0, 7: 4.1
            };
            return ageMonths >= 8 ? 4.2 : (table[ageMonths] || 4.2);
        }
        return 0;
    }

    async processDailyGrowth(profileId) {
        if (ongoingChecks.has(`${profileId}_growth`)) {
            return ongoingChecks.get(`${profileId}_growth`);
        }

        const promise = (async () => {
            try {
                const [memberships, ownedGalpones] = await Promise.all([
                    FarmMember.findAll({ where: { profileId, status: 'active' } }),
                    Galpon.findAll({ where: { profileId } })
                ]);

                const galponIds = new Set();
                ownedGalpones.forEach(g => galponIds.add(g.id));
                memberships.forEach(m => galponIds.add(m.galponId));

                if (galponIds.size === 0) return;

                const rabbits = await Rabbit.findAll({
                    where: { galponId: Array.from(galponIds) }
                });

                if (rabbits.length === 0) return;

                const today = new Date();
                const updatesResult = { messages: [], rabbitsToUpdate: [], catchUpGrowths: [] };

                for (const rabbit of rabbits) {
                    this._processRabbitGrowthSync(rabbit, today, updatesResult);
                }

                await this._applyGrowthUpdates({
                    updatesResult,
                    rabbits,
                    profileId,
                    Growth,
                    Notification,
                    preloadedMemberships: memberships,
                    preloadedOwnedGalpones: ownedGalpones
                });

            } catch (error) {
                console.error('Error processing daily growth:', error);
            } finally {
                ongoingChecks.delete(`${profileId}_growth`);
            }
        })();

        ongoingChecks.set(`${profileId}_growth`, promise);
        return promise;
    }

    async getHistory(rabbitId) {
        const [rabbit, history] = await Promise.all([
            Rabbit.findByPk(rabbitId),
            Growth.findAll({
                where: { rabbitId },
                attributes: ['id', 'weight', 'recordDate', 'isManual'],
                order: [['recordDate', 'DESC']]
            })
        ]);
        if (!rabbit) throw new AppError('Conejo no encontrado', 404);

        return history;
    }

    _processRabbitGrowthSync(rabbit, today, updatesResult) {
        const birthDate = new Date(rabbit.birthDate);
        
        // Calcular meses basados en 30 días
        const diffTime = today.getTime() - birthDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        let currentMonths = Math.floor(diffDays / 30);
        if (currentMonths < 0) currentMonths = 0;

        const maxAge = 8;
        const rabbitAge = Number(rabbit.age || 0);

        if (rabbitAge >= currentMonths || rabbitAge >= maxAge) return;

        const startMonth = rabbitAge + 1;
        const endMonth = Math.min(currentMonths, maxAge);
        if (startMonth > endMonth) return;

        let finalWeight = Number.parseFloat(rabbit.weight || '0');
        
        for (let m = startMonth; m <= endMonth; m++) {
            // Fecha exacta cada 30 días
            const exactDate = new Date(birthDate.getTime() + m * 30 * 24 * 60 * 60 * 1000);
            
            const estimatedWeightForMonth = this.calculateEstimatedWeight(rabbit.purpose, m);
            
            updatesResult.catchUpGrowths.push({
                rabbitId: rabbit.id,
                weight: estimatedWeightForMonth,
                oldWeight: finalWeight,
                recordDate: `${exactDate.toLocaleDateString('sv', { timeZone: 'America/Guayaquil' })}T12:00:00Z`
            });
        }

        const newEstimatedWeight = this.calculateEstimatedWeight(rabbit.purpose, endMonth);
        const updates = { rabbitId: rabbit.id, age: endMonth, weight: newEstimatedWeight };
        
        const rabbitLabel = rabbit.name ? `${rabbit.name} - ${rabbit.code}` : rabbit.code;
        const monthWord = endMonth === 1 ? 'mes' : 'meses';
        let msg = `${rabbitLabel} ha alcanzado los ${endMonth} ${monthWord} de edad con un peso estimado de ${newEstimatedWeight} kg. `;
        if (endMonth === maxAge) {
            msg += `Ha alcanzado la madurez.`;
        }
        
        updatesResult.messages.push({
            rabbitId: rabbit.id,
            galponId: rabbit.galponId,
            text: msg,
            rabbitLabel,
            age: endMonth,
            weight: newEstimatedWeight,
            isMature: endMonth === maxAge
        });
        updatesResult.rabbitsToUpdate.push(updates);
    }

    async _saveRabbitGrowthUpdates(rabbitsToUpdate, rabbits) {
        if (!rabbitsToUpdate || rabbitsToUpdate.length === 0) return;
        const rabbitMap = new Map(rabbits.map(r => [r.id, r]));
        const { recordSystemChange } = require('../../common/helpers/audit.helper');

        await Promise.all(rabbitsToUpdate.map(async update => {
            const rabbit = rabbitMap.get(update.rabbitId);
            if (!rabbit) return;
            const oldAge = rabbit.age;
            const oldWeight = rabbit.weight;
            rabbit.age = update.age;
            if (update.weight !== undefined) rabbit.weight = update.weight;
            if (typeof rabbit.save === 'function') {
                await rabbit.save();
            } else if (typeof rabbit.update === 'function') {
                await rabbit.update({ age: update.age, weight: update.weight });
            }
            
            const rabbitLabel = rabbit.name ? `${rabbit.name} - ${rabbit.code}` : rabbit.code;
            const beforeData = { age: oldAge };
            const afterData = { age: update.age };
            if (update.weight !== undefined && update.weight !== null && update.weight !== oldWeight) {
                beforeData.weight = oldWeight;
                afterData.weight = update.weight;
            }

            await recordSystemChange({
                galponId: rabbit.galponId,
                action: 'Cálculo de crecimiento',
                entity: 'growth',
                entityId: rabbit.id,
                itemName: rabbitLabel,
                summary: `HopTolt actualizó la edad a ${update.age} meses` + (update.weight && update.weight !== oldWeight ? ` y peso estimado a ${update.weight} kg` : '') + ` para el conejo ${rabbitLabel}`,
                before: beforeData,
                after: afterData
            });
        }));
    }

    async _getAllowedRabbitIdsForWorker(wm) {
        const { WorkerPermission, WorkerCage, Assignment } = require('../../domain/models');
        const hasPermission = await WorkerPermission.findOne({
            where: {
                farmMemberId: wm.id,
                moduleName: { [Op.in]: ['conejos', 'rabbits'] },
                canRead: true
            }
        });

        if (!hasPermission) return [];

        const workerCages = await WorkerCage.findAll({ where: { farmMemberId: wm.id } });
        const cageIds = workerCages.map(wc => wc.cageId);
        if (cageIds.length === 0) return [];

        const activeAssignments = await Assignment.findAll({
            where: {
                cageId: { [Op.in]: cageIds },
                status: 'asignado'
            }
        });
        return activeAssignments.map(a => Number(a.rabbitId));
    }

    async _filterWorkerGrowthMessages(workerMemberships, messages) {
        const results = await Promise.all(
            workerMemberships.map(wm => this._getAllowedRabbitIdsForWorker(wm))
        );
        const allowedRabbitIds = new Set(results.flat());

        return messages.filter(m => allowedRabbitIds.has(Number(m.rabbitId)));
    }

    _buildGrowthSummaryPayload(userUpdates) {
        const count = userUpdates.length;
        const summaryMessage = count === 1
            ? 'Tienes **1 conejo** con actualización de edad y peso estimado en tu galpón.'
            : `Tienes **${count} conejos** con actualización de edad y peso estimado en tu galpón.`;

        const rabbitsList = userUpdates.map(u => {
            const ageVal = Number(u.age || 0);
            const ageText = ageVal === 1 ? '1 mes' : `${ageVal} meses`;
            const weightVal = u.weight !== undefined && u.weight !== null ? Number(u.weight) : null;
            const weightText = weightVal !== null && !Number.isNaN(weightVal) ? `${weightVal} kg` : '';
            const baseBadge = weightText ? `${ageText} • ${weightText}` : `${ageText} de edad`;
            return {
                rabbitId: u.rabbitId,
                name: u.rabbitLabel || '',
                age: ageVal,
                weight: u.weight,
                isMature: Boolean(u.isMature),
                badge: u.isMature ? `${baseBadge} • Madurez` : baseBadge
            };
        });

        return {
            message: summaryMessage,
            data: {
                type: 'growth_summary',
                updatesCount: count,
                rabbits: rabbitsList,
                details: userUpdates.map(u => (u.text || '').trim()).filter(Boolean)
            }
        };
    }

    _extractWeightFromTail(tail) {
        const lowerTail = tail.toLowerCase();
        const kgIdx = lowerTail.indexOf('kg');
        if (kgIdx <= 0) return null;
        const beforeKg = tail.slice(0, kgIdx).trimEnd();
        const lastSpace = Math.max(beforeKg.lastIndexOf(' '), beforeKg.lastIndexOf('•'));
        const candidate = beforeKg.slice(lastSpace + 1).trim();
        const parsed = Number(candidate);
        return !Number.isNaN(parsed) && parsed > 0 ? parsed : null;
    }

    _parseLegacyGrowthLineForEnrichment(line) {
        const trimmed = (line || '').trim();
        if (!trimmed) return null;
        const lower = trimmed.toLowerCase();
        const marker = ' ha alcanzado ';
        const markerIdx = lower.indexOf(marker);
        if (markerIdx <= 0) return null;

        const name = trimmed.slice(0, markerIdx).trim();
        const afterMarker = trimmed.slice(markerIdx + marker.length).trim();
        const mesIdx = afterMarker.toLowerCase().indexOf('mes');
        if (mesIdx <= 0) return null;

        const digitMatch = /\d+/.exec(afterMarker.slice(0, mesIdx));
        if (!digitMatch) return null;

        const age = Number.parseInt(digitMatch[0], 10);
        const tail = afterMarker.slice(mesIdx);
        const weight = this._extractWeightFromTail(tail);
        const codeParts = name.split(' - ');
        const code = codeParts[codeParts.length - 1].trim();
        return {
            name,
            code,
            age,
            weight,
            isMature: tail.toLowerCase().includes('madurez')
        };
    }

    _collectLegacyGrowthItems(growthTargets) {
        const parsedMap = new Map();
        const codesSet = new Set();

        for (const notif of growthTargets) {
            if (Array.isArray(notif.data?.rabbits) && notif.data.rabbits.every(r => r.weight != null)) continue;
            const lines = Array.isArray(notif.data?.details) && notif.data.details.length > 0
                ? notif.data.details
                : String(notif.message || '').split('\n');
            const parsedItems = lines.map(l => this._parseLegacyGrowthLineForEnrichment(l)).filter(Boolean);
            if (parsedItems.length === 0) continue;
            parsedMap.set(notif.id, parsedItems);
            for (const item of parsedItems) {
                if (item.code) codesSet.add(item.code);
            }
        }
        return { parsedMap, codesSet };
    }

    _buildEnrichedGrowthRabbitItem(item, rabbitByCode) {
        const rb = rabbitByCode.get(item.code);
        const weight = item.weight ?? this.calculateEstimatedWeight(rb?.purpose || 'Engorde', item.age);
        const ageText = item.age === 1 ? '1 mes' : `${item.age} meses`;
        const baseBadge = weight ? `${ageText} • ${weight} kg` : `${ageText} de edad`;
        return {
            rabbitId: rb?.id,
            name: item.name,
            age: item.age,
            weight,
            isMature: item.isMature,
            badge: item.isMature ? `${baseBadge} • Madurez` : baseBadge
        };
    }

    async enrichGrowthNotifications(dtos) {
        if (!Array.isArray(dtos) || dtos.length === 0 || typeof Rabbit?.findAll !== 'function') return dtos;
        const growthTargets = dtos.filter(n => n?.title === 'Resumen de Crecimiento' || n?.data?.type === 'growth_summary');
        if (growthTargets.length === 0) return dtos;

        const { parsedMap, codesSet } = this._collectLegacyGrowthItems(growthTargets);
        if (parsedMap.size === 0) return dtos;

        const rabbits = await Rabbit.findAll({
            where: { code: { [Op.in]: Array.from(codesSet) } },
            attributes: ['id', 'code', 'purpose', 'weight'],
            paranoid: false
        }).catch(() => []);
        const rabbitByCode = new Map((rabbits || []).map(r => [r.code, r]));

        for (const notif of growthTargets) {
            const parsedItems = parsedMap.get(notif.id);
            if (!parsedItems) continue;
            notif.data = {
                ...notif.data,
                type: 'growth_summary',
                rabbits: parsedItems.map(item => this._buildEnrichedGrowthRabbitItem(item, rabbitByCode))
            };
        }
        return dtos;
    }

    async _applyGrowthUpdates({
        updatesResult,
        rabbits,
        profileId,
        Growth,
        Notification,
        preloadedMemberships,
        preloadedOwnedGalpones
    }) {
        const { messages, rabbitsToUpdate, catchUpGrowths } = updatesResult;

        if (catchUpGrowths && catchUpGrowths.length > 0) {
            // Insertar todos los historiales atrasados con sus fechas correctas
            const growthRecords = catchUpGrowths.map(g => ({
                rabbitId: g.rabbitId,
                weight: g.weight,
                recordDate: g.recordDate,
                isManual: false
            }));
            await Growth.bulkCreate(growthRecords);
        }

        await this._saveRabbitGrowthUpdates(rabbitsToUpdate, rabbits);

        const memberships = preloadedMemberships || await FarmMember.findAll({ where: { profileId, status: 'active' } });
        const ownedGalpones = preloadedOwnedGalpones || await Galpon.findAll({ where: { profileId } });
        const isOwner = ownedGalpones.length > 0 || memberships.some(m => m.role === 'owner');

        let userUpdates = [];

        if (isOwner) {
            const ownedGalponIds = new Set([
                ...ownedGalpones.map(g => g.id),
                ...memberships.filter(m => m.role === 'owner').map(m => m.galponId)
            ]);
            userUpdates = messages.filter(m => ownedGalponIds.has(m.galponId));
        } else {
            // Usuario es trabajador: solo recibe notificaciones si tiene permisos en el módulo y jaulas asignadas
            const workerMemberships = memberships.filter(m => m.role === 'worker');
            userUpdates = await this._filterWorkerGrowthMessages(workerMemberships, messages);
        }

        if (userUpdates.length > 0) {
            const payload = this._buildGrowthSummaryPayload(userUpdates);
            await Notification.create({
                profileId,
                type: 'info',
                title: 'Resumen de Crecimiento',
                message: payload.message,
                data: payload.data
            });
        } else {
            // Limpiar notificaciones huérfanas si el usuario no tiene permisos o jaulas
            await Notification.destroy({
                where: {
                    profileId,
                    type: 'info',
                    title: 'Resumen de Crecimiento'
                }
            });
        }
    }

    async rebuildGrowthHistory(rabbitOrId, options = {}) {
        const { Rabbit, Growth } = require('../../domain/models');
        const rabbit = (rabbitOrId && typeof rabbitOrId === 'object' && rabbitOrId.id)
            ? rabbitOrId
            : await Rabbit.findByPk(rabbitOrId);
        if (!rabbit) return;

        // Borramos historial anterior solo cuando no es un conejo recién creado
        if (!options.isNew) {
            await Growth.destroy({ where: { rabbitId: rabbit.id } });
        }

        const birthDate = new Date(rabbit.birthDate);
        const today = new Date();
        const diffTime = today.getTime() - birthDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        let currentMonths = Math.floor(diffDays / 30);
        if (currentMonths < 0) currentMonths = 0;

        const maxAge = 8;
        const endMonth = Math.min(currentMonths, maxAge);

        const growthsToCreate = [];
        
        // 1. Armar todo el historial estimado antiguo (mes a mes)
        for (let m = 1; m <= endMonth; m++) {
            // Fecha exacta cada 30 días
            const exactDate = new Date(birthDate.getTime() + m * 30 * 24 * 60 * 60 * 1000);
            
            // Para el último mes que cumplió, usamos el peso que tiene actualmente
            const weightToLog = (m === endMonth) ? rabbit.weight : this.calculateEstimatedWeight(rabbit.purpose, m);

            growthsToCreate.push({
                rabbitId: rabbit.id,
                weight: weightToLog,
                recordDate: `${exactDate.toLocaleDateString('sv', { timeZone: 'America/Guayaquil' })}T12:00:00Z`,
                isManual: false
            });
        }

        if (growthsToCreate.length > 0) {
            await Growth.bulkCreate(growthsToCreate);
        }
        
        // 3. Actualizamos la edad solo si difiere de la actual
        if (rabbit.age !== endMonth && typeof rabbit.save === 'function') {
            rabbit.age = endMonth;
            await rabbit.save();
        }
    }
}

module.exports = new GrowthService();
