const { DataTypes } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');

const WorkerCage = sequelize.define('WorkerCage', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    farmMemberId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'farm_members', key: 'id' }
    },
    cageId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'cages', key: 'id' }
    }
}, {
    tableName: 'worker_cages',
    timestamps: false,
    indexes: [
        { unique: true, fields: ['farmMemberId', 'cageId'] }
    ]
});

module.exports = WorkerCage;
