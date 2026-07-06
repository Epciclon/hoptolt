const { DataTypes } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');

const Mortality = sequelize.define('Mortality', {
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
    cause: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    isKits: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    numberOfKits: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    observations: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    deathDate: {
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
    tableName: 'mortalities',
    timestamps: true
});

module.exports = Mortality;
