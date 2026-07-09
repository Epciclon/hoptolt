const { DataTypes } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');
const { getCommonFields } = require('./commonFields');

const Feeding = sequelize.define('Feeding', {
    ...getCommonFields(DataTypes),
    cageId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'cages',
            key: 'id'
        }
    },
    foodTypes: {
        type: DataTypes.JSON,
        allowNull: false
    },
    justification: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    feedingDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    shift: {
        type: DataTypes.ENUM('mañana', 'tarde'),
        allowNull: false,
        defaultValue: 'mañana'
    },
    rabbitsSnapshot: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    tableName: 'feedings',
    timestamps: true
});

module.exports = Feeding;
