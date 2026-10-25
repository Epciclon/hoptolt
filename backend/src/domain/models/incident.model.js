const { DataTypes } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');

const Incident = sequelize.define('Incident', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
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
        allowNull: false,
        references: {
            model: 'profiles',
            key: 'id'
        }
    },
    module: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    cageId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'cages',
            key: 'id'
        }
    },
    cages: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
    },
    rabbitId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'rabbits',
            key: 'id'
        }
    },
    category: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: 'Dificultad en la Tarea'
    },
    title: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'pending' // pending, reviewed, resolved
    },
    workerRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    ownerRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    ownerResponse: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    reviewedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'profiles',
            key: 'id'
        }
    },
    reviewedAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'incidents',
    timestamps: true
});

module.exports = Incident;
