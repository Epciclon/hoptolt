const { DataTypes } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');

const Cage = sequelize.define('Cage', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 999,
            isInt: { msg: 'El número debe ser un entero positivo' }
        }
    },
    type: {
        type: DataTypes.ENUM('engorde', 'reproducción'),
        allowNull: false,
        validate: { notEmpty: { msg: 'El tipo de jaula es obligatorio' } }
    },
    capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 6,
            isInt: { msg: 'La capacidad debe ser un entero positivo' }
        }
    },
    status: {
        type: DataTypes.ENUM('operativa', 'mantenimiento'),
        allowNull: false,
        defaultValue: 'operativa'
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
    tableName: 'cages',
    timestamps: true,
    indexes: [
        { unique: true, fields: ['number', 'galponId'] }
    ]
});

module.exports = Cage;
