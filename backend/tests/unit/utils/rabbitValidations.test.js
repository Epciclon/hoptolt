const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const Race = require('../../../src/models/race');
const Rabbit = require('../../../src/models/rabbit');
const { validateRabbitData, validateCodeUniqueness } = require('../../../src/utils/rabbitValidations');

describe('Rabbit Validations', () => {
    let mongoServer;

    // Increase timeout for database operations
    jest.setTimeout(30000);

    beforeAll(async () => {
        try {
            mongoServer = await MongoMemoryServer.create();
            const mongoUri = mongoServer.getUri();
            
            if (mongoose.connection.readyState !== 0) {
                await mongoose.disconnect();
            }
            
            await mongoose.connect(mongoUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
        } catch (error) {
            console.error('Error setting up MongoDB:', error);
        }
    });

    afterAll(async () => {
        // Set a timeout for cleanup
        const cleanup = new Promise(async (resolve) => {
            try {
                if (mongoose.connection.readyState !== 0) {
                    await mongoose.connection.close(false);
                }
                if (mongoServer) {
                    await mongoServer.stop(true);
                }
            } catch (error) {
                // Ignore cleanup errors
            }
            resolve();
        });
        
        // Wait for cleanup with timeout
        const timeout = new Promise(resolve => setTimeout(resolve, 2000));
        await Promise.race([cleanup, timeout]);
    });

    beforeEach(async () => {
        try {
            if (mongoose.connection.readyState === 1) {
                await Race.deleteMany({});
                await Rabbit.deleteMany({});
            }
        } catch (error) {
            // Ignore cleanup errors in beforeEach
        }
        
        // Mock console.error to avoid test noise
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(async () => {
        jest.restoreAllMocks();
        // Small delay to allow async operations to complete
        await new Promise(resolve => setTimeout(resolve, 10));
    });

    describe('validateRabbitData', () => {
        beforeEach(async () => {
            // Create some test races
            await Race.insertMany([
                { name: 'Californiana', description: 'Raza Californiana' },
                { name: 'Nueva Zelanda', description: 'Raza Nueva Zelanda' },
                { name: 'Holandés', description: 'Raza Holandés' }
            ]);
        });

        describe('Valid cases', () => {
            it('should pass with valid rabbit data', async () => {
                const data = {
                    race: 'Californiana',
                    code: 'C001',
                    sex: 'macho',
                    age: 6,
                    weight: 2.5,
                    purpose: 'Engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
                expect(result.message).toBe('Validación exitosa.');
            });

            it('should pass with female rabbit for reproduction', async () => {
                const data = {
                    race: 'Nueva Zelanda',
                    code: 'N001',
                    sex: 'hembra',
                    age: 8,
                    weight: 3.2,
                    purpose: 'Reproducción'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should pass with minimum valid values', async () => {
                const data = {
                    race: 'Holandés',
                    code: 'H001',
                    sex: 'hembra',
                    age: 0,
                    weight: 0.1,
                    purpose: 'Engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should pass with maximum valid values', async () => {
                const data = {
                    race: 'Californiana',
                    code: 'C999',
                    sex: 'macho',
                    age: 12,
                    weight: 4.5,
                    purpose: 'Reproducción'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should handle case insensitive code validation', async () => {
                const data = {
                    race: 'Californiana',
                    code: 'c001', // lowercase c
                    sex: 'hembra',
                    age: 5,
                    weight: 2.0,
                    purpose: 'Engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });
        });

        describe('Race validation errors', () => {
            it('should fail when race does not exist in database', async () => {
                const data = {
                    race: 'Inexistente',
                    code: 'I001',
                    sex: 'macho',
                    age: 6,
                    weight: 2.5,
                    purpose: 'Engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('La raza especificada no existe en la base de datos.');
                expect(result.message).toBe('Errores de validación encontrados.');
            });

            it('should fail when race is undefined', async () => {
                const data = {
                    code: 'X001',
                    sex: 'macho',
                    age: 6,
                    weight: 2.5,
                    purpose: 'Engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Raza y código son obligatorios.');
            });

            it('should handle database error when validating race', async () => {
                // Mock Race.findOne to throw an error
                const originalFindOne = Race.findOne;
                Race.findOne = jest.fn().mockImplementation(() => {
                    throw new Error('Database error');
                });

                const data = {
                    race: 'Californiana',
                    code: 'C001',
                    sex: 'macho',
                    age: 6,
                    weight: 2.5,
                    purpose: 'Engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Error al validar la raza.');

                // Restore original method
                Race.findOne = originalFindOne;
            });
        });

        describe('Code validation errors', () => {
            it('should fail when code is undefined', async () => {
                const data = {
                    race: 'Californiana',
                    sex: 'macho',
                    age: 6,
                    weight: 2.5,
                    purpose: 'Engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Raza y código son obligatorios.');
            });

            it('should fail when code format is wrong - no starting letter', async () => {
                const data = {
                    race: 'Californiana',
                    code: '001',
                    sex: 'macho',
                    age: 6,
                    weight: 2.5,
                    purpose: 'Engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('El código debe comenzar con "C" seguido de tres dígitos (ej: C001).');
            });

            it('should fail when code format is wrong - wrong starting letter', async () => {
                const data = {
                    race: 'Californiana',
                    code: 'N001',
                    sex: 'macho',
                    age: 6,
                    weight: 2.5,
                    purpose: 'Engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('El código debe comenzar con "C" seguido de tres dígitos (ej: C001).');
            });

            it('should fail when code format is wrong - not enough digits', async () => {
                const data = {
                    race: 'Californiana',
                    code: 'C01',
                    sex: 'macho',
                    age: 6,
                    weight: 2.5,
                    purpose: 'Engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('El código debe comenzar con "C" seguido de tres dígitos (ej: C001).');
            });

            it('should fail when code format is wrong - too many characters', async () => {
                const data = {
                    race: 'Californiana',
                    code: 'C0001',
                    sex: 'macho',
                    age: 6,
                    weight: 2.5,
                    purpose: 'Engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('El código debe comenzar con "C" seguido de tres dígitos (ej: C001).');
            });

            it('should fail when code has letters in number part', async () => {
                const data = {
                    race: 'Californiana',
                    code: 'C00A',
                    sex: 'macho',
                    age: 6,
                    weight: 2.5,
                    purpose: 'Engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('El código debe comenzar con "C" seguido de tres dígitos (ej: C001).');
            });
        });

        describe('Sex validation errors', () => {
            it('should fail with invalid sex', async () => {
                const data = {
                    race: 'Californiana',
                    code: 'C001',
                    sex: 'invalid',
                    age: 6,
                    weight: 2.5,
                    purpose: 'Engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('El sexo debe ser "macho" o "hembra".');
            });

            it('should fail with undefined sex', async () => {
                const data = {
                    race: 'Californiana',
                    code: 'C001',
                    age: 6,
                    weight: 2.5,
                    purpose: 'Engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('El sexo debe ser "macho" o "hembra".');
            });

            it('should fail with wrong case sex', async () => {
                const data = {
                    race: 'Californiana',
                    code: 'C001',
                    sex: 'MACHO',
                    age: 6,
                    weight: 2.5,
                    purpose: 'Engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('El sexo debe ser "macho" o "hembra".');
            });
        });

        describe('Age validation errors', () => {
            it('should fail with negative age', async () => {
                const data = {
                    race: 'Californiana',
                    code: 'C001',
                    sex: 'macho',
                    age: -1,
                    weight: 2.5,
                    purpose: 'Engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('La edad debe ser un número entero entre 0 y 12 meses.');
            });

            it('should fail with age greater than 12', async () => {
                const data = {
                    race: 'Californiana',
                    code: 'C001',
                    sex: 'macho',
                    age: 13,
                    weight: 2.5,
                    purpose: 'Engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('La edad debe ser un número entero entre 0 y 12 meses.');
            });

            it('should fail with non-integer age', async () => {
                const data = {
                    race: 'Californiana',
                    code: 'C001',
                    sex: 'macho',
                    age: 6.5,
                    weight: 2.5,
                    purpose: 'Engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('La edad debe ser un número entero entre 0 y 12 meses.');
            });

            it('should fail with undefined age', async () => {
                const data = {
                    race: 'Californiana',
                    code: 'C001',
                    sex: 'macho',
                    weight: 2.5,
                    purpose: 'Engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('La edad debe ser un número entero entre 0 y 12 meses.');
            });
        });

        describe('Weight validation errors', () => {
            it('should fail with zero weight', async () => {
                const data = {
                    race: 'Californiana',
                    code: 'C001',
                    sex: 'macho',
                    age: 6,
                    weight: 0,
                    purpose: 'Engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('El peso debe ser un número positivo y no superar los 4.5 kg.');
            });

            it('should fail with negative weight', async () => {
                const data = {
                    race: 'Californiana',
                    code: 'C001',
                    sex: 'macho',
                    age: 6,
                    weight: -1,
                    purpose: 'Engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('El peso debe ser un número positivo y no superar los 4.5 kg.');
            });

            it('should fail with weight greater than 4.5', async () => {
                const data = {
                    race: 'Californiana',
                    code: 'C001',
                    sex: 'macho',
                    age: 6,
                    weight: 5.0,
                    purpose: 'Engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('El peso debe ser un número positivo y no superar los 4.5 kg.');
            });

            it('should fail with non-number weight', async () => {
                const data = {
                    race: 'Californiana',
                    code: 'C001',
                    sex: 'macho',
                    age: 6,
                    weight: 'heavy',
                    purpose: 'Engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('El peso debe ser un número positivo y no superar los 4.5 kg.');
            });

            it('should fail with undefined weight', async () => {
                const data = {
                    race: 'Californiana',
                    code: 'C001',
                    sex: 'macho',
                    age: 6,
                    purpose: 'Engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('El peso debe ser un número positivo y no superar los 4.5 kg.');
            });
        });

        describe('Purpose validation errors', () => {
            it('should fail with invalid purpose', async () => {
                const data = {
                    race: 'Californiana',
                    code: 'C001',
                    sex: 'macho',
                    age: 6,
                    weight: 2.5,
                    purpose: 'invalid'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('El propósito debe ser "Reproducción" o "Engorde".');
            });

            it('should fail with wrong case purpose', async () => {
                const data = {
                    race: 'Californiana',
                    code: 'C001',
                    sex: 'macho',
                    age: 6,
                    weight: 2.5,
                    purpose: 'engorde'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('El propósito debe ser "Reproducción" o "Engorde".');
            });

            it('should fail with undefined purpose', async () => {
                const data = {
                    race: 'Californiana',
                    code: 'C001',
                    sex: 'macho',
                    age: 6,
                    weight: 2.5
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('El propósito debe ser "Reproducción" o "Engorde".');
            });
        });

        describe('Multiple validation errors', () => {
            it('should return all validation errors when multiple fields are invalid', async () => {
                const data = {
                    race: 'Inexistente',
                    code: 'INVALID',
                    sex: 'invalid',
                    age: -1,
                    weight: -1,
                    purpose: 'invalid'
                };

                const result = await validateRabbitData(data);

                expect(result.valid).toBe(false);
                expect(result.errors.length).toBeGreaterThan(1);
                expect(result.message).toBe('Errores de validación encontrados.');
            });
        });
    });

    describe('validateCodeUniqueness', () => {
        beforeEach(async () => {
            // Create some test rabbits
            await Rabbit.insertMany([
                { code: 'C001', race: 'Californiana', sex: 'macho', age: 6, weight: 2.5, purpose: 'Engorde' },
                { code: 'N001', race: 'Nueva Zelanda', sex: 'hembra', age: 8, weight: 3.0, purpose: 'Reproducción' },
                { code: 'H001', race: 'Holandés', sex: 'macho', age: 4, weight: 2.0, purpose: 'Engorde' }
            ]);
        });

        describe('Valid cases', () => {
            it('should pass when code does not exist', async () => {
                const result = await validateCodeUniqueness('C999');

                expect(result.valid).toBe(true);
            });

            it('should pass when code exists but is excluded', async () => {
                const result = await validateCodeUniqueness('C001', 'C001');

                expect(result.valid).toBe(true);
            });

            it('should pass when updating same rabbit code', async () => {
                const result = await validateCodeUniqueness('N001', 'N001');

                expect(result.valid).toBe(true);
            });
        });

        describe('Invalid cases', () => {
            it('should fail when code already exists without exclude', async () => {
                const result = await validateCodeUniqueness('C001');

                expect(result.valid).toBe(false);
                expect(result.message).toBe('El código "C001" ya existe. Debe ser único y no existir ya en la base de datos.');
            });

            it('should fail when code exists in different rabbit', async () => {
                const result = await validateCodeUniqueness('C001', 'N001');

                expect(result.valid).toBe(false);
                expect(result.message).toBe('El código "C001" ya existe en otro conejo. Debe ser único.');
            });

            it('should fail when code exists and different exclude code provided', async () => {
                const result = await validateCodeUniqueness('N001', 'C999');

                expect(result.valid).toBe(false);
                expect(result.message).toBe('El código "N001" ya existe en otro conejo. Debe ser único.');
            });
        });

        describe('Database error handling', () => {
            it('should handle database errors', async () => {
                // Mock Rabbit.find to throw an error
                const originalFind = Rabbit.find;
                Rabbit.find = jest.fn().mockImplementation(() => {
                    throw new Error('Database error');
                });

                const result = await validateCodeUniqueness('C999');

                expect(result.valid).toBe(false);
                expect(result.message).toBe('Error al validar la unicidad del código.');

                // Restore original method
                Rabbit.find = originalFind;
            });
        });

        describe('Edge cases', () => {
            it('should handle empty code', async () => {
                const result = await validateCodeUniqueness('');

                expect(result.valid).toBe(true);
            });

            it('should handle null code', async () => {
                const result = await validateCodeUniqueness(null);

                expect(result.valid).toBe(true);
            });

            it('should handle undefined code', async () => {
                const result = await validateCodeUniqueness(undefined);

                expect(result.valid).toBe(true);
            });

            it('should handle case sensitivity', async () => {
                const result = await validateCodeUniqueness('c001'); // lowercase
                
                // The function searches case-sensitively, so 'c001' != 'C001'
                expect(result.valid).toBe(true);
            });
        });
    });
});
