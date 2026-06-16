const { DataTypes } = require('sequelize');
const sequelize = require('../../infrastructure/database/connection');

const WorkerPermission = sequelize.define('WorkerPermission', {
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
    // Módulos: cages, races, rabbits, genealogy, assignments,
    //          feeding, vaccination, deworming, cleaning, mortality,
    //          reproduction, reports, knowledge
    moduleName: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    canCreate: { type: DataTypes.BOOLEAN, defaultValue: false },
    canRead:   { type: DataTypes.BOOLEAN, defaultValue: false },
    canUpdate: { type: DataTypes.BOOLEAN, defaultValue: false },
    canDelete: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
    tableName: 'worker_permissions',
    timestamps: false,
    indexes: [
        { unique: true, fields: ['farmMemberId', 'moduleName'] }
    ]
});

module.exports = WorkerPermission;
