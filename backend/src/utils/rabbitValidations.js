const mongoose = require('mongoose');
const Race = require('../models/race');

const validateRabbitData = async (data) => {
    const { race, code, sex, age, weight, purpose } = data;
    const errors = [];

    // Validar raza - verificar que existe en la base de datos
    try {
        const raceExists = await Race.findOne({ name: race });
        if (!raceExists) {
            errors.push('La raza especificada no existe en la base de datos.');
        }
    } catch (error) {
        errors.push('Error al validar la raza.');
    }

    // Validar código - debe comenzar con la primera letra de la raza seguida de 3 dígitos
    if (!race || !code) {
        errors.push('Raza y código son obligatorios.');
    } else {
        const expectedLetter = race.charAt(0).toUpperCase();
        const codeRegex = new RegExp(`^${expectedLetter}\\d{3}$`, 'i'); // 'i' para case-insensitive
        if (!codeRegex.test(code)) {
            errors.push(`El código debe comenzar con "${expectedLetter}" seguido de tres dígitos (ej: ${expectedLetter}001).`);
        }
    }

    // Validar sexo
    const validSexes = ['macho', 'hembra'];
    if (!validSexes.includes(sex)) {
        errors.push('El sexo debe ser "macho" o "hembra".');
    }

    // Validar edad
    if (!Number.isInteger(age) || age < 0 || age > 12) {
        errors.push('La edad debe ser un número entero entre 0 y 12 meses.');
    }

    // Validar peso
    if (typeof weight !== 'number' || weight <= 0 || weight > 4.5) {
        errors.push('El peso debe ser un número positivo y no superar los 4.5 kg.');
    }

    // Validar propósito
    const validPurposes = ['Reproducción', 'Engorde'];
    if (!validPurposes.includes(purpose)) {
        errors.push('El propósito debe ser "Reproducción" o "Engorde".');
    }

    return {
        valid: errors.length === 0,
        errors: errors,
        message: errors.length === 0 ? 'Validación exitosa.' : 'Errores de validación encontrados.'
    };
};

const validateCodeUniqueness = async (code, excludeCode = null) => {
    try {
        const Rabbit = mongoose.model('Rabbit');
        
        // Buscar todos los conejos con este código
        const existingRabbits = await Rabbit.find({ code });
        
        // Si no hay conejos con este código, es válido
        if (existingRabbits.length === 0) {
            return { valid: true };
        }
        
        // Si hay excludeCode, verificar si todos los conejos encontrados son el que estamos excluyendo
        if (excludeCode) {
            const otherRabbits = existingRabbits.filter(rabbit => rabbit.code !== excludeCode);
            
            if (otherRabbits.length === 0) {
                return { valid: true };
            } else {
                return { 
                    valid: false, 
                    message: `El código "${code}" ya existe en otro conejo. Debe ser único.` 
                };
            }
        } else {
            // No hay excludeCode, por lo que cualquier conejo existente es conflicto
            return { 
                valid: false, 
                message: `El código "${code}" ya existe. Debe ser único y no existir ya en la base de datos.` 
            };
        }
    } catch (error) {
        console.error('Error al validar unicidad del código:', error);
        return { valid: false, message: 'Error al validar la unicidad del código.' };
    }
};

module.exports = {
    validateRabbitData,
    validateCodeUniqueness
};