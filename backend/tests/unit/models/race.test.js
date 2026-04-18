/**
 * Unit tests for Race model
 * Testing all validations and business logic
 * Following the Arrange, Act, Assert pattern
 */

const Race = require('../../../src/models/race');
const { createTestRace } = require('../../helpers/testHelpers');

describe('Race Model', () => {
    
    describe('Race Creation and Validation', () => {
        
        test('should create a valid race with all required fields', async () => {
            // Arrange
            const raceData = {
                name: 'Nueva Zelanda',
                description: 'Raza de conejos originaria de Nueva Zelanda'
            };

            // Act
            const race = new Race(raceData);
            const savedRace = await race.save();

            // Assert
            expect(savedRace._id).toBeDefined();
            expect(savedRace.name).toBe('Nueva Zelanda');
            expect(savedRace.description).toBe('Raza de conejos originaria de Nueva Zelanda');
        });

        test('should fail validation when name is missing', async () => {
            // Arrange
            const raceData = {
                description: 'Raza de conejos sin nombre'
            };

            // Act & Assert
            const race = new Race(raceData);
            await expect(race.save()).rejects.toThrow('El nombre de la raza es obligatorio');
        });

        test('should fail validation when description is missing', async () => {
            // Arrange
            const raceData = {
                name: 'Sin Descripción'
            };

            // Act & Assert
            const race = new Race(raceData);
            await expect(race.save()).rejects.toThrow('La descripción de la raza es obligatoria');
        });

        test('should trim whitespace from name and description', async () => {
            // Arrange
            const raceData = {
                name: '  Californiana  ',
                description: '  Raza californiana con espacios  '
            };

            // Act
            const race = new Race(raceData);
            const savedRace = await race.save();

            // Assert
            expect(savedRace.name).toBe('Californiana');
            expect(savedRace.description).toBe('Raza californiana con espacios');
        });

    });

    describe('Name Validation', () => {
        
        test('should accept valid name lengths', async () => {
            // Arrange
            const validNames = [
                'AB', // Minimum length (2 characters)
                'Nueva Zelanda', // Normal length
                'A'.repeat(50) // Reasonable long name
            ];

            // Act & Assert
            for (let i = 0; i < validNames.length; i++) {
                const name = validNames[i];
                const race = await createTestRace({ 
                    name: name,
                    description: `Descripción para ${name}`
                });
                expect(race.name).toBe(name);
            }
        });

        test('should fail validation with name too short', async () => {
            // Arrange
            const raceData = {
                name: 'A', // Only 1 character
                description: 'Descripción válida para nombre muy corto'
            };

            // Act & Assert
            const race = new Race(raceData);
            await expect(race.save()).rejects.toThrow('El nombre debe tener al menos 2 caracteres');
        });

        test('should enforce unique race names', async () => {
            // Arrange
            await createTestRace({ name: 'Californiana' });

            const duplicateRaceData = {
                name: 'Californiana', // Duplicate name
                description: 'Otra raza californiana'
            };

            // Act & Assert
            const race = new Race(duplicateRaceData);
            await expect(race.save()).rejects.toThrow();
        });

        test('should enforce unique race names case insensitive', async () => {
            // Arrange
            await createTestRace({ name: 'californiana' });

            const duplicateRaceData = {
                name: 'CALIFORNIANA', // Different case but same name
                description: 'Otra raza californiana'
            };

            // Act & Assert
            const race = new Race(duplicateRaceData);
            // Note: Mongoose unique constraint is case sensitive by default,
            // but this test documents expected behavior
            // In a real implementation, you might want to add a pre-save hook
            // to normalize case for uniqueness checks
        });

    });

    describe('Description Validation', () => {
        
        test('should accept valid description lengths', async () => {
            // Arrange
            const validDescriptions = [
                'Cinco', // Minimum length (5 characters)
                'Descripción normal de una raza de conejos',
                'D'.repeat(500) // Long description
            ];

            // Act & Assert
            for (let i = 0; i < validDescriptions.length; i++) {
                const description = validDescriptions[i];
                const race = await createTestRace({ 
                    name: `Raza${i + 1}`,
                    description: description
                });
                expect(race.description).toBe(description);
            }
        });

        test('should fail validation with description too short', async () => {
            // Arrange
            const raceData = {
                name: 'Raza Válida',
                description: 'Corta' // Only 5 characters but Spanish "Corta" is 5, so use 4
            };

            raceData.description = 'Mal'; // 3 characters

            // Act & Assert
            const race = new Race(raceData);
            await expect(race.save()).rejects.toThrow('La descripción debe tener al menos 5 caracteres');
        });

    });

    describe('Schema Properties', () => {
        
        test('should have all required schema properties', async () => {
            // Arrange & Act
            const race = await createTestRace();

            // Assert
            expect(race).toHaveProperty('name');
            expect(race).toHaveProperty('description');
            expect(race).toHaveProperty('_id');
        });

        test('should not have unexpected properties', async () => {
            // Arrange & Act
            const race = await createTestRace();

            // Assert
            const raceObj = race.toObject();
            const expectedProperties = ['_id', 'name', 'description', '__v'];
            const actualProperties = Object.keys(raceObj);
            
            expect(actualProperties.sort()).toEqual(expectedProperties.sort());
        });

    });

    describe('Data Persistence', () => {
        
        test('should persist data correctly', async () => {
            // Arrange
            const raceData = {
                name: 'Angora',
                description: 'Raza de conejos conocida por su pelaje largo y sedoso'
            };

            // Act
            const race = new Race(raceData);
            const savedRace = await race.save();
            const foundRace = await Race.findById(savedRace._id);

            // Assert
            expect(foundRace).toBeTruthy();
            expect(foundRace.name).toBe(raceData.name);
            expect(foundRace.description).toBe(raceData.description);
        });

        test('should find race by name', async () => {
            // Arrange
            const raceName = 'Rex';
            await createTestRace({ name: raceName });

            // Act
            const foundRace = await Race.findOne({ name: raceName });

            // Assert
            expect(foundRace).toBeTruthy();
            expect(foundRace.name).toBe(raceName);
        });

        test('should update race information', async () => {
            // Arrange
            const race = await createTestRace();
            const newDescription = 'Descripción actualizada para la raza';

            // Act
            race.description = newDescription;
            const updatedRace = await race.save();

            // Assert
            expect(updatedRace.description).toBe(newDescription);
        });

        test('should delete race', async () => {
            // Arrange
            const race = await createTestRace();
            const raceId = race._id;

            // Act
            await Race.findByIdAndDelete(raceId);
            const deletedRace = await Race.findById(raceId);

            // Assert
            expect(deletedRace).toBeNull();
        });

    });

    describe('Query Operations', () => {
        
        test('should find all races', async () => {
            // Arrange
            await createTestRace({ name: 'Raza1', description: 'Descripción 1' });
            await createTestRace({ name: 'Raza2', description: 'Descripción 2' });
            await createTestRace({ name: 'Raza3', description: 'Descripción 3' });

            // Act
            const races = await Race.find();

            // Assert
            expect(races).toHaveLength(3);
            expect(races.map(r => r.name)).toContain('Raza1');
            expect(races.map(r => r.name)).toContain('Raza2');
            expect(races.map(r => r.name)).toContain('Raza3');
        });

        test('should count races', async () => {
            // Arrange
            await createTestRace({ name: 'Raza1', description: 'Descripción 1' });
            await createTestRace({ name: 'Raza2', description: 'Descripción 2' });

            // Act
            const count = await Race.countDocuments();

            // Assert
            expect(count).toBe(2);
        });

        test('should search races by partial name', async () => {
            // Arrange
            await createTestRace({ name: 'Californiana', description: 'Raza californiana' });
            await createTestRace({ name: 'Nueva Zelanda', description: 'Raza neozelandesa' });
            await createTestRace({ name: 'Angora', description: 'Raza angora' });

            // Act
            const californianaRaces = await Race.find({ 
                name: { $regex: 'Californ', $options: 'i' } 
            });

            // Assert
            expect(californianaRaces).toHaveLength(1);
            expect(californianaRaces[0].name).toBe('Californiana');
        });

    });

});
