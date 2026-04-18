/**
 * Unit tests for Cage model
 * Testing all validations and business logic
 * Following the Arrange, Act, Assert pattern
 */

const Cage = require('../../../src/models/cage');
const { createTestCage } = require('../../helpers/testHelpers');

describe('Cage Model', () => {
    
    describe('Cage Creation and Validation', () => {
        
        test('should create a valid engorde cage with all required fields', async () => {
            // Arrange
            const cageData = {
                number: 1,
                type: 'engorde',
                capacity: 4
            };

            // Act
            const cage = new Cage(cageData);
            const savedCage = await cage.save();

            // Assert
            expect(savedCage._id).toBeDefined();
            expect(savedCage.number).toBe(1);
            expect(savedCage.type).toBe('engorde');
            expect(savedCage.capacity).toBe(4);
        });

        test('should create a valid reproducción cage', async () => {
            // Arrange
            const cageData = {
                number: 2,
                type: 'reproducción',
                capacity: 1
            };

            // Act
            const cage = new Cage(cageData);
            const savedCage = await cage.save();

            // Assert
            expect(savedCage._id).toBeDefined();
            expect(savedCage.number).toBe(2);
            expect(savedCage.type).toBe('reproducción');
            expect(savedCage.capacity).toBe(1);
        });

        test('should fail validation when number is missing', async () => {
            // Arrange
            const cageData = {
                type: 'engorde',
                capacity: 4
            };

            // Act & Assert
            const cage = new Cage(cageData);
            await expect(cage.save()).rejects.toThrow('El número de jaula es obligatorio');
        });

        test('should fail validation when type is missing', async () => {
            // Arrange
            const cageData = {
                number: 1,
                capacity: 4
            };

            // Act & Assert
            const cage = new Cage(cageData);
            await expect(cage.save()).rejects.toThrow('El tipo de jaula es obligatorio');
        });

        test('should fail validation when capacity is missing', async () => {
            // Arrange
            const cageData = {
                number: 1,
                type: 'engorde'
            };

            // Act & Assert
            const cage = new Cage(cageData);
            await expect(cage.save()).rejects.toThrow('La capacidad es obligatoria');
        });

    });

    describe('Number Validation', () => {
        
        test('should accept valid cage numbers', async () => {
            // Arrange
            const validNumbers = [1, 50, 999];

            // Act & Assert
            for (const number of validNumbers) {
                const cage = await createTestCage({ number: number });
                expect(cage.number).toBe(number);
            }
        });

        test('should fail validation with number below minimum', async () => {
            // Arrange
            const cageData = {
                number: 0,
                type: 'engorde',
                capacity: 4
            };

            // Act & Assert
            const cage = new Cage(cageData);
            await expect(cage.save()).rejects.toThrow('El número debe ser mayor a 0');
        });

        test('should fail validation with number above maximum', async () => {
            // Arrange
            const cageData = {
                number: 1000,
                type: 'engorde',
                capacity: 4
            };

            // Act & Assert
            const cage = new Cage(cageData);
            await expect(cage.save()).rejects.toThrow('El número no puede ser mayor a 999');
        });

        test('should fail validation with non-integer number', async () => {
            // Arrange
            const cageData = {
                number: 1.5,
                type: 'engorde',
                capacity: 4
            };

            // Act & Assert
            const cage = new Cage(cageData);
            await expect(cage.save()).rejects.toThrow('El número debe ser un entero positivo');
        });

        test('should enforce unique cage numbers', async () => {
            // Arrange
            await createTestCage({ number: 1 });

            const duplicateCageData = {
                number: 1, // Duplicate number
                type: 'reproducción',
                capacity: 1
            };

            // Act & Assert
            const cage = new Cage(duplicateCageData);
            await expect(cage.save()).rejects.toThrow();
        });

    });

    describe('Type Validation', () => {
        
        test('should accept valid cage types', async () => {
            // Arrange
            const validTypes = ['engorde', 'reproducción'];

            // Act & Assert
            for (let i = 0; i < validTypes.length; i++) {
                const type = validTypes[i];
                const capacity = type === 'reproducción' ? 1 : 4;
                const cage = await createTestCage({ 
                    number: i + 1,
                    type: type,
                    capacity: capacity
                });
                expect(cage.type).toBe(type);
            }
        });

        test('should fail validation with invalid cage type', async () => {
            // Arrange
            const invalidTypes = ['breeding', 'fattening', 'other', ''];

            // Act & Assert
            for (const type of invalidTypes) {
                const cageData = {
                    number: 1,
                    type: type,
                    capacity: 4
                };
                
                const cage = new Cage(cageData);
                await expect(cage.save()).rejects.toThrow();
            }
        });

    });

    describe('Capacity Validation', () => {
        
        test('should accept valid capacity for engorde cages', async () => {
            // Arrange
            const validCapacities = [1, 2, 3, 4, 5, 6];

            // Act & Assert
            for (let i = 0; i < validCapacities.length; i++) {
                const capacity = validCapacities[i];
                const cage = await createTestCage({ 
                    number: i + 1,
                    type: 'engorde',
                    capacity: capacity
                });
                expect(cage.capacity).toBe(capacity);
            }
        });

        test('should only accept capacity 1 for reproducción cages', async () => {
            // Arrange
            const cageData = {
                number: 1,
                type: 'reproducción',
                capacity: 1
            };

            // Act
            const cage = new Cage(cageData);
            const savedCage = await cage.save();

            // Assert
            expect(savedCage.capacity).toBe(1);
        });

        test('should fail validation for reproducción cage with capacity > 1', async () => {
            // Arrange
            const invalidCapacities = [2, 3, 4, 5, 6];

            // Act & Assert
            for (const capacity of invalidCapacities) {
                const cageData = {
                    number: 1,
                    type: 'reproducción',
                    capacity: capacity
                };
                
                const cage = new Cage(cageData);
                await expect(cage.save()).rejects.toThrow('La capacidad no es válida para el tipo de jaula');
            }
        });

        test('should fail validation with capacity below minimum', async () => {
            // Arrange
            const cageData = {
                number: 1,
                type: 'engorde',
                capacity: 0
            };

            // Act & Assert
            const cage = new Cage(cageData);
            await expect(cage.save()).rejects.toThrow('La capacidad debe ser mayor a 0');
        });

        test('should fail validation with capacity above maximum for engorde', async () => {
            // Arrange
            const cageData = {
                number: 1,
                type: 'engorde',
                capacity: 7
            };

            // Act & Assert
            const cage = new Cage(cageData);
            await expect(cage.save()).rejects.toThrow('La capacidad máxima es 6');
        });

    });

    describe('Business Logic Validation', () => {
        
        test('should validate type-capacity combinations correctly', async () => {
            // Arrange & Act & Assert
            
            // Valid combinations
            const validCombinations = [
                { type: 'engorde', capacity: 1 },
                { type: 'engorde', capacity: 3 },
                { type: 'engorde', capacity: 6 },
                { type: 'reproducción', capacity: 1 }
            ];

            for (let i = 0; i < validCombinations.length; i++) {
                const combo = validCombinations[i];
                const cage = await createTestCage({
                    number: i + 1,
                    type: combo.type,
                    capacity: combo.capacity
                });
                expect(cage.type).toBe(combo.type);
                expect(cage.capacity).toBe(combo.capacity);
            }
        });

        test('should reject invalid type-capacity combinations', async () => {
            // Arrange
            const invalidCombinations = [
                { type: 'reproducción', capacity: 2 },
                { type: 'reproducción', capacity: 3 },
                { type: 'reproducción', capacity: 6 }
            ];

            // Act & Assert
            for (const combo of invalidCombinations) {
                const cageData = {
                    number: 1,
                    type: combo.type,
                    capacity: combo.capacity
                };
                
                const cage = new Cage(cageData);
                await expect(cage.save()).rejects.toThrow('La capacidad no es válida para el tipo de jaula');
            }
        });

    });

    describe('Schema Properties', () => {
        
        test('should have all required schema properties', async () => {
            // Arrange & Act
            const cage = await createTestCage();

            // Assert
            expect(cage).toHaveProperty('number');
            expect(cage).toHaveProperty('type');
            expect(cage).toHaveProperty('capacity');
            expect(cage).toHaveProperty('_id');
        });

        test('should not have unexpected properties', async () => {
            // Arrange & Act
            const cage = await createTestCage();

            // Assert
            const cageObj = cage.toObject();
            const expectedProperties = ['_id', 'number', 'type', 'capacity', '__v'];
            const actualProperties = Object.keys(cageObj);
            
            expect(actualProperties.sort()).toEqual(expectedProperties.sort());
        });

    });

    describe('Data Persistence', () => {
        
        test('should persist data correctly', async () => {
            // Arrange
            const cageData = {
                number: 42,
                type: 'engorde',
                capacity: 5
            };

            // Act
            const cage = new Cage(cageData);
            const savedCage = await cage.save();
            const foundCage = await Cage.findById(savedCage._id);

            // Assert
            expect(foundCage).toBeTruthy();
            expect(foundCage.number).toBe(cageData.number);
            expect(foundCage.type).toBe(cageData.type);
            expect(foundCage.capacity).toBe(cageData.capacity);
        });

        test('should find cage by number', async () => {
            // Arrange
            const cageNumber = 123;
            await createTestCage({ number: cageNumber });

            // Act
            const foundCage = await Cage.findOne({ number: cageNumber });

            // Assert
            expect(foundCage).toBeTruthy();
            expect(foundCage.number).toBe(cageNumber);
        });

        test('should update cage information', async () => {
            // Arrange
            const cage = await createTestCage({ capacity: 2 });
            const newCapacity = 5;

            // Act
            cage.capacity = newCapacity;
            const updatedCage = await cage.save();

            // Assert
            expect(updatedCage.capacity).toBe(newCapacity);
        });

        test('should delete cage', async () => {
            // Arrange
            const cage = await createTestCage();
            const cageId = cage._id;

            // Act
            await Cage.findByIdAndDelete(cageId);
            const deletedCage = await Cage.findById(cageId);

            // Assert
            expect(deletedCage).toBeNull();
        });

    });

    describe('Query Operations', () => {
        
        test('should find cages by type', async () => {
            // Arrange
            await createTestCage({ number: 1, type: 'engorde', capacity: 4 });
            await createTestCage({ number: 2, type: 'engorde', capacity: 6 });
            await createTestCage({ number: 3, type: 'reproducción', capacity: 1 });

            // Act
            const engordeCages = await Cage.find({ type: 'engorde' });
            const reproduccionCages = await Cage.find({ type: 'reproducción' });

            // Assert
            expect(engordeCages).toHaveLength(2);
            expect(reproduccionCages).toHaveLength(1);
            expect(engordeCages.every(cage => cage.type === 'engorde')).toBe(true);
            expect(reproduccionCages[0].type).toBe('reproducción');
        });

        test('should find cages by capacity range', async () => {
            // Arrange
            await createTestCage({ number: 1, type: 'reproducción', capacity: 1 });
            await createTestCage({ number: 2, type: 'engorde', capacity: 3 });
            await createTestCage({ number: 3, type: 'engorde', capacity: 6 });

            // Act
            const largeCages = await Cage.find({ capacity: { $gte: 3 } });

            // Assert
            expect(largeCages).toHaveLength(2);
            expect(largeCages.every(cage => cage.capacity >= 3)).toBe(true);
        });

        test('should sort cages by number', async () => {
            // Arrange
            await createTestCage({ number: 10 });
            await createTestCage({ number: 5 });
            await createTestCage({ number: 1 });

            // Act
            const sortedCages = await Cage.find().sort({ number: 1 });

            // Assert
            expect(sortedCages).toHaveLength(3);
            expect(sortedCages[0].number).toBe(1);
            expect(sortedCages[1].number).toBe(5);
            expect(sortedCages[2].number).toBe(10);
        });

    });

});
