const { DataTypes } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');

const Cleaning = sequelize.define('Cleaning', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    cageId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'cages',
            key: 'id'
        }
    },
    cageNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            isInt: true,
            min: 1,
            max: 999
        }
    },
    cleaningDate: {
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
    tableName: 'cleanings',
    timestamps: true
});

module.exports = Cleaning;
