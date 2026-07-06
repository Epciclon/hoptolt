const { DataTypes } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');

const Reproduction = sequelize.define('Reproduction', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    femaleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'rabbits',
            key: 'id'
        }
    },
    maleId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'rabbits',
            key: 'id'
        }
    },
    mountDate: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    estimatedBirthDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },

    bornKits: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    cancellationReason: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('monta', 'gestacion', 'lactancia', 'completado', 'fallido'),
        allowNull: false,
        defaultValue: 'monta'
    },
    updatedBySystem: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
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
    tableName: 'reproductions',
    timestamps: true
});

module.exports = Reproduction;
