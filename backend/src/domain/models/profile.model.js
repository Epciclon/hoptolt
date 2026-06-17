const { DataTypes } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');

/**
 * Perfil de usuario sincronizado con Supabase Auth.
 * El campo `id` es el UUID que Supabase asigna en auth.users.
 * Las credenciales (contraseña) las gestiona Supabase; aquí solo almacenamos
 * metadatos del usuario (username, fullName, galpón activo).
 */
const Profile = sequelize.define('Profile', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        comment: 'UUID proveniente de Supabase auth.users.id'
    },
    username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true,
            len: {
                args: [4, 50],
                msg: 'El nombre de usuario debe tener entre 4 y 50 caracteres'
            },
            is: /^[a-zA-Z0-9_]+$/
        }
    },
    email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    fullName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    activeGalponId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null
    }
}, {
    tableName: 'profiles',
    timestamps: true
});

module.exports = Profile;
