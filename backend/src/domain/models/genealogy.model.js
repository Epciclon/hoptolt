const { DataTypes } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');

const Genealogy = sequelize.define('Genealogy', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    rabbitId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'rabbits',
            key: 'id'
        }
    },
    fatherId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'rabbits',
            key: 'id'
        }
    },
    motherId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'rabbits',
            key: 'id'
        }
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
    }
}, { tableName: 'genealogies', timestamps: true });

module.exports = Genealogy;
