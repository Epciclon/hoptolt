const { DataTypes } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');

const Race = sequelize.define('Race', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: {
                args: [2, 100],
                msg: 'El nombre de la raza debe tener entre 2 y 100 caracteres'
            },
            notEmpty: { msg: 'El nombre de la raza es obligatorio' }
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            len: {
                args: [5, 150],
                msg: 'La descripción de la raza debe tener entre 5 y 150 caracteres'
            },
            notEmpty: { msg: 'La descripción de la raza es obligatoria' }
        }
    },
    imageUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    profileId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'profiles',
            key: 'id'
        }
    },
    galponId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'galpones',
            key: 'id'
        }
    }
}, {
    tableName: 'races',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['name', 'profileId'],
            name: 'unique_name_profile'
        }
    ]
});

module.exports = Race;
