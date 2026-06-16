const { Profile, FarmMember, WorkerPermission } = require('../../domain/models');

/**
 * Repositorio de autenticación.
 * Solo opera sobre la tabla local `profiles`; las credenciales viven en Supabase Auth.
 */
class AuthRepository {
    /** 
     * Busca un perfil por su UUID de Supabase.
     * Si el perfil tiene un activeGalponId, también incluye su membresía en ese galpón
     * y los permisos de trabajador asociados.
     */
    async findById(id) {
        const profile = await Profile.findByPk(id);
        
        if (!profile) return null;

        // Si tiene un galpón activo, traemos su rol y permisos para inyectarlos
        let role = null;
        let permissions = [];

        if (profile.activeGalponId) {
            const membership = await FarmMember.findOne({
                where: { profileId: id, galponId: profile.activeGalponId, status: 'active' },
                include: [{ model: WorkerPermission, as: 'permissions' }]
            });

            if (membership) {
                role = membership.role;
                permissions = membership.permissions || [];
            }
        }

        // Devolvemos un objeto plano (toJSON) más los campos enriquecidos
        return {
            ...profile.toJSON(),
            role,
            permissions: permissions.map(p => p.toJSON())
        };
    }

    /** Busca un perfil por email (para resolución de login por email) */
    async findByEmail(email) {
        return Profile.findOne({ where: { email } });
    }

    /** Busca un perfil por username (para resolución de login por username) */
    async findByUsername(username) {
        return Profile.findOne({ where: { username } });
    }

    /**
     * Crea (o actualiza) el perfil local a partir de los datos del usuario de Supabase.
     * Se invoca tras un registro exitoso en Supabase desde el frontend.
     */
    async upsert(data) {
        const { id, email, fullName, username } = data;
        const [profile] = await Profile.upsert(
            { id, email, fullName, username },
            { returning: true }
        );
        return profile;
    }

    /** Actualiza el galpón activo del usuario */
    async updateActiveGalpon(profileId, galponId) {
        const profile = await Profile.findByPk(profileId);
        if (!profile) return null;
        return profile.update({ activeGalponId: galponId });
    }
}

module.exports = new AuthRepository();
