const cageRepository = require('./cage.repository');
const assignmentRepository = require('../assignment/assignment.repository');
const { FarmMember } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { getPaginationParams, createPaginatedResponse } = require('../../common/helpers/pagination.helper');

class CageService {
    async registerCage(data, profileId) {
        // Verificar que el usuario tiene acceso al galpón
        await this._assertGalponAccess(data.galponId, profileId);

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

        return cage;
    }

    async getAllCages(galponId, profileId, page = 1, limit = 10) {
        if (!galponId) return createPaginatedResponse([], page, limit, 0);

        // Verificar que el usuario tiene acceso al galpón
        await this._assertGalponAccess(galponId, profileId);

        const { limit: limitValue, offset, page: pageValue } = getPaginationParams(page, limit);
        const cages = await cageRepository.findByGalponId(galponId, { limit: limitValue, offset });
        const total = await cageRepository.countByGalponId(galponId);

        return createPaginatedResponse(cages, pageValue, limitValue, total);
    }

    async editCage(id, data, profileId) {
        const cage = await cageRepository.findById(id);
        if (!cage) throw new AppError('No se encontró la jaula.', 404);

        // Verificar que el usuario tiene acceso al galpón
        await this._assertGalponAccess(cage.galponId, profileId);

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
