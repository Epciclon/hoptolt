const assignmentRepository = require('./assignment.repository');
const cageRepository = require('../cage/cage.repository');
const rabbitRepository = require('../rabbit/rabbit.repository');
const AppError = require('../../errors/AppError');
const { recordWorkerChange } = require('../../common/helpers/audit.helper');

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
                const exactAge = (today - birthDate) / (1000 * 60 * 60 * 24 * 30.44);
                return exactAge;
            });

            const hasOver3Months = ages.some(age => age > 3.1); // pequeña tolerancia para recién cumplidos
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
        const { Op } = require('sequelize');
        
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

        if (!cage) throw new AppError('La jaula especificada no existe.', 404);

        if (cage.galponId !== galponId) {
            throw new AppError('La jaula no pertenece al galpón activo.', 400);
        }

        if (cage.status !== 'operativa') {
            throw new AppError('Solo se pueden asignar conejos a jaulas operativas.', 400);
        }

        const rabbits = await this.validateAndGetRabbits(rabbitIds, galponId);

        if (currentCount + rabbitIds.length > cage.capacity) {
            throw new AppError(`La jaula no tiene suficiente capacidad. Disponible: ${cage.capacity - currentCount}.`, 400);
        }

        const existingRabbitIds = (existingAssignments || []).map(a => a.rabbitId);
        
        const { Op } = require('sequelize');
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
        
        // Uso de model.bulkCreate a través del repository
        const createdAssignments = await assignmentRepository.bulkCreate(toCreate);
        
        // Batch notificaciones consolidadas por jaula
        notificationService.createRabbitAssignmentNotification(cage.id, rabbits, true)
            .catch(err => console.error("Error creating notifications:", err));

        if (profileId) {
            const isSingle = rabbits.length === 1;
            const singleIsFemale = isSingle && rabbits[0].sex === 'hembra';
            const rabbitText = isSingle ? (singleIsFemale ? '1 coneja' : '1 conejo') : `${rabbits.length} conejos`;
            const rabbitsField = isSingle ? (singleIsFemale ? 'coneja' : 'conejo') : 'rabbits';

            recordWorkerChange({
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
            }).catch(err => console.error('Error recording worker change on assignRabbits:', err));
        }

        return { assignments: createdAssignments, warnings };
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

        if (!targetCage || targetCage.galponId !== galponId) throw new AppError('La jaula destino no es válida.', 400);
        if (targetCage.status !== 'operativa') throw new AppError('La jaula destino no está operativa.', 400);
        if (targetCageId === currentCageId) throw new AppError('El conejo ya está en esa jaula.', 400);

        const availableSpace = targetCage.capacity - targetAssignments.length;
        const { Op } = require('sequelize');

        if (availableSpace > 0) {
            // Movimiento normal
            let existingRabbits = [];
            const existingIds = targetAssignments.map(a => a.rabbitId);
            if (existingIds.length > 0) {
                existingRabbits = await rabbitRepository.findAll({ where: { id: { [Op.in]: existingIds } } });
            }
            
            const warnings = this.validateCompatibility(targetCage, [rabbit], existingRabbits);
            
            await assignmentRepository.update(sourceAssignment, { cageId: targetCageId });
            
            if (profileId) {
                const rabbitLabel = rabbit.name ? `${rabbit.name} - ${rabbit.code}` : rabbit.code;
                const isFemale = rabbit.sex === 'hembra';
                const prefix = isFemale ? 'Coneja' : 'Conejo';
                const article = isFemale ? 'a la coneja' : 'al conejo';
                recordWorkerChange({
                    galponId,
                    profileId,
                    action: 'modificar',
                    entity: 'assignments',
                    entityId: rabbit.id,
                    itemName: `${prefix} ${rabbitLabel}`,
                    summary: `Movió ${article} ${rabbitLabel} de la jaula ${currentCage?.number} a la jaula ${targetCage?.number}`,
                    before: { cageNumber: currentCage?.number },
                    after: { cageNumber: targetCage?.number }
                }).catch(err => console.error('Error recording worker change on moveRabbit:', err));
            }

            return { message: 'Conejo movido exitosamente.', warnings };
        }

        // Jaula llena
        if (targetCage.type === 'engorde') {
            throw new AppError('La jaula destino está completamente llena, libere un espacio primero.', 400);
        }
        
        if (targetCage.type === 'reproducción') {
            // Intercambio 1 a 1
            const occupantAssignment = targetAssignments[0];
            const [occupantRabbit, currentAssignments] = await Promise.all([
                rabbitRepository.findById(occupantAssignment.rabbitId),
                assignmentRepository.findActiveByCageId(currentCageId)
            ]);

            // Validar si el occupant puede ir a la jaula actual
            const otherIds = currentAssignments.filter(a => a.rabbitId !== rabbitId).map(a => a.rabbitId);
            let otherCurrentRabbits = [];
            if (otherIds.length > 0) {
                otherCurrentRabbits = await rabbitRepository.findAll({ where: { id: { [Op.in]: otherIds } } });
            }

            const warningsToSource = this.validateCompatibility(currentCage, [occupantRabbit], otherCurrentRabbits);
            const warningsToTarget = this.validateCompatibility(targetCage, [rabbit], []);

            await Promise.all([
                assignmentRepository.update(occupantAssignment, { cageId: currentCageId }),
                assignmentRepository.update(sourceAssignment, { cageId: targetCageId })
            ]);

            if (profileId) {
                const rabbitLabel = rabbit.name ? `${rabbit.name} - ${rabbit.code}` : rabbit.code;
                const isFemale = rabbit.sex === 'hembra';
                const prefix = isFemale ? 'Coneja' : 'Conejo';
                const article = isFemale ? 'a la coneja' : 'al conejo';

                const occupantLabel = occupantRabbit?.name ? `${occupantRabbit.name} - ${occupantRabbit.code}` : occupantRabbit?.code;
                const occupantIsFemale = occupantRabbit?.sex === 'hembra';
                const occupantArticle = occupantIsFemale ? 'con la coneja' : 'con el conejo';

                recordWorkerChange({
                    galponId,
                    profileId,
                    action: 'modificar',
                    entity: 'assignments',
                    entityId: rabbit.id,
                    itemName: `${prefix} ${rabbitLabel}`,
                    summary: `Intercambió ${article} ${rabbitLabel} de la jaula ${currentCage?.number} ${occupantArticle} ${occupantLabel} de la jaula ${targetCage?.number}`,
                    before: { cageNumber: currentCage?.number, occupantRabbit: occupantLabel },
                    after: { cageNumber: targetCage?.number }
                }).catch(err => console.error('Error recording worker change on swap moveRabbit:', err));
            }

            return { 
                message: 'Jaula llena. Se realizó un intercambio con el ocupante actual exitosamente.', 
                warnings: [...warningsToSource, ...warningsToTarget]
            };
        }
        
        throw new AppError('No se pudo mover al conejo.', 400);
    }

    async moveRabbits(rabbitIds, currentCageId, targetCageId, galponId, profileId) {
        if (!Array.isArray(rabbitIds) || rabbitIds.length === 0 || !currentCageId || !targetCageId) {
            throw new AppError('Datos incompletos para el movimiento por lote.', 400);
        }

        const cageRepo = require('../cage/cage.repository');
        const { Op } = require('sequelize');
        
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

        if (!targetCage || targetCage.galponId !== galponId) throw new AppError('La jaula destino no es válida.', 400);
        if (targetCage.status !== 'operativa') throw new AppError('La jaula destino no está operativa.', 400);
        if (targetCageId === currentCageId) throw new AppError('Los conejos ya están en esa jaula.', 400);

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

            if (profileId) {
                const isSingle = rabbits.length === 1;
                const singleIsFemale = isSingle && rabbits[0].sex === 'hembra';
                const rabbitText = isSingle ? (singleIsFemale ? '1 coneja' : '1 conejo') : `${rabbits.length} conejos`;
                const rabbitsField = isSingle ? (singleIsFemale ? 'coneja' : 'conejo') : 'rabbits';

                recordWorkerChange({
                    galponId,
                    profileId,
                    action: 'modificar',
                    entity: 'assignments',
                    entityId: targetCage.id,
                    itemName: `Jaula ${targetCage.number}`,
                    summary: `Movió ${rabbitText} de la jaula ${currentCage?.number} a la jaula ${targetCage?.number}`,
                    before: { fromCageNumber: currentCage?.number, [rabbitsField]: rabbits.map(r => r.name ? `${r.name} - ${r.code}` : r.code) },
                    after: { toCageNumber: targetCage?.number, [rabbitsField]: rabbits.map(r => r.name ? `${r.name} - ${r.code}` : r.code) }
                }).catch(err => console.error('Error recording worker change on moveRabbits:', err));
            }

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
        return assignmentRepository.findByGalponId(galponId);
    }

    async getAssignedRabbits(galponId, profileId = null) {
        const reproductionRepo = require('../reproduction/reproduction.repository');
        let [assignments, lactatingIds] = await Promise.all([
            assignmentRepository.findByGalponId(galponId),
            reproductionRepo.findLactatingFemaleIds(galponId)
        ]);

        if (profileId) {
            const { FarmMember, WorkerCage } = require('../../domain/models');
            const member = await FarmMember.findOne({
                where: { profileId, galponId, status: 'active' }
            });
            if (member && member.role === 'worker') {
                const workerCages = await WorkerCage.findAll({
                    where: { farmMemberId: member.id }
                });
                const assignedCageIds = new Set(workerCages.map(wc => Number(wc.cageId)));
                assignments = assignments.filter(a => assignedCageIds.has(Number(a.cageId)));
            }
        }

        return assignments.map(assignment => {
            const rabbit = assignment.rabbit;
            const cage = assignment.cage;

            if (rabbit) {
                return {
                    id: rabbit.id,
                    code: rabbit.code,
                    name: rabbit.name,
                    age: rabbit.age,
                    weight: rabbit.weight,
                    race: rabbit.race,
                    imageUrl: rabbit.imageUrl,
                    isLactating: lactatingIds.has(rabbit.id),
                    cageNumber: cage?.number,
                    cageType: cage?.type,
                    cageId: cage?.id
                };
            }
            return null;
        }).filter(Boolean);
    }

    async getAvailableRabbits(galponId) {
        const [allRabbits, assignedRabbits] = await Promise.all([
            rabbitRepository.findByGalpon(galponId),
            assignmentRepository.findByGalponId(galponId)
        ]);
        const assignedIds = new Set(assignedRabbits.map(a => a.rabbitId));
        return allRabbits.filter(r => !assignedIds.has(r.id));
    }

    async getOperativeCages(galponId, profileId = null) {
        const cageRepository = require('../cage/cage.repository');
        const [cages, activeAssignments] = await Promise.all([
            cageRepository.findByStatus('operativa'),
            assignmentRepository.findByGalponId(galponId)
        ]);
        const galponCages = cages.filter(c => c.galponId === galponId);

        const cagesWithStats = [];
        const countsByCage = {};
        for (const a of activeAssignments) {
            countsByCage[a.cageId] = (countsByCage[a.cageId] || 0) + 1;
        }

        for (const cage of galponCages) {
            const count = countsByCage[cage.id] || 0;
            let occupancyStatus = 'disponible';
            if (count >= cage.capacity) occupancyStatus = 'llena';
            else if (count > 0) occupancyStatus = 'parcial';

            cagesWithStats.push({
                ...cage.get({ plain: true }),
                assignedCount: count,
                occupancyStatus
            });
        }
        return cagesWithStats;
    }

    async unassignRabbit(id, profileId = null, galponId = null) {
        const assignment = await assignmentRepository.findById(id);
        if (!assignment) throw new AppError('La asignación no existe.', 404);
        await assignmentRepository.update(assignment, { status: 'liberado' });
        
        // Procesar notificaciones y bitácora sin bloquear innecesariamente
        void (async () => {
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

            if (profileId) {
                try {
                    const cageRepo = require('../cage/cage.repository');
                    const cage = await cageRepo.findById(assignment.cageId);
                    const isFemale = rabbit?.sex === 'hembra';
                    const prefix = isFemale ? 'Coneja' : 'Conejo';
                    const article = isFemale ? 'a la coneja' : 'al conejo';
                    const rabbitLabel = rabbit ? (rabbit.name ? `${rabbit.name} - ${rabbit.code}` : rabbit.code) : null;

                    const rabbitKey = isFemale ? 'coneja' : 'conejo';
                    await recordWorkerChange({
                        galponId: galponId || assignment.galponId,
                        profileId,
                        action: 'eliminar',
                        entity: 'assignments',
                        entityId: assignment.id,
                        itemName: rabbitLabel ? `${prefix} ${rabbitLabel}` : `Asignación ${id}`,
                        summary: rabbitLabel ? `Liberó ${article} ${rabbitLabel} de su jaula` : `Liberó al conejo de su jaula`,
                        before: {
                            [rabbitKey]: rabbitLabel || (isFemale ? `Coneja ${assignment.rabbitId}` : `Conejo ${assignment.rabbitId}`),
                            cageNumber: cage ? cage.number : assignment.cageId
                        },
                        after: null
                    });
                } catch (auditErr) {
                    console.error('Error recording worker change on unassignRabbit:', auditErr);
                }
            }
        })();
    }
}

module.exports = new AssignmentService();
