/**
 * Generador de nombres para conejos (Repertorio Masivo de Nombres Únicos).
 * Provee cientos de opciones de nombres de una sola palabra, 
 * evitando adjetivos de personalidad para que el nombre sea neutral y bonito.
 */

const crypto = require('node:crypto');

const nombresMachos = [
    'Pipo', 'Tambor', 'Bugs', 'Copito', 'Oreo', 'Pelusa', 'Toby', 'Max',
    'Roco', 'Coco', 'Zeus', 'Apolo', 'Thor', 'Bruno', 'Simba', 'Leo',
    'Milo', 'Félix', 'Rocky', 'Chester', 'Alfie', 'Oliver', 'Tito', 'Pancho',
    'Pepe', 'Nino', 'Beto', 'Gatsby', 'Loki', 'Finn', 'Archie', 'Benito',
    'Blanco', 'Manchas', 'Pecas', 'Lolo', 'Bimbo', 'Chispa', 'Truffle',
    'Gordi', 'Choco', 'Pompón', 'Algodón', 'Nube', 'Pistacho', 'Cacao', 'Café',
    'Bigotes', 'Tizón', 'Sombra', 'Gris', 'Grisón', 'Cenizo', 'Moka', 'Muffin',
    'Romeo', 'Gael', 'Rex', 'Hércules', 'Goliat', 'Pitufo', 'Lupo', 'Rayo',
    'Flash', 'Sonic', 'Dash', 'Pimienta', 'Sal', 'Cometa', 'Boni', 'Bicho',
    'Peque', 'Chiqui', 'Rufus', 'Dexter', 'Winston', 'Merlín', 'Harry', 'Ron',
    'Dobby', 'Paco', 'Hugo', 'Lucas', 'Mateo', 'Nico', 'Polo', 'Rigo', 'Apollo',
    'Bear', 'Beau', 'Benji', 'Blue', 'Bo', 'Boomer', 'Brady', 'Brody', 'Buster',
    'Cash', 'Chance', 'Chase', 'Chico', 'Cody', 'Cooper', 'Copper', 'Diesel',
    'Duke', 'Frankie', 'George', 'Gizmo', 'Gunner', 'Hank', 'Harley', 'Henry',
    'Hunter', 'Jack', 'Jackson', 'Jasper', 'Jax', 'Joey', 'Kobe', 'Koda',
    'Louie', 'Luke', 'Mac', 'Marley', 'Maverick', 'Moose', 'Murphy', 'Ollie',
    'Otis', 'Peanut', 'Prince', 'Riley', 'Roscoe', 'Rudy', 'Rusty', 'Sam',
    'Sammy', 'Scout', 'Sparky', 'Spike', 'Tank', 'Teddy', 'Tucker', 'Tyson',
    'Vader', 'Yoda', 'Ziggy', 'Zorro', 'Alvin', 'Baloo', 'Bambi', 'Barney',
    'Batman', 'Bingo', 'Boots', 'Casper', 'Chewie', 'Dumbo', 'Elvis', 'Garfield',
    'Goofy', 'Homer', 'Kermit', 'Mickey', 'Nemo', 'Pikachu', 'Pluto', 'Scooby',
    'Snoopy', 'Tarzán', 'Yoshi', 'Frodo', 'Gandalf', 'Gollum', 'Bilbo', 'Aragorn',
    'Legolas', 'Gimli', 'Sauron', 'Elrond', 'Samwise', 'Pippin', 'Merry',
    'Boromir', 'Faramir', 'Theoden', 'Eomer', 'Odin', 'Tyr', 'Balder', 'Frey',
    'Heimdall', 'Njord', 'Bragi', 'Vidar', 'Vali', 'Ull', 'Forseti', 'Hermod',
    'Hoder', 'Mimir', 'Kvasir', 'Vili', 'Ve', 'Hoenir', 'Magni', 'Modi', 'Trud',
    'Buri', 'Bor', 'Ymir', 'Audhumla', 'Byleist', 'Helblindi', 'Farbauti',
    'Laufey', 'Angrboda', 'Fenrir', 'Jormungand', 'Sleipnir', 'Hugin', 'Munin',
    'Geri', 'Freki', 'Ratatosk', 'Nidhogg', 'Dain', 'Dvalin', 'Duneyr', 'Durathor',
    'Tom', 'Jerry', 'Porky', 'Daffy', 'Sylvester', 'Tweety', 'Wile', 'Road',
    'Runner', 'Speedy', 'Gonzales', 'Foghorn', 'Leghorn', 'Pepe', 'Le', 'Pew',
    'Marvin', 'Martian', 'Taz', 'Elmer', 'Fudd', 'Yosemite', 'Sam', 'Gossamer',
    // Cientos de adiciones nuevas machos:
    'Rocco', 'Dante', 'Ares', 'Snoopy', 'Scooby', 'Scrappy', 'Dogo', 'Golfo',
    'Goliath', 'Gunter', 'Hans', 'Otto', 'Boris', 'Igor', 'Klaus', 'Fritz',
    'Bacon', 'Bagel', 'Waffle', 'Pancake', 'Noodle', 'Macaroni', 'Taco', 'Nacho',
    'Pringles', 'Dorito', 'Burrito', 'Sushi', 'Maki', 'Ramen', 'Churro', 'Mango',
    'Melón', 'Limón', 'Mandarín', 'Frijol', 'Poroto', 'Garbanzo', 'Maní', 'Nuez',
    'Almendra', 'Burbuja', 'Cohete', 'Meteorito', 'Trueno', 'Relámpago', 'Volcán',
    'Ciclón', 'Tornado', 'Huracán', 'Terremoto', 'Tsunami', 'Avalancha', 'Glaciar',
    'Everest', 'Canyon', 'Océano', 'Río', 'Lago', 'Bosque', 'Selva', 'Desierto',
    'Oasis', 'Safari', 'Astro', 'Cosmos', 'Galaxia', 'Nebulosa', 'Orión', 'Sirio',
    'Draco', 'Cástor', 'Pólux', 'Rigel', 'Vega', 'Altair', 'Deneb', 'Capella',
    'Arthur', 'Lancelot', 'Gawain', 'Percival', 'Bors', 'Tristan', 'Galahad',
    'Merlin', 'Mordred', 'Robin', 'Hood', 'Little', 'John', 'Friar', 'Tuck',
    'Will', 'Scarlet', 'Sheriff', 'Nottingham', 'King', 'Richard', 'Prince',
    'John', 'Mario', 'Luigi', 'Bowser', 'Toad', 'Wario', 'Waluigi', 'Donkey',
    'Kong', 'Diddy', 'Link', 'Zelda', 'Ganon', 'Kirby', 'Fox', 'Falco', 'Slippy',
    'Peppy', 'Wolf', 'Leon', 'Chris', 'Wesker', 'Nemesis', 'Tyrant', 'Goku',
    'Vegeta', 'Gohan', 'Piccolo', 'Krillin', 'Yamcha', 'Tien', 'Chiaotzu',
    'Frieza', 'Cell', 'Buu', 'Naruto', 'Sasuke', 'Kakashi', 'Itachi', 'Jiraiya',
    'Orochimaru', 'Gaara', 'Shikamaru', 'Neji', 'Rock', 'Lee', 'Gai', 'Madara'
];

const nombresHembras = [
    'Luna', 'Lola', 'Kira', 'Nala', 'Mia', 'Mila', 'Pelusa', 'Blanquita',
    'Nina', 'Minnie', 'Daisy', 'Chloe', 'Cleo', 'Bela', 'Bella', 'Princesa',
    'Reina', 'Estrella', 'Canela', 'Miel', 'Coco', 'Rosita', 'Lili', 'Lila',
    'Flora', 'Flor', 'Margarita', 'Maya', 'Nube', 'Perla', 'Rubí', 'Gema',
    'Jade', 'Ambar', 'Zafiro', 'Orejitas', 'Motita', 'Manchita', 'Ceniza',
    'Niebla', 'Brisa', 'Lluvia', 'Arena', 'Gala', 'Dona', 'Muffin', 'Moca',
    'Galleta', 'Vainilla', 'Menta', 'Fresa', 'Mora', 'Kiwi', 'Lulú', 'Mimí',
    'Tita', 'Fifi', 'Gigi', 'Kika', 'Pipa', 'Pepa', 'Cloe', 'Zoe', 'Noa',
    'Alma', 'Aria', 'Sansa', 'Arya', 'Leia', 'Amidala', 'Padme', 'Mulan',
    'Ariel', 'Aurora', 'Cenicienta', 'Jazmín', 'Tiana', 'Mérida', 'Elsa',
    'Anna', 'Blanca', 'Pinta', 'Cata', 'Rita', 'Mona', 'Lita', 'Susi', 'Lía',
    'Abby', 'Angel', 'Annie', 'Athena', 'Bailey', 'Bonnie', 'Brandy', 'Callie',
    'Candy', 'Carly', 'Casey', 'Cassie', 'Chanel', 'Cherry', 'Chica', 'Cocoa',
    'Cookie', 'Dakota', 'Daphne', 'Darla', 'Delilah', 'Diamond', 'Dixie', 'Dolly',
    'Duchess', 'Ella', 'Ellie', 'Emma', 'Fiona', 'Ginger', 'Gracie', 'Hannah',
    'Hazel', 'Heidi', 'Holly', 'Honey', 'Izzy', 'Jasmine', 'Josie', 'Katie',
    'Kona', 'Lacy', 'Lady', 'Layla', 'Lexi', 'Lily', 'Lucy', 'Macie', 'Macy',
    'Maddie', 'Maggie', 'Marlay', 'Millie', 'Missy', 'Misty', 'Mocha', 'Molly',
    'Nikki', 'Olive', 'Paris', 'Pearl', 'Pebbles', 'Penny', 'Pepper', 'Phoebe',
    'Piper', 'Princess', 'Rosie', 'Roxy', 'Ruby', 'Sadie', 'Sally', 'Sandy',
    'Sasha', 'Sassy', 'Scout', 'Shadow', 'Shelby', 'Sierra', 'Sophie', 'Stella',
    'Sugar', 'Sydney', 'Tasha', 'Tess', 'Trixie', 'Willow', 'Winnie', 'Xena',
    'Zelda', 'Freya', 'Frigg', 'Sif', 'Idun', 'Skadi', 'Nanna', 'Sigyn', 'Eir',
    'Gefion', 'Fulla', 'Sjofn', 'Lofn', 'Var', 'Vor', 'Syn', 'Hlin', 'Snotra',
    'Gna', 'Sol', 'Bil', 'Jord', 'Rind', 'Gerd', 'Gunnlod', 'Grid', 'Jarnsaxa',
    'Thrud', 'Hnoss', 'Gersemi', 'Valkyrie', 'Brynhild', 'Gudrun', 'Sigrdrifa',
    'Svava', 'Kara', 'Hervor', 'Alfhild', 'Auda', 'Bera', 'Doda', 'Edda',
    // Cientos de adiciones nuevas hembras:
    'Frida', 'Mafalda', 'Matilda', 'Heidi', 'Pippi', 'Coraline', 'Alicia',
    'Dorothy', 'Wendy', 'Campanita', 'Tinkerbell', 'Ariel', 'Bella', 'Jasmine',
    'Pocahontas', 'Mulan', 'Tiana', 'Rapunzel', 'Merida', 'Moana', 'Elsa',
    'Anna', 'Olafina', 'Svenia', 'Kristoffa', 'Hansina', 'Gretel', 'Caperucita',
    'Cenicienta', 'Blancanieves', 'Aurora', 'Maléfica', 'Cruella', 'Ursula',
    'Gothel', 'Tremaine', 'Gastonina', 'Jafara', 'Scarlett', 'Fiona', 'Shrekina',
    'Burrita', 'Dragona', 'Doris', 'Marlin', 'Nema', 'Dory', 'Peach', 'Daisy',
    'Rosalina', 'Pauline', 'Toadette', 'Birdo', 'Dixie', 'Tiny', 'Candy',
    'Chunky', 'Lanky', 'Samus', 'Ripley', 'Sarah', 'Connor', 'Leia', 'Padme',
    'Rey', 'Jyn', 'Ahsoka', 'Hera', 'Sabine', 'Zebina', 'Ezrina', 'Kananina',
    'Chopperina', 'Chewie', 'Han', 'Luke', 'Obi', 'Anakin',
    'Yoda', 'Mace', 'Qui', 'Gon', 'Dooku', 'Maul', 'Sidious', 'Vader', 'Kylo',
    'Snoke', 'Hux', 'Phasma', 'Poe', 'Finn', 'Rose', 'Holdo', 'Ackbar', 'Lando',
    'Boba', 'Jango', 'Greedo', 'Jabba', 'Wicket', 'Ewok', 'Porg', 'Tauntaun',
    'Wampa', 'Rancor', 'Sarlacc', 'Krayt', 'Bantha', 'Dewback', 'Ronto', 'Eopie'
];

function getRandomElement(arr) {
    return arr[crypto.randomInt(arr.length)];
}

function generateRandomName(sex) {
    const listNombres = sex === 'macho' ? nombresMachos : nombresHembras;
    return getRandomElement(listNombres);
}

module.exports = {
    generateRandomName
};
