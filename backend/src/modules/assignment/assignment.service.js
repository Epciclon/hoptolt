const assignmentRepository = require('./assignment.repository');
const cageRepository = require('../cage/cage.repository');
const rabbitRepository = require('../rabbit/rabbit.repository');
const AppError = require('../../errors/AppError');
const { recordWorkerChange } = require('../../common/helpers/audit.helper');
const { Op } = require('sequelize');

class AssignmentService {
    validateCompatibility(cage, rabbits, existingRabbits = []) {
        const warnings = [];
        const allRabbits = [...existingRabbits, ...rabbits];

        if (cage.type === 'reproducción') {
            const hasEngorde = allRabbits.some(r => r.purpose === 'Engorde');
            if (hasEngorde) {
                throw new AppError('No se pueden asignar conejos de Engorde en jaulas de Reproducción. El propósito de la jaula y el conejo deben ser compatibles.', 400);
            }
        }

        if (cage.type === 'engorde') {
            const hasReproduccion = allRabbits.some(r => r.purpose === 'Reproducción');
            const hasEngorde = allRabbits.some(r => r.purpose === 'Engorde');
            if (hasReproduccion && hasEngorde) {
                throw new AppError('No se pueden mezclar conejos de Engorde y Reproducción (pie de cría) en la misma jaula de engorde. Todos deben tener el mismo propósito.', 400);
            }

            const hasMacho = allRabbits.some(r => r.sex === 'macho');
            const hasHembra = allRabbits.some(r => r.sex === 'hembra');
            if (hasMacho && hasHembra) {
                throw new AppError('No se pueden mezclar sexos opuestos en jaulas de engorde. Esto evita cruces indeseados y partos prematuros que afectan la salud del animal.', 400);
            }

            const ages = allRabbits.map(r => {
                const birthDate = new Date(r.birthDate);
                const today = new Date();
                return (today - birthDate) / (1000 * 60 * 60 * 24 * 30.44);
            });

            const hasOver3Months = ages.some(age => age > 3.1);
            if (hasOver3Months) {
                throw new AppError('No se permiten conejos mayores de 3 meses en jaulas de engorde grupales. A partir de esa edad alcanzan la madurez sexual y muestran comportamientos territoriales muy agresivos.', 400);
            }

            const flooredAges = ages.map(age => Math.floor(age));
            const minAge = Math.min(...flooredAges);
            const maxAge = Math.max(...flooredAges);
            if (maxAge - minAge > 1) {
                throw new AppError('Los conejos de engorde deben tener edades similares (máximo 1 mes de diferencia) para evitar peleas por territorialidad y dominancia.', 400);
            }
        }

        return warnings;
    }

    async validateAndGetRabbits(rabbitIds, galponId) {
        const [rabbits, activeAssignments] = await Promise.all([
            rabbitRepository.findAll({ where: { id: { [Op.in]: rabbitIds } } }),
            assignmentRepository.findAll({
                where: { rabbitId: { [Op.in]: rabbitIds }, status: 'asignado' }
            })
        ]);

        if (rabbits.length !== rabbitIds.length) {
            const foundIds = new Set(rabbits.map(r => r.id));
            const missingIds = rabbitIds.filter(id => !foundIds.has(id));
            throw new AppError(`Los siguientes conejos no existen: ${missingIds.join(', ')}`, 404);
        }

        const activeIds = new Set(activeAssignments.map(a => a.rabbitId));

        for (const rabbit of rabbits) {
            if (rabbit.galponId !== galponId) {
                throw new AppError(`El conejo con ID ${rabbit.id} no pertenece al galpón activo.`, 400);
            }
            if (activeIds.has(rabbit.id)) {
                throw new AppError(`El conejo con ID ${rabbit.id} ya está asignado a una jaula.`, 400);
            }
        }
        
        return rabbits;
    }

    async _recordAssignRabbitsAudit(galponId, profileId, cage, rabbits) {
        if (!profileId) return;
        const isSingle = rabbits.length === 1;
        const singleIsFemale = isSingle && rabbits[0].sex === 'hembra';
        let rabbitText = `${rabbits.length} conejos`;
        let rabbitsField = 'rabbits';
        if (isSingle) {
            rabbitText = singleIsFemale ? '1 coneja' : '1 conejo';
            rabbitsField = singleIsFemale ? 'coneja' : 'conejo';
        }

        try {
            await recordWorkerChange({
                galponId,
                profileId,
                action: 'crear',
                entity: 'assignments',
                entityId: cage.id,
                itemName: `Jaula ${cage.number}`,
                summary: `Asignó ${rabbitText} a la jaula número ${cage.number}`,
                after: {
                    cageNumber: cage.number,
                    [rabbitsField]: rabbits.map(r => r.name ? `${r.name} - ${r.code}` : r.code)
                }
            });
        } catch (err) {
            console.error('Error recording worker change on assignRabbits:', err);
        }
    }

    _validateCageAvailability(cage, currentCount, requestedCount, galponId) {
        if (!cage) throw new AppError('La jaula especificada no existe.', 404);

        if (cage.galponId !== galponId) {
            throw new AppError('La jaula no pertenece al galpón activo.', 400);
        }

        if (cage.status !== 'operativa') {
            throw new AppError('Solo se pueden asignar conejos a jaulas operativas.', 400);
        }

        if (currentCount + requestedCount > cage.capacity) {
            throw new AppError(`La jaula no tiene suficiente capacidad. Disponible: ${cage.capacity - currentCount}.`, 400);
        }
    }

    async assignRabbits(data, galponId, profileId) {
        const { cageId, rabbitIds } = data;

        if (!Array.isArray(rabbitIds) || rabbitIds.length === 0) {
            throw new AppError('Debe seleccionar al menos un conejo.', 400);
        }

        const [cage, currentCount, existingAssignments] = await Promise.all([
            cageRepository.findById(cageId),
            assignmentRepository.countActiveByCageId(cageId),
            assignmentRepository.findActiveByCageId(cageId)
        ]);

        this._validateCageAvailability(cage, currentCount, rabbitIds.length, galponId);

        const rabbits = await this.validateAndGetRabbits(rabbitIds, galponId);

        const existingRabbitIds = (existingAssignments || []).map(a => a.rabbitId);
        let existingRabbits = [];
        if (existingRabbitIds.length > 0) {
            existingRabbits = await rabbitRepository.findAll({ where: { id: { [Op.in]: existingRabbitIds } } });
        }

        const warnings = this.validateCompatibility(cage, rabbits, existingRabbits);

        const notificationService = require('../notification/notification.service');
        const toCreate = rabbits.map(rabbit => ({
            rabbitId: rabbit.id,
            rabbitCode: rabbit.code,
            cageId: cage.id,
            cageNumber: cage.number,
            galponId,
            status: 'asignado',
            profileId
        }));
        
        const createdAssignments = await assignmentRepository.bulkCreate(toCreate);
        
        void notificationService.createRabbitAssignmentNotification(cage.id, rabbits, true)
            .catch(err => console.error("Error creating notifications:", err));

        void this._recordAssignRabbitsAudit(galponId, profileId, cage, rabbits);

        return { assignments: createdAssignments, warnings };
    }

    _validateMoveTargetCage(targetCage, currentCageId, targetCageId, galponId) {
        if (!targetCage || targetCage.galponId !== galponId) {
            throw new AppError('La jaula destino no es válida.', 400);
        }
        if (targetCage.status !== 'operativa') {
            throw new AppError('La jaula destino no está operativa.', 400);
        }
        if (targetCageId === currentCageId) {
            throw new AppError('El conejo ya está en esa jaula.', 400);
        }
    }

    async _recordMoveRabbitAudit(galponId, profileId, rabbit, currentCage, targetCage) {
        if (!profileId) return;
        const rabbitLabel = rabbit.name ? `${rabbit.name} - ${rabbit.code}` : rabbit.code;
        const isFemale = rabbit.sex === 'hembra';
        const prefix = isFemale ? 'Coneja' : 'Conejo';
        const article = isFemale ? 'a la coneja' : 'al conejo';

        try {
            await recordWorkerChange({
                galponId,
                profileId,
                action: 'modificar',
                entity: 'assignments',
                entityId: rabbit.id,
                itemName: `${prefix} ${rabbitLabel}`,
                summary: `Movió ${article} ${rabbitLabel} de la jaula ${currentCage?.number} a la jaula ${targetCage?.number}`,
                before: { cageNumber: currentCage?.number },
                after: { cageNumber: targetCage?.number }
            });
        } catch (err) {
            console.error('Error recording worker change on moveRabbit:', err);
        }
    }

    async _recordSwapAudit(galponId, profileId, rabbit, occupantRabbit, currentCage, targetCage) {
        if (!profileId) return;
        const rabbitLabel = rabbit.name ? `${rabbit.name} - ${rabbit.code}` : rabbit.code;
        const isFemale = rabbit.sex === 'hembra';
        const prefix = isFemale ? 'Coneja' : 'Conejo';
        const article = isFemale ? 'a la coneja' : 'al conejo';

        const occupantLabel = occupantRabbit?.name ? `${occupantRabbit.name} - ${occupantRabbit.code}` : occupantRabbit?.code;
        const occupantIsFemale = occupantRabbit?.sex === 'hembra';
        const occupantArticle = occupantIsFemale ? 'con la coneja' : 'con el conejo';

        try {
            await recordWorkerChange({
                galponId,
                profileId,
                action: 'modificar',
                entity: 'assignments',
                entityId: rabbit.id,
                itemName: `${prefix} ${rabbitLabel}`,
                summary: `Intercambió ${article} ${rabbitLabel} de la jaula ${currentCage?.number} ${occupantArticle} ${occupantLabel} de la jaula ${targetCage?.number}`,
                before: { cageNumber: currentCage?.number, occupantRabbit: occupantLabel },
                after: { cageNumber: targetCage?.number }
            });
        } catch (err) {
            console.error('Error recording worker change on swap moveRabbit:', err);
        }
    }

    async _handleMoveToAvailableSpace(rabbit, sourceAssignment, currentCage, targetCage, targetAssignments, galponId, profileId) {
        let existingRabbits = [];
        const existingIds = targetAssignments.map(a => a.rabbitId);
        if (existingIds.length > 0) {
            existingRabbits = await rabbitRepository.findAll({ where: { id: { [Op.in]: existingIds } } });
        }
        
        const warnings = this.validateCompatibility(targetCage, [rabbit], existingRabbits);
        await assignmentRepository.update(sourceAssignment, { cageId: targetCage.id });
        
        void this._recordMoveRabbitAudit(galponId, profileId, rabbit, currentCage, targetCage);

        return { message: 'Conejo movido exitosamente.', warnings };
    }

    async _handleSwapMove(rabbit, sourceAssignment, currentCage, targetCage, targetAssignments, galponId, profileId) {
        const occupantAssignment = targetAssignments[0];
        const [occupantRabbit, currentAssignments] = await Promise.all([
            rabbitRepository.findById(occupantAssignment.rabbitId),
            assignmentRepository.findActiveByCageId(currentCage.id)
        ]);

        const otherIds = currentAssignments.filter(a => a.rabbitId !== rabbit.id).map(a => a.rabbitId);
        let otherCurrentRabbits = [];
        if (otherIds.length > 0) {
            otherCurrentRabbits = await rabbitRepository.findAll({ where: { id: { [Op.in]: otherIds } } });
        }

        const warningsToSource = this.validateCompatibility(currentCage, [occupantRabbit], otherCurrentRabbits);
        const warningsToTarget = this.validateCompatibility(targetCage, [rabbit], []);

        await Promise.all([
            assignmentRepository.update(occupantAssignment, { cageId: currentCage.id }),
            assignmentRepository.update(sourceAssignment, { cageId: targetCage.id })
        ]);

        void this._recordSwapAudit(galponId, profileId, rabbit, occupantRabbit, currentCage, targetCage);

        return { 
            message: 'Jaula llena. Se realizó un intercambio con el ocupante actual exitosamente.', 
            warnings: [...warningsToSource, ...warningsToTarget]
        };
    }

    async moveRabbit(rabbitId, currentCageId, targetCageId, galponId, profileId) {
        if (!rabbitId || !currentCageId || !targetCageId) {
            throw new AppError('Datos incompletos para el movimiento.', 400);
        }

        const cageRepo = require('../cage/cage.repository');
        
        const [sourceAssignment, targetCage, currentCage, targetAssignments, rabbit] = await Promise.all([
            assignmentRepository.findActiveByRabbitId(rabbitId),
            cageRepo.findById(targetCageId),
            cageRepo.findById(currentCageId),
            assignmentRepository.findActiveByCageId(targetCageId),
            rabbitRepository.findById(rabbitId)
        ]);

        if (!sourceAssignment || sourceAssignment.cageId !== currentCageId) {
            throw new AppError('El conejo no está asignado a la jaula de origen.', 400);
        }

        this._validateMoveTargetCage(targetCage, currentCageId, targetCageId, galponId);

        const availableSpace = targetCage.capacity - targetAssignments.length;

        if (availableSpace > 0) {
            return this._handleMoveToAvailableSpace(rabbit, sourceAssignment, currentCage, targetCage, targetAssignments, galponId, profileId);
        }

        if (targetCage.type === 'engorde') {
            throw new AppError('La jaula destino está completamente llena, libere un espacio primero.', 400);
        }
        
        if (targetCage.type === 'reproducción') {
            return this._handleSwapMove(rabbit, sourceAssignment, currentCage, targetCage, targetAssignments, galponId, profileId);
        }
        
        throw new AppError('No se pudo mover al conejo.', 400);
    }

    async _recordMoveRabbitsAudit(galponId, profileId, targetCage, currentCage, rabbits) {
        if (!profileId) return;
        const isSingle = rabbits.length === 1;
        const singleIsFemale = isSingle && rabbits[0].sex === 'hembra';
        let rabbitText = `${rabbits.length} conejos`;
        let rabbitsField = 'rabbits';
        if (isSingle) {
            rabbitText = singleIsFemale ? '1 coneja' : '1 conejo';
            rabbitsField = singleIsFemale ? 'coneja' : 'conejo';
        }

        try {
            await recordWorkerChange({
                galponId,
                profileId,
                action: 'modificar',
                entity: 'assignments',
                entityId: targetCage.id,
                itemName: `Jaula ${targetCage.number}`,
                summary: `Movió ${rabbitText} de la jaula ${currentCage?.number} a la jaula ${targetCage?.number}`,
                before: { fromCageNumber: currentCage?.number, [rabbitsField]: rabbits.map(r => r.name ? `${r.name} - ${r.code}` : r.code) },
                after: { toCageNumber: targetCage?.number, [rabbitsField]: rabbits.map(r => r.name ? `${r.name} - ${r.code}` : r.code) }
            });
        } catch (err) {
            console.error('Error recording worker change on moveRabbits:', err);
        }
    }

    async moveRabbits(rabbitIds, currentCageId, targetCageId, galponId, profileId) {
        if (!Array.isArray(rabbitIds) || rabbitIds.length === 0 || !currentCageId || !targetCageId) {
            throw new AppError('Datos incompletos para el movimiento por lote.', 400);
        }

        const cageRepo = require('../cage/cage.repository');
        
        const [sourceAssignments, targetCage, currentCage, targetAssignments, rabbits] = await Promise.all([
            assignmentRepository.findAll({
                where: { rabbitId: { [Op.in]: rabbitIds }, cageId: currentCageId, status: 'asignado' }
            }),
            cageRepo.findById(targetCageId),
            cageRepo.findById(currentCageId),
            assignmentRepository.findActiveByCageId(targetCageId),
            rabbitRepository.findAll({ where: { id: { [Op.in]: rabbitIds } } })
        ]);

        if (sourceAssignments.length !== rabbitIds.length) {
            throw new AppError('Algunos conejos no están asignados a la jaula de origen.', 400);
        }

        this._validateMoveTargetCage(targetCage, currentCageId, targetCageId, galponId);

        const availableSpace = targetCage.capacity - targetAssignments.length;

        if (targetCage.type === 'reproducción' && rabbitIds.length > 1) {
            throw new AppError('No puedes mover múltiples conejos a una jaula de reproducción simultáneamente.', 400);
        }

        if (availableSpace >= rabbitIds.length) {
            let existingRabbits = [];
            const existingIds = targetAssignments.map(a => a.rabbitId);
            if (existingIds.length > 0) {
                existingRabbits = await rabbitRepository.findAll({ where: { id: { [Op.in]: existingIds } } });
            }
            
            const warnings = this.validateCompatibility(targetCage, rabbits, existingRabbits);
            
            await Promise.all(sourceAssignments.map(a => assignmentRepository.update(a, { cageId: targetCageId })));

            void this._recordMoveRabbitsAudit(galponId, profileId, targetCage, currentCage, rabbits);

            return { message: 'Conejos movidos exitosamente.', warnings };
        }

        if (targetCage.type === 'engorde') {
            throw new AppError(`La jaula destino no tiene espacio suficiente. Espacio disponible: ${availableSpace}.`, 400);
        }
        
        if (targetCage.type === 'reproducción' && rabbitIds.length === 1) {
            return this.moveRabbit(rabbitIds[0], currentCageId, targetCageId, galponId, profileId);
        }
        
        throw new AppError('No se pudo mover a los conejos.', 400);
    }

    async getAssignments(galponId, profileId = null) {
        return assignmentRepository.findActiveByGalponId(galponId, profileId);
    }

    async getAssignedRabbits(galponId, profileId = null) {
        const assignments = await assignmentRepository.findActiveByGalponId(galponId, profileId);
        const assignedRabbitIds = [...new Set(assignments.map(a => a.rabbitId))];
        
        if (assignedRabbitIds.length === 0) return [];

        const assignedRabbits = await rabbitRepository.findAll({
            where: {
                id: { [Op.in]: assignedRabbitIds },
                galponId
            }
        });

        const rabbitMap = new Map(assignedRabbits.map(r => [r.id, r]));

        return assignments.map(a => {
            const rabbit = rabbitMap.get(a.rabbitId);
            return {
                id: a.id,
                assignmentId: a.id,
                rabbitId: a.rabbitId,
                cageId: a.cageId,
                cageNumber: a.cageNumber,
                rabbitCode: a.rabbitCode,
                status: a.status,
                name: rabbit ? rabbit.name : null,
                race: rabbit ? rabbit.race : null,
                sex: rabbit ? rabbit.sex : null,
                birthDate: rabbit ? rabbit.birthDate : null,
                purpose: rabbit ? rabbit.purpose : null,
                rabbitStatus: rabbit ? rabbit.status : null
            };
        });
    }

    async getAvailableRabbits(galponId) {
        const activeAssignments = await assignmentRepository.findActiveByGalponId(galponId);
        const assignedRabbitIds = activeAssignments.map(a => a.rabbitId);

        return rabbitRepository.findAvailableForAssignment(galponId, assignedRabbitIds);
    }

    async getOperativeCages(galponId, profileId = null) {
        const cages = await cageRepository.findOperativeWithCapacity(galponId, profileId);
        
        const counts = await assignmentRepository.countActiveGroupedByCage(galponId);
        const countMap = new Map(counts.map(c => [c.cageId, Number.parseInt(c.count, 10)]));

        const cagesWithStats = cages.map(cage => {
            const occupied = countMap.get(cage.id) || 0;
            const available = Math.max(0, cage.capacity - occupied);
            
            return {
                id: cage.id,
                number: cage.number,
                type: cage.type,
                capacity: cage.capacity,
                occupied,
                available,
                isFull: occupied >= cage.capacity
            };
        });

        return cagesWithStats;
    }

    async _recordUnassignAudit(assignment, rabbit, profileId, galponId) {
        if (!profileId) return;
        try {
            const cageRepo = require('../cage/cage.repository');
            const cage = await cageRepo.findById(assignment.cageId);
            const isFemale = rabbit?.sex === 'hembra';
            const prefix = isFemale ? 'Coneja' : 'Conejo';
            const article = isFemale ? 'a la coneja' : 'al conejo';
            let rabbitLabel = null;
            if (rabbit) {
                rabbitLabel = rabbit.name ? `${rabbit.name} - ${rabbit.code}` : rabbit.code;
            }

            const rabbitKey = isFemale ? 'coneja' : 'conejo';
            const fallbackRabbitText = isFemale ? `Coneja ${assignment.rabbitId}` : `Conejo ${assignment.rabbitId}`;
            const beforeRabbitValue = rabbitLabel || fallbackRabbitText;

            await recordWorkerChange({
                galponId: galponId || assignment.galponId,
                profileId,
                action: 'eliminar',
                entity: 'assignments',
                entityId: assignment.id,
                itemName: rabbitLabel ? `${prefix} ${rabbitLabel}` : `Asignación ${assignment.id}`,
                summary: rabbitLabel ? `Liberó ${article} ${rabbitLabel} de su jaula` : `Liberó al conejo de su jaula`,
                before: {
                    [rabbitKey]: beforeRabbitValue,
                    cageNumber: cage ? cage.number : assignment.cageId
                },
                after: null
            });
        } catch (auditErr) {
            console.error('Error recording worker change on unassignRabbit:', auditErr);
        }
    }

    async _handleUnassignSideEffects(assignment, profileId, galponId) {
        let rabbit = null;
        try {
            rabbit = await rabbitRepository.findById(assignment.rabbitId);
            if (rabbit) {
                const notificationService = require('../notification/notification.service');
                await notificationService.createRabbitAssignmentNotification(assignment.cageId, rabbit, false);
            }
        } catch (e) {
            console.error('Error notifying unassignment', e);
        }

        await this._recordUnassignAudit(assignment, rabbit, profileId, galponId);
    }

    async unassignRabbit(id, profileId = null, galponId = null) {
        const assignment = await assignmentRepository.findById(id);
        if (!assignment) throw new AppError('La asignación no existe.', 404);
        await assignmentRepository.update(assignment, { status: 'liberado' });
        
        void this._handleUnassignSideEffects(assignment, profileId, galponId);
    }
}

module.exports = new AssignmentService();
