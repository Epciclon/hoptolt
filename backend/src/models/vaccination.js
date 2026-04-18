const mongoose = require('mongoose');

const VaccinationSchema = new mongoose.Schema({
    codigo: { type: String, required: true },
    mixomatosis: { type: Boolean, default: false },
    vhd: { type: Boolean, default: false }, // Enfermedad Hemorrágica Vírica
    fecha: { type: Date, default: Date.now },
    lastMixomatosisDate: { type: Date, default: null },
    lastVhdDate: { type: Date, default: null }
});

module.exports = mongoose.model('Vaccination', VaccinationSchema);
