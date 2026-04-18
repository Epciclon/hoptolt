const mongoose = require('mongoose');

const rabbitSchema = new mongoose.Schema({
    race: {
        type: String,
        required: [true, 'La raza es obligatoria'],
        // Removemos la validación enum para usar validación dinámica desde la BD
    },
    code: {
        type: String,
        required: [true, 'El código es obligatorio'],
        unique: true,
        match: [/^[A-Z]\d{3}$/, 'El código debe tener el formato: una letra mayúscula seguida de tres dígitos (ej: R001)'],
    },
    sex: {
        type: String,
        required: [true, 'El sexo es obligatorio'],
        enum: {
            values: ['macho', 'hembra'],
            message: 'El sexo debe ser macho o hembra'
        },
    },
    age: {
        type: Number,
        required: [true, 'La edad es obligatoria'],
        min: [0, 'La edad mínima es 0 meses'],
        max: [120, 'La edad máxima es 120 meses'], // Incrementado para conejos adultos
    },
    initialAge: {
        type: Number,
        required: [true, 'La edad inicial es obligatoria'],
        min: [0, 'La edad inicial mínima es 0 meses'],
        max: [12, 'La edad inicial máxima es 12 meses'],
        default: function() {
            return this.age; // Por defecto, la edad inicial es la edad actual
        }
    },
    weight: {
        type: Number,
        required: [true, 'El peso es obligatorio'],
        min: [2, 'El peso mínimo permitido es 2 kg'], // Límite mínimo actualizado
        max: [5, 'El peso máximo permitido es 5 kg'], // Límite máximo absoluto
        validate: {
            validator: function(v) {
                return v.toString().split('.').length <= 2 && (v.toString().split('.')[1] || '').length <= 2; // Máximo 2 decimales
            },
            message: props => `${props.value} no es un peso válido (máximo dos decimales)`
        }
    },
    purpose: {
        type: String,
        required: [true, 'El propósito es obligatorio'],
        enum: {
            values: ['Reproducción', 'Engorde'],
            message: 'El propósito debe ser Reproducción o Engorde'
        },
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Rabbit = mongoose.model('Rabbit', rabbitSchema);

module.exports = Rabbit;