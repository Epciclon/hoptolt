const incidentRepository = require('./incident.repository');
const { FarmMember, Galpon, Cage } = require('../../domain/models');
const AppError = require('../../errors/AppError');
const { Op } = require('sequelize');

class IncidentService {
    async getUserRole(profileId, galponId) {
        const galpon = await Galpon.findByPk(galponId);
        if (!galpon) {
            throw new AppError('El galpón especificado no existe.', 404);
        }

        if (galpon.profileId === profileId) {
            return { role: 'owner', galpon };
        }

        const member = await FarmMember.findOne({
            where: { profileId, galponId }
        });

        if (!member) {
            throw new AppError('No tienes acceso a este galpón.', 403);
        }

        return { role: member.role || 'worker', galpon, member };
    }

    async createIncident(user, galponId, data) {
        await this.getUserRole(user.id, galponId);

        const {
            module,
            cageId,
            cageIds,
            rabbitId,
            category = 'Dificultad en la Tarea',
            title,
            description
        } = data;

        if (!title || !title.trim()) {
            throw new AppError('El motivo de la novedad es obligatorio.', 400);
        }
        if (!description || !description.trim()) {
            throw new AppError('La explicación de la novedad es obligatoria.', 400);
        }

        let finalCageIds = [];
        if (Array.isArray(cageIds)) {
            finalCageIds = cageIds.map(id => Number(id)).filter(id => !Number.isNaN(id) && id > 0);
        } else if (cageId) {
            finalCageIds = [Number(cageId)];
        }

        let cagesList = [];
        if (finalCageIds.length > 0) {
            const foundCages = await Cage.findAll({
                where: { id: finalCageIds, galponId },
                attributes: ['id', 'number', 'type']
            });
            cagesList = foundCages.map(c => ({ id: c.id, number: c.number, type: c.type }));
        }

        const incident = await incidentRepository.create({
            galponId,
            profileId: user.id,
            module: module ? String(module).trim() : null,
            cageId: finalCageIds[0] || null,
            cages: cagesList,
            rabbitId: rabbitId ? Number(rabbitId) : null,
            category: String(category).trim(),
            title: String(title).trim(),
            description: String(description).trim(),
            status: 'pending',
            workerRead: true,
            ownerRead: false
        });

        return await incidentRepository.findById(incident.id, galponId);
    }

    async getIncidents(user, galponId, query = {}) {
        const { role } = await this.getUserRole(user.id, galponId);

        const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
        const limit = Math.max(1, Math.min(100, Number.parseInt(query.limit, 10) || 12));
        const offset = (page - 1) * limit;

        const where = { galponId };

        // Trabajador solo visualiza sus propios reportes de novedad
        if (role !== 'owner') {
            where.profileId = user.id;
        }

        if (query.status && query.status !== 'all') {
            if (query.status === 'reviewed' || query.status === 'resolved') {
                where.status = { [Op.in]: ['reviewed', 'resolved'] };
            } else {
                where.status = query.status;
            }
        }

        if (query.category && query.category !== 'all') {
            where.category = query.category;
        }

        if (query.module && query.module !== 'all') {
            where.module = query.module;
        }

        if (query.search && query.search.trim()) {
            const searchTerm = `%${query.search.trim()}%`;
            where[Op.or] = [
                { title: { [Op.iLike]: searchTerm } },
                { description: { [Op.iLike]: searchTerm } },
                { category: { [Op.iLike]: searchTerm } }
            ];
        }

        const { count, rows } = await incidentRepository.findAndCountAll({
            where,
            limit,
            offset,
            order: [['createdAt', 'DESC'], ['id', 'DESC']]
        });

        const totalPages = Math.ceil(count / limit) || 1;

        return {
            incidents: rows,
            pagination: {
                total: count,
                page,
                limit,
                totalPages
            },
            userRole: role
        };
    }

    async getCounts(user, galponId) {
        const { role } = await this.getUserRole(user.id, galponId);

        if (role === 'owner') {
            const [total, pending, reviewed, unread] = await Promise.all([
                incidentRepository.count({ galponId }),
                incidentRepository.count({ galponId, status: 'pending' }),
                incidentRepository.count({ galponId, status: { [Op.in]: ['reviewed', 'resolved'] } }),
                incidentRepository.count({ galponId, ownerRead: false })
            ]);
            return { role, total, pending, reviewed, unread };
        } else {
            const [total, pending, reviewed, unread] = await Promise.all([
                incidentRepository.count({ galponId, profileId: user.id }),
                incidentRepository.count({ galponId, profileId: user.id, status: 'pending' }),
                incidentRepository.count({ galponId, profileId: user.id, status: { [Op.in]: ['reviewed', 'resolved'] } }),
                incidentRepository.count({ galponId, profileId: user.id, workerRead: false })
            ]);
            return { role, total, pending, reviewed, unread };
        }
    }

    async getById(user, galponId, incidentId) {
        const { role } = await this.getUserRole(user.id, galponId);
        const incident = await incidentRepository.findById(incidentId, galponId);
        if (!incident) {
            throw new AppError('La novedad solicitada no existe.', 404);
        }

        // Si es trabajador, verificar pertenencia
        if (role !== 'owner' && incident.profileId !== user.id) {
            throw new AppError('No tienes permiso para ver esta novedad.', 403);
        }

        return incident;
    }

    async respondToIncident(user, galponId, incidentId, { ownerResponse, status = 'reviewed' }) {
        const { role } = await this.getUserRole(user.id, galponId);
        if (role !== 'owner') {
            throw new AppError('Solo el propietario del galpón puede responder a novedades.', 403);
        }

        const incident = await incidentRepository.findById(incidentId, galponId);
        if (!incident) {
            throw new AppError('La novedad no existe.', 404);
        }

        // Si el estado vuelve a pendiente, se borra directamente la respuesta previa
        if (status === 'pending') {
            await incidentRepository.update(incidentId, galponId, {
                ownerResponse: null,
                status: 'pending',
                reviewedBy: null,
                reviewedAt: null,
                workerRead: true,
                ownerRead: true
            });
            return await incidentRepository.findById(incidentId, galponId);
        }

        if (!ownerResponse || !ownerResponse.trim()) {
            throw new AppError('La respuesta para el trabajador es obligatoria.', 400);
        }

        await incidentRepository.update(incidentId, galponId, {
            ownerResponse: ownerResponse.trim(),
            status: 'reviewed',
            reviewedBy: user.id,
            reviewedAt: new Date(),
            workerRead: false // Notificar al trabajador que tiene respuesta
        });

        return await incidentRepository.findById(incidentId, galponId);
    }

    async markAsRead(user, galponId, incidentId) {
        const { role } = await this.getUserRole(user.id, galponId);

        if (incidentId === 'all') {
            if (role === 'owner') {
                await incidentRepository.markAllAsReadForOwner(galponId);
            } else {
                await incidentRepository.markAllAsReadForWorker(user.id, galponId);
            }
            return { success: true };
        }

        const incident = await incidentRepository.findById(incidentId, galponId);
        if (!incident) {
            throw new AppError('La novedad no existe.', 404);
        }

        if (role === 'owner') {
            await incidentRepository.update(incidentId, galponId, { ownerRead: true });
        } else if (incident.profileId === user.id) {
            await incidentRepository.update(incidentId, galponId, { workerRead: true });
        }

        return { success: true };
    }

    async deleteIncident(user, galponId, incidentId) {
        const { role } = await this.getUserRole(user.id, galponId);
        const incident = await incidentRepository.findById(incidentId, galponId);
        if (!incident) {
            throw new AppError('La novedad solicitada no existe.', 404);
        }

        // Regla: El propietario atiende las novedades, no las elimina para mantener registro.
        if (role === 'owner') {
            throw new AppError('El propietario no puede eliminar novedades de los trabajadores. Debe atenderlas.', 403);
        }

        // Regla: Solo el trabajador que la reportó puede eliminarla.
        if (incident.profileId !== user.id) {
            throw new AppError('No tienes permiso para eliminar esta novedad.', 403);
        }

        // Regla: Solo se permite eliminar si la novedad aún sigue pendiente.
        if (incident.status !== 'pending') {
            throw new AppError('Solo se pueden eliminar novedades que aún se encuentren pendientes.', 400);
        }

        await incidentRepository.delete(incidentId, galponId);
        return { success: true };
    }
}

module.exports = new IncidentService();
