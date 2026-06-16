const { FarmMember, Profile, Galpon, WorkerPermission, WorkerCage, Cage } = require('../../domain/models');

class FarmMemberRepository {
    /**
     * Busca todos los miembros de un galpón con sus perfiles.
     */
    async findByGalponId(galponId) {
        return FarmMember.findAll({
            where: { galponId, status: 'active' },
            include: [
                { model: Profile, as: 'profile' },
                { model: WorkerPermission, as: 'permissions' },
                {
                    model: WorkerCage, as: 'assignedCages',
                    include: [{ model: Cage, as: 'cage' }]
                }
            ]
        });
    }

    /**
     * Busca todos los galpones donde participa un usuario.
     */
    async findByProfileId(profileId) {
        return FarmMember.findAll({
            where: { profileId, status: 'active' },
            include: [
                { model: Galpon, as: 'galpon' },
                { model: WorkerPermission, as: 'permissions' },
                {
                    model: WorkerCage, as: 'assignedCages',
                    include: [{ model: Cage, as: 'cage' }]
                }
            ]
        });
    }

    async findById(id) {
        return FarmMember.findByPk(id, {
            include: [
                { model: Profile, as: 'profile' },
                { model: Galpon, as: 'galpon' },
                { model: WorkerPermission, as: 'permissions' },
                {
                    model: WorkerCage, as: 'assignedCages',
                    include: [{ model: Cage, as: 'cage' }]
                }
            ]
        });
    }

    async findMembership(profileId, galponId) {
        return FarmMember.findOne({ where: { profileId, galponId } });
    }

    async create(data) {
        return FarmMember.create(data);
    }

    async update(member, data) {
        return member.update(data);
    }

    async deactivate(member) {
        return member.update({ status: 'inactive' });
    }

    // Permisos
    async replacePermissions(farmMemberId, permissions) {
        await WorkerPermission.destroy({ where: { farmMemberId } });
        if (permissions && permissions.length > 0) {
            const rows = permissions.map(p => ({ ...p, farmMemberId }));
            return WorkerPermission.bulkCreate(rows);
        }
        return [];
    }

    // Jaulas asignadas al trabajador
    async replaceWorkerCages(farmMemberId, cageIds) {
        await WorkerCage.destroy({ where: { farmMemberId } });
        if (cageIds && cageIds.length > 0) {
            const rows = cageIds.map(cageId => ({ farmMemberId, cageId }));
            return WorkerCage.bulkCreate(rows);
        }
        return [];
    }
}

module.exports = new FarmMemberRepository();
