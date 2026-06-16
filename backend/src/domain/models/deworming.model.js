const { DataTypes } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');

const Deworming = sequelize.define('Deworming', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    rabbitId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'rabbits',
            key: 'id'
        }
    },
    dewormingDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    galponId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'galpones',
            key: 'id'
        }
    },
    profileId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'profiles',
            key: 'id'
        }
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'dewormings',
    timestamps: true
});

module.exports = Deworming;
