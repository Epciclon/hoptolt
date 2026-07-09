const { DataTypes } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');
const { getCommonFieldsWithRabbit } = require('./commonFields');

const Deworming = sequelize.define('Deworming', {
    ...getCommonFieldsWithRabbit(DataTypes),
    dewormingDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'dewormings',
    timestamps: true
});

module.exports = Deworming;
