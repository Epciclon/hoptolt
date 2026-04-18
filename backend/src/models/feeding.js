const mongoose = require('mongoose');

const FeedingSchema = new mongoose.Schema({
    codigo: { type: String, required: true },
    heno: { type: Number, required: true },
    hierba: { type: Number, required: true },
    balanceado: { type: Number, required: true },
    fecha: { type: Date, default: Date.now },
    justificacion: { type: String, default: null } // Para registros adicionales (más de 2 por día)
});

module.exports = mongoose.model('Feeding', FeedingSchema);