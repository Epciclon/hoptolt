const mongoose = require('mongoose');

const assignRabbitSchema = new mongoose.Schema({
    cageNumber: { type: Number, required: true },
    rabbitCode: { type: String, required: true },
    status: { type: String, default: 'asignado' },
    assignedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AssignRabbit', assignRabbitSchema);

