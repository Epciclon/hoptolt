const { Invitation, Galpon, Profile } = require('../../domain/models');

class InvitationRepository {
    async create(data) {
        return Invitation.create(data);
    }

    async findByToken(token) {
        return Invitation.findOne({
            where: { token },
            include: [
                { model: Galpon, as: 'galpon' },
                { model: Profile, as: 'inviter', attributes: ['id', 'fullName', 'username'] }
            ]
        });
    }

    async findPendingByEmail(email) {
        return Invitation.findAll({
            where: { email: email.toLowerCase(), status: 'pending' },
            include: [
                { model: Galpon, as: 'galpon' },
                { model: Profile, as: 'inviter', attributes: ['id', 'fullName', 'username'] }
            ]
        });
    }

    async findByGalponId(galponId) {
        return Invitation.findAll({
            where: { galponId },
            order: [['createdAt', 'DESC']],
            include: [
                { model: Galpon, as: 'galpon' },
                { model: Profile, as: 'inviter', attributes: ['id', 'fullName', 'username'] }
            ]
        });
    }

    async getGalponWithOwner(galponId) {
        return Galpon.findOne({
            where: { id: galponId },
            include: [
                { model: Profile, as: 'owner', attributes: ['id', 'fullName', 'email'] }
            ]
        });
    }

    async updateStatus(invitation, status) {
        return invitation.update({ status });
    }
}

module.exports = new InvitationRepository();
