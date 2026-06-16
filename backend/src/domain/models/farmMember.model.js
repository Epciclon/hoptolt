const { DataTypes } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');

/**
 * Tabla puente entre un Profile (usuario) y un Galpon.
 * Define el rol del usuario dentro de ese galpón específico.
 */
const FarmMember = sequelize.define('FarmMember', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    galponId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'galpones', key: 'id' }
    },
    profileId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'profiles', key: 'id' }
    },
    // 'owner' = propietario del galpón, 'worker' = trabajador invitado
    role: {
        type: DataTypes.ENUM('owner', 'worker'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active'
    }
}, {
    tableName: 'farm_members',
    timestamps: true,
    indexes: [
        { unique: true, fields: ['galponId', 'profileId'] }
    ]
});

module.exports = FarmMember;
