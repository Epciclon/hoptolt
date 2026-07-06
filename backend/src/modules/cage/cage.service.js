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

        const currentCageCount = await cageRepository.countByGalponId(data.galponId);
        if (currentCageCount >= galpon.totalCapacity) {
            throw new AppError('No se pueden crear más jaulas. Capacidad máxima del galpón alcanzada.', 400);
        }

        const exists = await cageRepository.findByNumberAndGalpon(data.number, data.galponId);
        if (exists) throw new AppError('El número de jaula ya existe en este galpón.', 400);

        return cageRepository.create({
            ...data,
            profileId
        });
    }

    async getCageById(id, galponId, profileId) {
        const cage = await cageRepository.findById(id, galponId);
        if (!cage) throw new AppError('No se encontró la jaula.', 404);

        // Verificar que el usuario tiene acceso al galpón
        await this._assertGalponAccess(galponId, profileId);

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
        await this._assertGalponAccess(galponId, profileId);

        const { limit: limitValue, offset, page: pageValue } = getPaginationParams(page, limit);

        const { Op } = require('sequelize');
        const Sequelize = require('sequelize');
        const where = {};

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

        const enrichedCages = [];
        for (const cage of cages) {
            const count = await assignmentRepository.countActiveByCageId(cage.id);
            let occupancyStatus = 'disponible';
            if (count >= cage.capacity) occupancyStatus = 'llena';
            else if (count > 0) occupancyStatus = 'parcial';

            enrichedCages.push({
                ...cage.get({ plain: true }),
                assignedCount: count,
                occupancyStatus
            });
        }

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
    }
}

module.exports = new CageService();
