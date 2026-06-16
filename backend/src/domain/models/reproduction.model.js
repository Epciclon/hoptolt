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
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    estimatedBirthDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
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
