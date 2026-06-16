const { DataTypes } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');

const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    action: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    entity: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    entityId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    profileId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'profiles', key: 'id' }
    },
    details: {
        type: DataTypes.JSONB,
        allowNull: true
    }
}, {
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false // Only need createdAt for logs
});

module.exports = AuditLog;
