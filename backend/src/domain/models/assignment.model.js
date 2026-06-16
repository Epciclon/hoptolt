const { DataTypes } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');

const Assignment = sequelize.define('AssignRabbit', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    cageId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            isInt: { msg: 'El ID de jaula debe ser un entero' },
            min: { args: [1], msg: 'El ID de jaula debe ser mayor a 0' }
        }
    },
    rabbitId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'rabbits',
            key: 'id'
        }
    },
    galponId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'galpones',
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM('asignado', 'liberado'),
        allowNull: false,
        defaultValue: 'asignado'
    },
    assignedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, { tableName: 'assign_rabbits', timestamps: true });

module.exports = Assignment;
