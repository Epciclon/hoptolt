const { DataTypes } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');

const Invitation = sequelize.define('Invitation', {
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
    // Email al que se dirige la invitación
    email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: { isEmail: true }
    },
    // Usuario que envió la invitación (profileId del propietario)
    invitedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'profiles', key: 'id' }
    },
    // Token único para identificar la invitación
    token: {
        type: DataTypes.UUID,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
        unique: true
    },
    // 'pending' → creada, 'accepted' → trabajador aceptó, 'revoked' → propietario canceló
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'revoked'),
        allowNull: false,
        defaultValue: 'pending'
    }
}, {
    tableName: 'invitations',
    timestamps: true
});

module.exports = Invitation;
