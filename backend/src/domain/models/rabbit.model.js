const { DataTypes } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');

const Rabbit = sequelize.define('Rabbit', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    race: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: { msg: 'La raza es obligatoria' } }
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: { msg: 'El código es obligatorio' } }
    },
    name: {
        type: DataTypes.STRING(50),
        allowNull: true,
        validate: { notEmpty: { msg: 'El nombre es obligatorio' } }
    },
    sex: {
        type: DataTypes.ENUM('macho', 'hembra'),
        allowNull: false
    },
    birthDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    age: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 0,
            max: 18,
            isInt: { msg: 'La edad debe ser un número entero' }
        }
    },
    weight: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        validate: {
            min: 0.1,
            max: 4.5,
            isDecimal: { msg: 'El peso debe ser un número decimal válido' }
        }
    },
    purpose: {
        type: DataTypes.ENUM('Reproducción', 'Engorde'),
        allowNull: false
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
}, {
    tableName: 'rabbits',
    timestamps: true,
    paranoid: true,
    indexes: [
        {
            unique: true,
            fields: ['code', 'galponId'],
            name: 'unique_code_galpon'
        }
    ]
});

module.exports = Rabbit;
