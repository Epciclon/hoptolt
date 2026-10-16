const cageRepository = require('./cage.repository');
const assignmentRepository = require('../assignment/assignment.repository');
const galponRepository = require('../galpon/galpon.repository');
const { FarmMember } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { getPaginationParams, createPaginatedResponse } = require('../../common/helpers/pagination.helper');

class CageService {
    async registerCage(data, profileId) {
        // Verificar que el usuario tiene acceso al galpón
        await this._assertGalponAccess(data.galponId, profileId);

        const galpon = await galponRepository.findById(data.galponId);
        if (!galpon) throw new AppError('El galpón no existe.', 404);

        const quantity = parseInt(data.quantity) || 1;
        if (quantity <= 0) {
            throw new AppError('La cantidad debe ser un número positivo mayor a 0.', 400);
        }

        const currentCages = await cageRepository.findByGalponId(data.galponId);
        const currentCageCount = currentCages.length;
        
        if (currentCageCount + quantity > galpon.totalCapacity) {
            throw new AppError(`No se pueden crear ${quantity} jaulas. La capacidad límite de este galpón es de ${galpon.totalCapacity} jaulas y actualmente tienes ${currentCageCount}.`, 400);
        }

        const existingNumbers = new Set(currentCages.map(c => Number(c.number)));
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
        return createdCages;
    }

    async getCageById(id, galponId, profileId) {
        const cage = await cageRepository.findById(id, galponId);
        if (!cage) throw new AppError('No se encontró la jaula.', 404);

        // Verificar que el usuario tiene acceso al galpón
        const membership = await this._assertGalponAccess(galponId, profileId);

        if (membership.role === 'worker') {
            const { WorkerCage } = require('../../domain/models');
            const workerCage = await WorkerCage.findOne({
                where: { farmMemberId: membership.id, cageId: id }
            });
            if (!workerCage) {
                throw new AppError('No tienes acceso a esta jaula.', 403);
            }
        }

        const count = await assignmentRepository.countActiveByCageId(cage.id);
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

        // Verificar que el usuario tiene acceso al galpón
        const membership = await this._assertGalponAccess(galponId, profileId);

        const { limit: limitValue, offset, page: pageValue } = getPaginationParams(page, limit);

        const { Op } = require('sequelize');
        const Sequelize = require('sequelize');
        const where = {};

        if (membership.role === 'worker') {
            const { WorkerCage } = require('../../domain/models');
            const workerCages = await WorkerCage.findAll({ where: { farmMemberId: membership.id } });
            const assignedCageIds = workerCages.map(wc => Number(wc.cageId));
            where.id = { [Op.in]: assignedCageIds };
        }

        if (filters.status) where.status = filters.status;
        if (filters.type) where.type = filters.type;
        if (filters.search) {
            // Buscamos coincidencia parcial casteando el número a texto
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

        const cages = await cageRepository.findByGalponId(galponId, options);
        const total = await cageRepository.countByGalponId(galponId, { where });

        const enrichedCages = await Promise.all(cages.map(async (cage) => {
            const count = await assignmentRepository.countActiveByCageId(cage.id);
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

        // Verificar que el usuario tiene acceso al galpón
        await this._assertGalponAccess(cage.galponId, profileId);

        if (data.status === 'mantenimiento' && cage.status !== 'mantenimiento') {
            const assignedCount = await assignmentRepository.countActiveByCageId(id);
            if (assignedCount > 0) {
                throw new AppError('No se puede cambiar el estado a mantenimiento porque hay conejos asignados. Primero debe desasignarlos.', 400);
            }
        }

        if (data.type && data.type !== cage.type) {
            const activeAssignments = await assignmentRepository.findActiveByCageId(id);
            if (activeAssignments.length > 0) {
                const rabbitRepo = require('../rabbit/rabbit.repository');
                const assignmentService = require('../assignment/assignment.service');
                const { Op } = require('sequelize');
                
                const rabbitIds = activeAssignments.map(a => a.rabbitId);
                const rabbits = await rabbitRepo.findAll({ where: { id: { [Op.in]: rabbitIds } } });
                
                const simulatedCage = { ...cage.get({ plain: true }), type: data.type };
                const service = new assignmentService();
                
                if (data.type === 'reproducción' && rabbits.length > 1) {
                     throw new AppError('No puedes cambiar esta jaula a reproducción porque actualmente tiene más de 1 conejo asignado.', 400);
                }
                
                // Validate compatibility using the simulated cage type against the currently assigned rabbits
                // We pass them as `rabbits` and [] as existing since we are validating the whole group
                service.validateCompatibility(simulatedCage, rabbits, []);
            }
        }

        return cageRepository.update(cage, data);
    }

    async deleteCage(id, profileId) {
        const cage = await cageRepository.findById(id);
        if (!cage) throw new AppError('No se encontró la jaula.', 404);

        // Verificar que el usuario tiene acceso al galpón
        await this._assertGalponAccess(cage.galponId, profileId);

        const assignedCount = await assignmentRepository.countActiveByCageId(id);
        if (assignedCount > 0) {
            throw new AppError(
                'No se puede eliminar la jaula porque tiene conejos asignados. Primero debe desasignar los conejos.',
                400
            );
        }
        await cageRepository.delete(cage);
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
