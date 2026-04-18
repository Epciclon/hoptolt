const mongoose = require('mongoose');

const matingSchema = new mongoose.Schema({
    rabbitCode: { type: String, required: true }, // código de la coneja
    cageNumber: { type: Number, required: true }, // número de jaula asignada
    matingDate: { type: Date, required: true },
    birthDate: { type: Date, required: true }, // fecha estimada de parto
    status: { type: String, default: 'activo' }, // activo, finalizado, eliminado
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Mating', matingSchema);
