const { DataTypes } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');

const Galpon = sequelize.define('Galpon', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: {
                args: [1, 50],
                msg: 'El nombre del galpón debe tener entre 1 y 50 caracteres'
            }
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
    province: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    location: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: {
                args: [1, 100],
                msg: 'La ubicación debe tener entre 1 y 100 caracteres'
            }
        }
    },
    totalCapacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            isInt: true,
            min: 1
        }
    },
    foodTypes: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
    },
    vaccines: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
    },
    dewormingPeriod: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            isInt: true,
            min: 1
        }
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
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
    tableName: 'galpones',
    timestamps: true,
    indexes: [
        { unique: true, fields: ['name', 'profileId'] }
    ]
});

module.exports = Galpon;
