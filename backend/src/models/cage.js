const mongoose = require('mongoose');

const cageSchema = new mongoose.Schema({
    number: {
        type: Number,
        required: [true, 'El número de jaula es obligatorio'],
        unique: true,
        min: [1, 'El número debe ser mayor a 0'],
        max: [999, 'El número no puede ser mayor a 999'],
        validate: {
            validator: Number.isInteger,
            message: 'El número debe ser un entero positivo'
        }
    },
    type: {
        type: String,
        required: [true, 'El tipo de jaula es obligatorio'],
        enum: {
            values: ['engorde', 'reproducción'],
            message: 'El tipo debe ser engorde o reproducción'
        }
    },
    capacity: {
        type: Number,
        required: [true, 'La capacidad es obligatoria'],
        min: [1, 'La capacidad debe ser mayor a 0'],
        max: [6, 'La capacidad máxima es 6'],
        validate: {
            validator: function (v) {
                if (this.type === 'reproducción') return v === 1;
                if (this.type === 'engorde') return v >= 1 && v <= 6;
                return false;
            },
            message: 'La capacidad no es válida para el tipo de jaula'
        }
    }
});

module.exports = mongoose.model('Cage', cageSchema);