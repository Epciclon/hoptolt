const assignmentRepository = require('./assignment.repository');
const cageRepository = require('../cage/cage.repository');
const rabbitRepository = require('../rabbit/rabbit.repository');
const AppError = require('../../errors/AppError');

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

            const hasOver3Months = ages.some(age => age > 3);
            if (hasOver3Months) {
                throw new AppError('No se permiten conejos mayores de 3 meses en jaulas de engorde grupales. A partir de esa edad alcanzan la madurez sexual y muestran comportamientos territoriales muy agresivos.', 400);
            }

            const minAge = Math.min(...ages);
            const maxAge = Math.max(...ages);
            if (maxAge - minAge > 1) {
                throw new AppError('Los conejos de engorde deben tener edades similares (máximo 1 mes de diferencia) para evitar peleas por territorialidad y dominancia.', 400);
            }
        }

        return warnings;
    }

    async validateAndGetRabbits(rabbitIds, galponId) {
        const rabbits = [];
        for (const id of rabbitIds) {
            const rabbit = await rabbitRepository.findById(id);
            if (!rabbit) throw new AppError(`El conejo con ID ${id} no existe.`, 404);

            if (rabbit.galponId !== galponId) {
                throw new AppError(`El conejo con ID ${id} no pertenece al galpón activo.`, 400);
            }

            const existingAssignment = await assignmentRepository.findActiveByRabbitId(id);
            if (existingAssignment) throw new AppError(`El conejo con ID ${id} ya está asignado a una jaula.`, 400);

            rabbits.push(rabbit);
        }
        return rabbits;
    }

    async assignRabbits(data, galponId) {
        const { cageId, rabbitIds } = data;

        if (!Array.isArray(rabbitIds) || rabbitIds.length === 0) {
            throw new AppError('Debe seleccionar al menos un conejo.', 400);
        }

        const cage = await cageRepository.findById(cageId);
        if (!cage) throw new AppError('La jaula especificada no existe.', 404);

        if (cage.galponId !== galponId) {
            throw new AppError('La jaula no pertenece al galpón activo.', 400);
        }

        if (cage.status !== 'operativa') {
            throw new AppError('Solo se pueden asignar conejos a jaulas operativas.', 400);
        }

        const rabbits = await this.validateAndGetRabbits(rabbitIds, galponId);

        const currentCount = await assignmentRepository.countActiveByCageId(cageId);
        if (currentCount + rabbitIds.length > cage.capacity) {
            throw new AppError(`La jaula no tiene suficiente capacidad. Disponible: ${cage.capacity - currentCount}.`, 400);
        }

        // Get existing rabbits in the cage for compatibility validation
        const existingAssignments = await assignmentRepository.findActiveByCageId(cageId);
        const existingRabbitIds = existingAssignments.map(a => a.rabbitId);
        const existingRabbits = [];
        for (const rabbitId of existingRabbitIds) {
            const rabbit = await rabbitRepository.findById(rabbitId);
            if (rabbit) existingRabbits.push(rabbit);
        }

        const warnings = this.validateCompatibility(cage, rabbits, existingRabbits);

        const assignments = [];
        const notificationService = require('../notification/notification.service');
        for (const id of rabbitIds) {
            const assignment = await assignmentRepository.create({
                cageId,
                rabbitId: id,
                galponId,
                status: 'asignado',
                assignedAt: new Date()
            });
            assignments.push(assignment);
            
            const rabbit = rabbits.find(r => r.id === id);
            if (rabbit) {
                const rabbitIdentifier = rabbit.name ? `${rabbit.code} - ${rabbit.name}` : rabbit.code;
                await notificationService.createRabbitAssignmentNotification(cageId, rabbitIdentifier, true);
            }
        }

        return { assignments, warnings };
    }

    async getAssignments(galponId) {
        return assignmentRepository.findByGalponId(galponId);
    }

    async getAssignedRabbits(galponId) {
        const assignments = await assignmentRepository.findByGalponId(galponId);
        const reproductionRepo = require('../reproduction/reproduction.repository');
        const lactatingIds = await reproductionRepo.findLactatingFemaleIds(galponId);

        // Los datos ya vienen con includes (rabbit y cage), no necesitamos consultas adicionales
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
        const allRabbits = await rabbitRepository.findByGalpon(galponId);
        const assignedRabbits = await assignmentRepository.findByGalponId(galponId);
        const assignedIds = new Set(assignedRabbits.map(a => a.rabbitId));
        return allRabbits.filter(r => !assignedIds.has(r.id));
    }

    async getOperativeCages(galponId) {
        const cageRepository = require('../cage/cage.repository');
        const cages = await cageRepository.findByStatus('operativa');
        const galponCages = cages.filter(c => c.galponId === galponId);

        const cagesWithStats = [];
        const activeAssignments = await assignmentRepository.findByGalponId(galponId);

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

    async unassignRabbit(id) {
        const assignment = await assignmentRepository.findById(id);
        if (!assignment) throw new AppError('La asignación no existe.', 404);
        await assignmentRepository.update(assignment, { status: 'liberado' });
        
        try {
            const rabbit = await rabbitRepository.findById(assignment.rabbitId);
            if (rabbit) {
                const notificationService = require('../notification/notification.service');
                const rabbitIdentifier = rabbit.name ? `${rabbit.code} - ${rabbit.name}` : rabbit.code;
                await notificationService.createRabbitAssignmentNotification(assignment.cageId, rabbitIdentifier, false);
            }
        } catch(e) {
            console.error('Error notifying unassignment', e);
        }
    }
}

module.exports = new AssignmentService();
