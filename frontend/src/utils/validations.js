// Validaciones para el manejo de conejos
export const validateRabbitData = (data) => {
    const { race, code, sex, age, weight, purpose } = data;
    const errors = [];

    // Validar que todos los campos obligatorios estén presentes
    if (!race || !code || !sex || !age || !weight || !purpose) {
        errors.push('Todos los campos son obligatorios.');
        return errors;
    }

    // Validar código según la raza seleccionada
    const expectedLetter = race.charAt(0).toUpperCase();
    const codeRegex = new RegExp(`^${expectedLetter}\\d{3}$`);
    if (!codeRegex.test(code)) {
        errors.push(`El código debe comenzar con "${expectedLetter}" seguido de tres dígitos (ej: ${expectedLetter}001) según la raza seleccionada.`);
    }

    // Validar edad
    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < 0 || ageNum > 12) {
        errors.push('La edad debe ser un número entero entre 0 y 12 meses.');
    }

    // Validar peso
    const weightNum = Number(weight);
    if (isNaN(weightNum) || weightNum <= 0 || weightNum > 4.5) {
        errors.push('El peso debe ser un número positivo y no superar los 4.5 kg.');
    }

    // Validar sexo
    const validSexes = ['macho', 'hembra'];
    if (!validSexes.includes(sex)) {
        errors.push('El sexo debe ser "macho" o "hembra".');
    }

    // Validar propósito
    const validPurposes = ['Reproducción', 'Engorde'];
    if (!validPurposes.includes(purpose)) {
        errors.push('El propósito debe ser "Reproducción" o "Engorde".');
    }

    return errors;
};

// Configurar axios para el backend
export const configureAxios = () => {
    if (typeof window !== 'undefined') {
        const axios = require('axios');
        axios.defaults.baseURL = 'http://localhost:5000';
    }
};
