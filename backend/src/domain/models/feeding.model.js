const { DataTypes } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');

const Feeding = sequelize.define('Feeding', {
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
    rabbitsSnapshot: {
        type: DataTypes.JSON,
        allowNull: true
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
    tableName: 'feedings',
    timestamps: true
});

module.exports = Feeding;
