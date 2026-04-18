/**
 * Unit tests for Rabbit model
 * Testing all validations and business logic
 * Following the Arrange, Act, Assert pattern
 */

const Rabbit = require('../../../src/models/rabbit');
const Race = require('../../../src/models/race');
const { createTestRabbit, createTestRace } = require('../../helpers/testHelpers');

describe('Rabbit Model', () => {
    
    describe('Rabbit Creation and Validation', () => {
        
        test('should create a valid rabbit with all required fields', async () => {
            // Arrange
            const race = await createTestRace({ name: 'TestRace' });
            const rabbitData = {
                race: 'TestRace',
                code: 'T001',
                sex: 'macho',
                age: 6,
                weight: 3.5,
                purpose: 'Engorde'
            };

            // Act
            const rabbit = new Rabbit(rabbitData);
            const savedRabbit = await rabbit.save();

            // Assert
            expect(savedRabbit._id).toBeDefined();
            expect(savedRabbit.race).toBe('TestRace');
            expect(savedRabbit.code).toBe('T001');
            expect(savedRabbit.sex).toBe('macho');
            expect(savedRabbit.age).toBe(6);
            expect(savedRabbit.weight).toBe(3.5);
            expect(savedRabbit.purpose).toBe('Engorde');
            expect(savedRabbit.initialAge).toBe(6); // Should default to age
            expect(savedRabbit.createdAt).toBeDefined();
        });

        test('should fail validation when race is missing', async () => {
            // Arrange
            const rabbitData = {
                code: 'T001',
                sex: 'macho',
                age: 6,
                weight: 3.5,
                purpose: 'Engorde'
            };

            // Act & Assert
            const rabbit = new Rabbit(rabbitData);
            await expect(rabbit.save()).rejects.toThrow('La raza es obligatoria');
        });

        test('should fail validation when code is missing', async () => {
            // Arrange
            await createTestRace({ name: 'TestRace' });
            const rabbitData = {
                race: 'TestRace',
                sex: 'macho',
                age: 6,
                weight: 3.5,
                purpose: 'Engorde'
            };

            // Act & Assert
            const rabbit = new Rabbit(rabbitData);
            await expect(rabbit.save()).rejects.toThrow('El código es obligatorio');
        });

        test('should fail validation when sex is missing', async () => {
            // Arrange
            await createTestRace({ name: 'TestRace' });
            const rabbitData = {
                race: 'TestRace',
                code: 'T001',
                age: 6,
                weight: 3.5,
                purpose: 'Engorde'
            };

            // Act & Assert
            const rabbit = new Rabbit(rabbitData);
            await expect(rabbit.save()).rejects.toThrow('El sexo es obligatorio');
        });

        test('should fail validation when age is missing', async () => {
            // Arrange
            await createTestRace({ name: 'TestRace' });
            const rabbitData = {
                race: 'TestRace',
                code: 'T001',
                sex: 'macho',
                weight: 3.5,
                purpose: 'Engorde'
            };

            // Act & Assert
            const rabbit = new Rabbit(rabbitData);
            await expect(rabbit.save()).rejects.toThrow('La edad es obligatoria');
        });

        test('should fail validation when weight is missing', async () => {
            // Arrange
            await createTestRace({ name: 'TestRace' });
            const rabbitData = {
                race: 'TestRace',
                code: 'T001',
                sex: 'macho',
                age: 6,
                purpose: 'Engorde'
            };

            // Act & Assert
            const rabbit = new Rabbit(rabbitData);
            await expect(rabbit.save()).rejects.toThrow('El peso es obligatorio');
        });

        test('should fail validation when purpose is missing', async () => {
            // Arrange
            await createTestRace({ name: 'TestRace' });
            const rabbitData = {
                race: 'TestRace',
                code: 'T001',
                sex: 'macho',
                age: 6,
                weight: 3.5
            };

            // Act & Assert
            const rabbit = new Rabbit(rabbitData);
            await expect(rabbit.save()).rejects.toThrow('El propósito es obligatorio');
        });

    });

    describe('Code Validation', () => {
        
        test('should accept valid code format', async () => {
            // Arrange
            await createTestRace({ name: 'TestRace' });
            const validCodes = ['A001', 'B999', 'Z123'];

            // Act & Assert
            for (const code of validCodes) {
                const rabbit = await createTestRabbit({ 
                    code: code,
                    race: 'TestRace'
                });
                expect(rabbit.code).toBe(code);
            }
        });

        test('should fail validation with invalid code format', async () => {
            // Arrange
            await createTestRace({ name: 'TestRace' });
            const invalidCodes = ['1234', 'ABC1', 'a001', 'A12', 'AA001'];

            // Act & Assert
            for (const code of invalidCodes) {
                const rabbitData = {
                    race: 'TestRace',
                    code: code,
                    sex: 'macho',
                    age: 6,
                    weight: 3.5,
                    purpose: 'Engorde'
                };
                
                const rabbit = new Rabbit(rabbitData);
                await expect(rabbit.save()).rejects.toThrow();
            }
        });

        test('should enforce unique code', async () => {
            // Arrange
            await createTestRace({ name: 'TestRace' });
            await createTestRabbit({ code: 'T001', race: 'TestRace' });

            const duplicateRabbitData = {
                race: 'TestRace',
                code: 'T001', // Duplicate code
                sex: 'hembra',
                age: 8,
                weight: 3.0,
                purpose: 'Reproducción'
            };

            // Act & Assert
            const rabbit = new Rabbit(duplicateRabbitData);
            await expect(rabbit.save()).rejects.toThrow();
        });

    });

    describe('Sex Validation', () => {
        
        test('should accept valid sex values', async () => {
            // Arrange
            await createTestRace({ name: 'TestRace' });
            const validSexes = ['macho', 'hembra'];

            // Act & Assert
            for (const sex of validSexes) {
                const rabbit = await createTestRabbit({ 
                    code: `T00${validSexes.indexOf(sex) + 1}`,
                    sex: sex,
                    race: 'TestRace'
                });
                expect(rabbit.sex).toBe(sex);
            }
        });

        test('should fail validation with invalid sex value', async () => {
            // Arrange
            await createTestRace({ name: 'TestRace' });
            const invalidSexes = ['male', 'female', 'otro', ''];

            // Act & Assert
            for (const sex of invalidSexes) {
                const rabbitData = {
                    race: 'TestRace',
                    code: 'T001',
                    sex: sex,
                    age: 6,
                    weight: 3.5,
                    purpose: 'Engorde'
                };
                
                const rabbit = new Rabbit(rabbitData);
                await expect(rabbit.save()).rejects.toThrow();
            }
        });

    });

    describe('Age Validation', () => {
        
        test('should accept valid age values', async () => {
            // Arrange
            await createTestRace({ name: 'TestRace' });
            const validAges = [0, 6, 12];
            const validAgesWithInitial = [
                { age: 24, initialAge: 12 },
                { age: 120, initialAge: 12 }
            ];

            // Act & Assert
            for (const age of validAges) {
                const rabbit = await createTestRabbit({ 
                    code: `T00${validAges.indexOf(age) + 1}`,
                    age: age,
                    race: 'TestRace'
                });
                expect(rabbit.age).toBe(age);
            }

            // Test ages greater than 12 with explicit initialAge
            for (const testData of validAgesWithInitial) {
                const rabbit = await createTestRabbit({ 
                    code: `T00${validAges.length + validAgesWithInitial.indexOf(testData) + 1}`,
                    age: testData.age,
                    initialAge: testData.initialAge,
                    race: 'TestRace'
                });
                expect(rabbit.age).toBe(testData.age);
                expect(rabbit.initialAge).toBe(testData.initialAge);
            }
        });

        test('should fail validation with negative age', async () => {
            // Arrange
            await createTestRace({ name: 'TestRace' });
            const rabbitData = {
                race: 'TestRace',
                code: 'T001',
                sex: 'macho',
                age: -1,
                weight: 3.5,
                purpose: 'Engorde'
            };

            // Act & Assert
            const rabbit = new Rabbit(rabbitData);
            await expect(rabbit.save()).rejects.toThrow('La edad mínima es 0 meses');
        });

        test('should fail validation with age over maximum', async () => {
            // Arrange
            await createTestRace({ name: 'TestRace' });
            const rabbitData = {
                race: 'TestRace',
                code: 'T001',
                sex: 'macho',
                age: 121,
                weight: 3.5,
                purpose: 'Engorde'
            };

            // Act & Assert
            const rabbit = new Rabbit(rabbitData);
            await expect(rabbit.save()).rejects.toThrow('La edad máxima es 120 meses');
        });

    });

    describe('Initial Age Validation', () => {
        
        test('should default initial age to current age', async () => {
            // Arrange
            await createTestRace({ name: 'TestRace' });
            const age = 6;

            // Act
            const rabbit = await createTestRabbit({ 
                age: age,
                race: 'TestRace'
            });

            // Assert
            expect(rabbit.initialAge).toBe(age);
        });

        test('should accept custom initial age', async () => {
            // Arrange
            await createTestRace({ name: 'TestRace' });
            const rabbitData = {
                race: 'TestRace',
                code: 'T001',
                sex: 'macho',
                age: 8,
                initialAge: 3,
                weight: 3.5,
                purpose: 'Engorde'
            };

            // Act
            const rabbit = new Rabbit(rabbitData);
            const savedRabbit = await rabbit.save();

            // Assert
            expect(savedRabbit.initialAge).toBe(3);
        });

        test('should fail validation with negative initial age', async () => {
            // Arrange
            await createTestRace({ name: 'TestRace' });
            const rabbitData = {
                race: 'TestRace',
                code: 'T001',
                sex: 'macho',
                age: 6,
                initialAge: -1,
                weight: 3.5,
                purpose: 'Engorde'
            };

            // Act & Assert
            const rabbit = new Rabbit(rabbitData);
            await expect(rabbit.save()).rejects.toThrow('La edad inicial mínima es 0 meses');
        });

        test('should fail validation with initial age over maximum', async () => {
            // Arrange
            await createTestRace({ name: 'TestRace' });
            const rabbitData = {
                race: 'TestRace',
                code: 'T001',
                sex: 'macho',
                age: 6,
                initialAge: 13,
                weight: 3.5,
                purpose: 'Engorde'
            };

            // Act & Assert
            const rabbit = new Rabbit(rabbitData);
            await expect(rabbit.save()).rejects.toThrow('La edad inicial máxima es 12 meses');
        });

    });

    describe('Weight Validation', () => {
        
        test('should accept valid weight values', async () => {
            // Arrange
            await createTestRace({ name: 'TestRace' });
            const validWeights = [2.0, 3.5, 4.99, 5.0];

            // Act & Assert
            for (let i = 0; i < validWeights.length; i++) {
                const weight = validWeights[i];
                const rabbit = await createTestRabbit({ 
                    code: `T00${i + 1}`,
                    weight: weight,
                    race: 'TestRace'
                });
                expect(rabbit.weight).toBe(weight);
            }
        });

        test('should fail validation with weight below minimum', async () => {
            // Arrange
            await createTestRace({ name: 'TestRace' });
            const rabbitData = {
                race: 'TestRace',
                code: 'T001',
                sex: 'macho',
                age: 6,
                weight: 1.9,
                purpose: 'Engorde'
            };

            // Act & Assert
            const rabbit = new Rabbit(rabbitData);
            await expect(rabbit.save()).rejects.toThrow('El peso mínimo permitido es 2 kg');
        });

        test('should fail validation with weight above maximum', async () => {
            // Arrange
            await createTestRace({ name: 'TestRace' });
            const rabbitData = {
                race: 'TestRace',
                code: 'T001',
                sex: 'macho',
                age: 6,
                weight: 5.1,
                purpose: 'Engorde'
            };

            // Act & Assert
            const rabbit = new Rabbit(rabbitData);
            await expect(rabbit.save()).rejects.toThrow('El peso máximo permitido es 5 kg');
        });

        test('should fail validation with more than 2 decimal places', async () => {
            // Arrange
            await createTestRace({ name: 'TestRace' });
            const rabbitData = {
                race: 'TestRace',
                code: 'T001',
                sex: 'macho',
                age: 6,
                weight: 3.555,
                purpose: 'Engorde'
            };

            // Act & Assert
            const rabbit = new Rabbit(rabbitData);
            await expect(rabbit.save()).rejects.toThrow('no es un peso válido');
        });

    });

    describe('Purpose Validation', () => {
        
        test('should accept valid purpose values', async () => {
            // Arrange
            await createTestRace({ name: 'TestRace' });
            const validPurposes = ['Reproducción', 'Engorde'];

            // Act & Assert
            for (const purpose of validPurposes) {
                const rabbit = await createTestRabbit({ 
                    code: `T00${validPurposes.indexOf(purpose) + 1}`,
                    purpose: purpose,
                    race: 'TestRace'
                });
                expect(rabbit.purpose).toBe(purpose);
            }
        });

        test('should fail validation with invalid purpose value', async () => {
            // Arrange
            await createTestRace({ name: 'TestRace' });
            const invalidPurposes = ['Breeding', 'Fattening', 'Pet', ''];

            // Act & Assert
            for (const purpose of invalidPurposes) {
                const rabbitData = {
                    race: 'TestRace',
                    code: 'T001',
                    sex: 'macho',
                    age: 6,
                    weight: 3.5,
                    purpose: purpose
                };
                
                const rabbit = new Rabbit(rabbitData);
                await expect(rabbit.save()).rejects.toThrow();
            }
        });

    });

    describe('Schema Defaults and Properties', () => {
        
        test('should set createdAt timestamp', async () => {
            // Arrange
            const before = new Date();

            // Act
            const rabbit = await createTestRabbit();

            // Assert
            const after = new Date();
            expect(rabbit.createdAt).toBeDefined();
            expect(rabbit.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(rabbit.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        test('should have all required schema properties', async () => {
            // Arrange & Act
            const rabbit = await createTestRabbit();

            // Assert
            expect(rabbit).toHaveProperty('race');
            expect(rabbit).toHaveProperty('code');
            expect(rabbit).toHaveProperty('sex');
            expect(rabbit).toHaveProperty('age');
            expect(rabbit).toHaveProperty('initialAge');
            expect(rabbit).toHaveProperty('weight');
            expect(rabbit).toHaveProperty('purpose');
            expect(rabbit).toHaveProperty('createdAt');
            expect(rabbit).toHaveProperty('_id');
        });

    });

});
