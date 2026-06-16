const { DataTypes } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    // Usuario que recibe la notificación
    profileId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'profiles', key: 'id' }
    },
    // Tipo de notificación: success, error, warning, info, invitation
    type: {
        type: DataTypes.ENUM('success', 'error', 'warning', 'info', 'invitation'),
        allowNull: false,
        defaultValue: 'info'
    },
    // Título de la notificación
    title: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    // Mensaje de la notificación
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    // Datos adicionales en JSON (opcional)
    data: {
        type: DataTypes.JSONB,
        allowNull: true
    },
    // Si la notificación ha sido leída
    read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    tableName: 'notifications',
    timestamps: true
});

module.exports = Notification;
