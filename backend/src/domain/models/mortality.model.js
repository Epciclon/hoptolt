const { DataTypes } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');
const { getCommonFieldsWithRabbit } = require('./commonFields');

const Mortality = sequelize.define('Mortality', {
    ...getCommonFieldsWithRabbit(DataTypes),
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
    }
}, {
    tableName: 'mortalities',
    timestamps: true
});

module.exports = Mortality;
