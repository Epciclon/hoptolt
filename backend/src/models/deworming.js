const mongoose = require('mongoose');

const DewormingSchema = new mongoose.Schema({
    codigo: { type: String, required: true },
    desparasitacion: { type: Boolean, default: false },
    fecha: { type: Date, default: Date.now },
    lastDewormingDate: { type: Date, default: null }
});

module.exports = mongoose.model('Deworming', DewormingSchema);
