const validateCageData = (data, isNew = true) => {
    const errors = [];
    const { number, type, capacity } = data;

    if (number === undefined || number === null || number === '') {
        errors.push('El número de jaula es obligatorio.');
    } else if (!Number.isInteger(Number(number)) || Number(number) <= 0 || Number(number) > 999) {
        errors.push('El número de jaula debe ser un entero positivo menor o igual a 999.');
    }

    if (!type || !['engorde', 'reproducción'].includes(type)) {
        errors.push('El tipo de jaula debe ser engorde o reproducción.');
    }

    if (capacity === undefined || capacity === null || capacity === '') {
        errors.push('La capacidad es obligatoria.');
    } else if (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0) {
        errors.push('La capacidad debe ser un número entero positivo.');
    } else if (type === 'reproducción' && Number(capacity) !== 1) {
        errors.push('La capacidad máxima para jaula de reproducción es 1.');
    } else if (type === 'engorde' && (Number(capacity) < 1 || Number(capacity) > 6)) {
        errors.push('La capacidad para jaula de engorde debe ser entre 1 y 6.');
    }

    return errors;
};

module.exports = { validateCageData };