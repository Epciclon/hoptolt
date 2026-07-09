const { DataTypes } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');
const { getCommonFields } = require('./commonFields');

const Cleaning = sequelize.define('Cleaning', {
    ...getCommonFields(DataTypes),
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
    rabbitsSnapshot: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    tableName: 'cleanings',
    timestamps: true
});

module.exports = Cleaning;
