const { Op } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');
const { Cage, Rabbit, Race, Assignment, Galpon, Genealogy, Feeding, Vaccination, Deworming, Growth, Cleaning, Mortality, Reproduction, Profile, FarmMember, WorkerPermission, WorkerCage, Invitation, Notification, AuditLog } = require('../../domain/models');
const { supabase } = require('../../common/middlewares/auth.middleware');
const authRepository = require('./auth.repository');
const AppError = require('../../errors/AppError');

/**
 * Servicio de autenticación.
 * El registro e inicio de sesión los gestiona Supabase Auth en el frontend.
 * Este servicio solo maneja:
 *  - Sincronización del perfil local tras el registro en Supabase.
 *  - Consulta del perfil autenticado.
 *  - Cambio del galpón activo.
 */
class AuthService {
    /**
     * Sincroniza (crea o actualiza) el perfil local con los datos que vienen de Supabase.
     * Se llama desde el frontend justo después de un signUp exitoso,
     * como respaldo al trigger de PostgreSQL.
     */
    async syncProfile(data) {
        const { id, email, fullName, username } = data;

        if (!id || !email) {
            throw new AppError('Se requiere id y email para sincronizar el perfil.', 400);
        }

        // Validar username único (si viene en el payload)
        if (username) {
            const existing = await authRepository.findByUsername(username.toLowerCase());
            if (existing && existing.id !== id) {
                throw new AppError('El nombre de usuario ya está en uso.', 400);
            }
        }

        const profile = await authRepository.upsert({
            id,
            email: email.toLowerCase(),
            fullName: (fullName || '').trim(),
            username: username ? username.toLowerCase() : email.split('@')[0]
        });

        return profile;
    }

    /**
     * Retorna el perfil completo del usuario autenticado (por UUID de Supabase).
     */
    async getMe(profileId) {
        const profile = await authRepository.findById(profileId);
        if (!profile) throw new AppError('Usuario no encontrado.', 404);
        return profile;
    }

    /**
     * Establece el galpón activo del usuario.
     */
    async setActiveGalpon(profileId, galponId) {
        const profile = await authRepository.updateActiveGalpon(profileId, galponId);
        if (!profile) throw new AppError('Usuario no encontrado.', 404);
        return profile;
    }

    /**
     * Resuelve el email a partir de un username o email.
     * Útil para que el frontend traduzca username → email antes de llamar a Supabase signIn.
     */
    async resolveEmail(identifier) {
        // Si parece un email, buscamos directamente
        if (identifier.includes('@')) {
            const profile = await authRepository.findByEmail(identifier.toLowerCase());
            if (!profile) throw new AppError('Usuario no encontrado.', 404);
            return profile.email;
        }
        // Si es username, buscamos por username y retornamos el email
        const profile = await authRepository.findByUsername(identifier.toLowerCase());
        if (!profile) throw new AppError('Usuario no encontrado.', 404);
        return profile.email;
    }

    /**
     * Actualiza los datos de perfil (fullName y username).
     */
    async updateProfile(profileId, { fullName, username }) {
        if (!fullName || !username) {
            throw new AppError('El nombre completo y nombre de usuario son obligatorios.', 400);
        }

        const usernameClean = username.trim().toLowerCase();
        
        // Validar unicidad del username (distinto al perfil actual)
        const existing = await authRepository.findByUsername(usernameClean);
        if (existing && existing.id !== profileId) {
            throw new AppError('El nombre de usuario ya está en uso.', 400);
        }

        const profile = await Profile.findByPk(profileId);
        if (!profile) throw new AppError('Usuario no encontrado.', 404);

        await profile.update({
            fullName: fullName.trim(),
            username: usernameClean
        });

        return profile;
    }

    /**
     * Elimina físicamente la cuenta del propietario y todos sus datos en cascada.
     */
    async deleteAccount(profileId, currentPassword) {
        // 1. Obtener perfil actual
        const profile = await Profile.findByPk(profileId);
        if (!profile) throw new AppError('Usuario no encontrado.', 404);

        // 2. Validar contraseña actual con Supabase Auth
        if (!supabase) {
            throw new AppError('Configuración de Supabase no encontrada en el servidor.', 500);
        }
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: profile.email,
            password: currentPassword
        });
        if (signInError) {
            throw new AppError('La contraseña actual es incorrecta.', 401);
        }

        // 3. Ejecutar borrado físico en cascada dentro de una transacción
        const t = await sequelize.transaction();
        try {
            await this._performCascadeDelete(profileId, t);
            
            // F. Eliminar Profile local
            await Profile.destroy({ where: { id: profileId }, transaction: t });

            // G. Eliminar usuario de Supabase Auth usando SQL crudo
            await sequelize.query('DELETE FROM auth.users WHERE id = :profileId', {
                replacements: { profileId },
                transaction: t
            });

            await t.commit();
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    async _performCascadeDelete(profileId, t) {
        const ownedGalpones = await Galpon.findAll({ 
            where: { profileId },
            transaction: t
        });
        const ownedGalponIds = ownedGalpones.map(g => g.id);

        let ownedCageIds = [];
        if (ownedGalponIds.length > 0) {
            const cages = await Cage.findAll({
                where: { galponId: { [Op.in]: ownedGalponIds } },
                transaction: t
            });
            ownedCageIds = cages.map(c => c.id);
        }

        let ownedRabbitIds = [];
        if (ownedGalponIds.length > 0) {
            const rabbits = await Rabbit.findAll({
                where: { galponId: { [Op.in]: ownedGalponIds } },
                transaction: t
            });
            ownedRabbitIds = rabbits.map(r => r.id);
        }

        if (ownedCageIds.length > 0) {
            await Feeding.destroy({ where: { cageId: { [Op.in]: ownedCageIds } }, transaction: t });
        }
        if (ownedRabbitIds.length > 0) {
            await Vaccination.destroy({ where: { rabbitId: { [Op.in]: ownedRabbitIds } }, transaction: t });
            await Deworming.destroy({ where: { rabbitId: { [Op.in]: ownedRabbitIds } }, transaction: t });
            await Growth.destroy({ where: { rabbitId: { [Op.in]: ownedRabbitIds } }, transaction: t });
        }

        await Mortality.destroy({
            where: {
                [Op.or]: [
                    { profileId },
                    ownedRabbitIds.length > 0 ? { rabbitId: { [Op.in]: ownedRabbitIds } } : null
                ].filter(Boolean)
            },
            transaction: t
        });

        await Cleaning.destroy({
            where: {
                [Op.or]: [
                    { profileId },
                    ownedCageIds.length > 0 ? { cageId: { [Op.in]: ownedCageIds } } : null
                ].filter(Boolean)
            },
            transaction: t
        });

        if (ownedRabbitIds.length > 0) {
            await Genealogy.destroy({
                where: {
                    [Op.or]: [
                        { rabbitId: { [Op.in]: ownedRabbitIds } },
                        { fatherId: { [Op.in]: ownedRabbitIds } },
                        { motherId: { [Op.in]: ownedRabbitIds } }
                    ]
                },
                transaction: t
            });
            await Reproduction.destroy({
                where: {
                    [Op.or]: [
                        { femaleId: { [Op.in]: ownedRabbitIds } },
                        { maleId: { [Op.in]: ownedRabbitIds } }
                    ]
                },
                transaction: t
            });
            await Assignment.destroy({
                where: {
                    [Op.or]: [
                        { rabbitId: { [Op.in]: ownedRabbitIds } }
                    ]
                },
                transaction: t
            });
        }
        if (ownedCageIds.length > 0) {
            await Assignment.destroy({
                where: {
                    [Op.or]: [
                        { cageId: { [Op.in]: ownedCageIds } }
                    ]
                },
                transaction: t
            });
        }

        if (ownedRabbitIds.length > 0) {
            await Rabbit.destroy({ where: { id: { [Op.in]: ownedRabbitIds } }, transaction: t });
        }
        if (ownedCageIds.length > 0) {
            await Cage.destroy({ where: { id: { [Op.in]: ownedCageIds } }, transaction: t });
        }

        await Race.destroy({
            where: {
                [Op.or]: [
                    { profileId },
                    ownedGalponIds.length > 0 ? { galponId: { [Op.in]: ownedGalponIds } } : null
                ].filter(Boolean)
            },
            transaction: t
        });

        const memberships = await FarmMember.findAll({
            where: {
                [Op.or]: [
                    { profileId },
                    ownedGalponIds.length > 0 ? { galponId: { [Op.in]: ownedGalponIds } } : null
                ].filter(Boolean)
            },
            transaction: t
        });
        const membershipIds = memberships.map(m => m.id);

        if (membershipIds.length > 0) {
            await WorkerPermission.destroy({ where: { farmMemberId: { [Op.in]: membershipIds } }, transaction: t });
            await WorkerCage.destroy({ where: { farmMemberId: { [Op.in]: membershipIds } }, transaction: t });
            await FarmMember.destroy({ where: { id: { [Op.in]: membershipIds } }, transaction: t });
        }

        await Invitation.destroy({
            where: {
                [Op.or]: [
                    { invitedBy: profileId },
                    ownedGalponIds.length > 0 ? { galponId: { [Op.in]: ownedGalponIds } } : null
                ].filter(Boolean)
            },
            transaction: t
        });
        await Notification.destroy({ where: { profileId }, transaction: t });
        await AuditLog.destroy({ where: { profileId }, transaction: t });

        if (ownedGalponIds.length > 0) {
            await Galpon.destroy({ where: { id: { [Op.in]: ownedGalponIds } }, transaction: t });
        }
    }
}

module.exports = new AuthService();
