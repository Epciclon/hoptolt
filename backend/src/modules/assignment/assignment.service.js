const assignmentRepository = require('./assignment.repository');
const cageRepository = require('../cage/cage.repository');
const rabbitRepository = require('../rabbit/rabbit.repository');
const AppError = require('../../errors/AppError');

class AssignmentService {
    validateCompatibility(cage, rabbits, existingRabbits = []) {
        const warnings = [];
        
        if (cage.type === 'engorde') {
            // Include existing rabbits in the cage for validation
            const allRabbits = [...existingRabbits, ...rabbits];
            
            const ages = allRabbits.map(r => {
                const birthDate = new Date(r.birthDate);
                const today = new Date();
                return (today - birthDate) / (1000 * 60 * 60 * 24 * 30.44);
            });

            const minAge = Math.min(...ages);
            const maxAge = Math.max(...ages);
            if (maxAge - minAge > 1) {
                throw new AppError('Los conejos de engorde deben tener edades similares (máximo 1 mes de diferencia) para evitar peleas por territorialidad dentro de la jaula.', 400);
            }

            const hasOpposite = allRabbits.some(r => r.sex === 'macho') && allRabbits.some(r => r.sex === 'hembra');
            const hasAgeOver4 = ages.some(age => age >= 4);
            if (hasOpposite && hasAgeOver4) {
                throw new AppError('No se pueden mezclar sexos opuestos en jaulas de engorde a partir de los 4 meses para evitar camadas no deseadas (los conejos pueden reproducirse a esta edad).', 400);
            }

            // Warning for rabbits over 4 months (territorial behavior)
            const hasRabbitsOver4 = ages.some(age => age >= 4);
            if (hasRabbitsOver4) {
                warnings.push('Advertencia: Los conejos mayores de 4 meses pueden presentar comportamiento territorial y pelear por dominancia dentro de la jaula. Se recomienda supervisión y considerar separación si se observan conflictos.');
            }
        }
        
        return warnings;
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
        for (const id of rabbitIds) {
            const assignment = await assignmentRepository.create({
                cageId,
                rabbitId: id,
                galponId,
                status: 'asignado',
                assignedAt: new Date()
            });
            assignments.push(assignment);
        }

        return { assignments, warnings };
    }

    async getAssignments(galponId) {
        return assignmentRepository.findByGalponId(galponId);
    }

    async getAssignedRabbits(galponId) {
        const assignments = await assignmentRepository.findByGalponId(galponId);
        
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
        const assignedIds = assignedRabbits.map(a => a.rabbitId);
        return allRabbits.filter(r => !assignedIds.includes(r.id));
    }

    async getOperativeCages(galponId) {
        const cageRepository = require('../cage/cage.repository');
        const cages = await cageRepository.findByStatus('operativa');
        return cages.filter(c => c.galponId === galponId);
    }

    async unassignRabbit(id) {
        const assignment = await assignmentRepository.findById(id);
        if (!assignment) throw new AppError('La asignación no existe.', 404);
        await assignmentRepository.update(assignment, { status: 'liberado' });
    }
}

module.exports = new AssignmentService();
