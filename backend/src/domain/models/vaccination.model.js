const { DataTypes } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');
const { getCommonFieldsWithRabbit } = require('./commonFields');

const Vaccination = sequelize.define('Vaccination', {
    ...getCommonFieldsWithRabbit(DataTypes),
    vaccines: {
        type: DataTypes.JSON,
        allowNull: false
    },
    vaccinationDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'vaccinations',
    timestamps: true
});

module.exports = Vaccination;
