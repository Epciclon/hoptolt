/**
 * Generador de nombres por combinación de sílabas.
 * Evita la necesidad de APIs externas y garantiza variedad
 * y seguridad (sin palabras ofensivas).
 */

const prefixes = [
    'Lu', 'Pe', 'Co', 'Mi', 'Bo', 'Ni', 'Pa', 'Ti', 'Ro', 'Pru', 
    'Pel', 'Man', 'Blan', 'Dul', 'Sal', 'Zan', 'Bri', 'Chis', 'Truf', 'Ore'
];

const middles = [
    'pi', 'co', 'li', 'n', 'qui', 'mi', 'ru', 'le', 'ma', 'ri', 
    'llo', 'lla', 'ti', 'po', 'be', 'su', 'ji', 'ra', 'mu', 'cho'
];

const machoSuffixes = [
    'to', 'po', 'no', 'co', 'n', 'lo', 'ro', 'do', 'cho', 'mo'
];

const hembraSuffixes = [
    'ta', 'pa', 'na', 'ca', 'sa', 'la', 'ra', 'da', 'cha', 'ma'
];

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Genera un nombre aleatorio basado en combinaciones de sílabas.
 * @param {'macho' | 'hembra'} sex - El sexo del conejo
 * @returns {string} El nombre generado
 */
function generateRandomName(sex) {
    // 50% de probabilidad de tener una sílaba media extra
    const useMiddle = Math.random() > 0.5;
    
    const prefix = getRandomElement(prefixes);
    const middle = useMiddle ? getRandomElement(middles) : '';
    const suffix = sex === 'macho' 
        ? getRandomElement(machoSuffixes) 
        : getRandomElement(hembraSuffixes);

    // Evitar dobles consonantes o vocales extrañas si es necesario, 
    // pero la combinación aleatoria suele dar nombres tiernos/graciosos.
    let name = `${prefix}${middle}${suffix}`;
    
    // Convertir primera letra a mayúscula y el resto a minúscula
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

module.exports = {
    generateRandomName
};
