const mongoose = require('mongoose');

const raceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'El nombre de la raza es obligatorio'],
        unique: true,
        trim: true,
        minlength: [2, 'El nombre debe tener al menos 2 caracteres']
    },
    description: {
        type: String,
        required: [true, 'La descripción de la raza es obligatoria'],
        trim: true,
        minlength: [5, 'La descripción debe tener al menos 5 caracteres']
    }
});

module.exports = mongoose.model('Race', raceSchema);
