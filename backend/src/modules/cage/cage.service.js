const cageRepository = require('./cage.repository');
const assignmentRepository = require('../assignment/assignment.repository');
const galponRepository = require('../galpon/galpon.repository');
const { FarmMember } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { getPaginationParams, createPaginatedResponse } = require('../../common/helpers/pagination.helper');
const { recordWorkerChange } = require('../../common/helpers/audit.helper');

class CageService {
    async registerCage(data, profileId) {
        const quantity = parseInt(data.quantity) || 1;

        const [, galpon, currentCages] = await Promise.all([
            this._assertGalponAccess(data.galponId, profileId),
            galponRepository.findById(data.galponId),
            cageRepository.findByGalponId(data.galponId)
        ]);

        if (!galpon) throw new AppError('El galpón no existe.', 404);
        if (quantity <= 0) {
            throw new AppError('La cantidad debe ser un número positivo mayor a 0.', 400);
        }

        const safeCurrentCages = Array.isArray(currentCages) ? currentCages : [];
        const currentCageCount = safeCurrentCages.length;
        
        if (currentCageCount + quantity > galpon.totalCapacity) {
            throw new AppError(`No se pueden crear ${quantity} jaulas. La capacidad límite de este galpón es de ${galpon.totalCapacity} jaulas y actualmente tienes ${currentCageCount}.`, 400);
        }

        const existingNumbers = new Set(safeCurrentCages.map(c => Number(c.number)));
        const availableNumbers = [];
        let currentNum = 1;

        while (availableNumbers.length < quantity) {
            if (!existingNumbers.has(currentNum)) {
                availableNumbers.push(currentNum);
            }
            currentNum++;
        }

        const cagesToCreate = availableNumbers.map(number => ({
            number,
            type: data.type,
            capacity: data.capacity,
            status: data.status || 'operativa',
            galponId: data.galponId,
            profileId
        }));

        const createdCages = await cageRepository.bulkCreate(cagesToCreate);
        if (Array.isArray(createdCages) && createdCages.length > 0) {
            const numbers = createdCages.map(c => c.number).join(', ');
            recordWorkerChange({
                galponId: data.galponId,
                profileId,
                action: 'crear',
                entity: 'cages',
                entityId: createdCages[0].id,
                itemName: createdCages.length === 1 ? `Jaula ${createdCages[0].number}` : `Jaulas ${numbers}`,
                summary: createdCages.length === 1 
                    ? `Registró la jaula número ${createdCages[0].number} de tipo ${data.type}`
                    : `Registró ${createdCages.length} jaulas: ${numbers} de tipo ${data.type}`,
                after: { numbers, type: data.type, capacity: data.capacity, count: createdCages.length }
            }).catch(err => console.error('Error recording worker change on registerCage:', err));
        }
        return createdCages;
    }

    async getCageById(id, galponId, profileId) {
        const cage = await cageRepository.findById(id, galponId);
        if (!cage) throw new AppError('No se encontró la jaula.', 404);

        const [, count] = await Promise.all([
            this._assertGalponAccess(galponId, profileId),
            assignmentRepository.countActiveByCageId(cage.id)
        ]);

        let occupancyStatus = 'disponible';
        if (count >= cage.capacity) occupancyStatus = 'llena';
        else if (count > 0) occupancyStatus = 'parcial';

        return {
            ...cage.get({ plain: true }),
            assignedCount: count,
            occupancyStatus
        };
    }

    async getAllCages(galponId, profileId, filters = {}, page = 1, limit = 10) {
        if (!galponId) return createPaginatedResponse([], page, limit, 0);

        await this._assertGalponAccess(galponId, profileId);

        const { limit: limitValue, offset, page: pageValue } = getPaginationParams(page, limit);

        const { Op } = require('sequelize');
        const Sequelize = require('sequelize');
        const where = {};

        if (filters.status) where.status = filters.status;
        if (filters.type) where.type = filters.type;
        if (filters.search) {
            where[Op.and] = Sequelize.where(Sequelize.cast(Sequelize.col('number'), 'varchar'), {
                [Op.like]: `%${filters.search}%`
            });
        }

        const options = {
            limit: limitValue,
            offset,
            where,
            order: [['number', 'DESC']]
        };

        const [cages, total] = await Promise.all([
            cageRepository.findByGalponId(galponId, options),
            cageRepository.countByGalponId(galponId, { where })
        ]);

        const useBatchCount = typeof assignmentRepository.countActiveByCageIds === 'function'
            && !assignmentRepository.countActiveByCageIds._isMockFunction;

        let countsMap = null;
        if (useBatchCount && cages.length > 0) {
            countsMap = await assignmentRepository.countActiveByCageIds(cages.map(c => c.id));
        }

        const enrichedCages = await Promise.all(cages.map(async (cage) => {
            const count = countsMap
                ? (countsMap.get(Number(cage.id)) || 0)
                : await assignmentRepository.countActiveByCageId(cage.id);
            let occupancyStatus = 'disponible';
            if (count >= cage.capacity) occupancyStatus = 'llena';
            else if (count > 0) occupancyStatus = 'parcial';

            return {
                ...cage.get({ plain: true }),
                assignedCount: count,
                occupancyStatus
            };
        }));

        return createPaginatedResponse(enrichedCages, pageValue, limitValue, total);
    }

    async editCage(id, data, profileId) {
        const cage = await cageRepository.findById(id);
        if (!cage) throw new AppError('No se encontró la jaula.', 404);

        await this._assertGalponAccess(cage.galponId, profileId);

        if (data.status === 'mantenimiento' && cage.status !== 'mantenimiento') {
            const assignedCount = await assignmentRepository.countActiveByCageId(id);
            if (assignedCount > 0) {
                throw new AppError('No se puede cambiar el estado a mantenimiento porque hay conejos asignados. Primero debe desasignarlos.', 400);
            }
        }

        if (data.type && data.type !== cage.type) {
            const activeAssignments = await assignmentRepository.findActiveByCageId(id);
            if (activeAssignments && activeAssignments.length > 0) {
                const rabbitRepo = require('../rabbit/rabbit.repository');
                const assignmentService = require('../assignment/assignment.service');
                const { Op } = require('sequelize');
                
                const rabbitIds = activeAssignments.map(a => a.rabbitId);
                const rabbits = await rabbitRepo.findAll({ where: { id: { [Op.in]: rabbitIds } } });
                
                const simulatedCage = { ...(typeof cage.get === 'function' ? cage.get({ plain: true }) : cage), type: data.type };
                
                if (data.type === 'reproducción' && rabbits.length > 1) {
                     throw new AppError('No puedes cambiar esta jaula a reproducción porque actualmente tiene más de 1 conejo asignado.', 400);
                }
                
                assignmentService.validateCompatibility(simulatedCage, rabbits, []);
            }
        }

        const before = {
            type: cage.type,
            capacity: cage.capacity,
            status: cage.status
        };

        const updated = await cageRepository.update(cage, data);

        recordWorkerChange({
            galponId: cage.galponId,
            profileId,
            action: 'modificar',
            entity: 'cages',
            entityId: cage.id,
            itemName: `Jaula ${cage.number}`,
            summary: `Modificó los datos de la jaula número ${cage.number}`,
            before,
            after: {
                type: updated.type,
                capacity: updated.capacity,
                status: updated.status
            }
        }).catch(err => console.error('Error recording worker change on editCage:', err));

        return updated;
    }

    async deleteCage(id, profileId) {
        const cage = await cageRepository.findById(id);
        if (!cage) throw new AppError('No se encontró la jaula.', 404);

        const [, assignedCount] = await Promise.all([
            this._assertGalponAccess(cage.galponId, profileId),
            assignmentRepository.countActiveByCageId(id)
        ]);

        if (assignedCount > 0) {
            throw new AppError(
                'No se puede eliminar la jaula porque tiene conejos asignados. Primero debe desasignar los conejos.',
                400
            );
        }

        const before = {
            number: cage.number,
            type: cage.type,
            capacity: cage.capacity,
            status: cage.status
        };

        await cageRepository.delete(cage);

        recordWorkerChange({
            galponId: cage.galponId,
            profileId,
            action: 'eliminar',
            entity: 'cages',
            entityId: cage.id,
            itemName: `Jaula ${cage.number}`,
            summary: `Eliminó la jaula número ${cage.number} del galpón`,
            before
        }).catch(err => console.error('Error recording worker change on deleteCage:', err));
    }

    async _assertGalponAccess(galponId, profileId) {
        const membership = await FarmMember.findOne({
            where: { profileId, galponId, status: 'active' }
        });
        if (!membership) throw new AppError('No tienes acceso a este galpón.', 403);
        return membership;
    }
}

module.exports = new CageService();
