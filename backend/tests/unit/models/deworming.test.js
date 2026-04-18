/**
 * Unit tests for Deworming model
 * Testing all validations and business logic
 * Following the Arrange, Act, Assert pattern
 */

const Deworming = require('../../../src/models/deworming');
const { createTestDeworming } = require('../../helpers/testHelpers');

describe('Deworming Model', () => {
    
    describe('Deworming Creation and Validation', () => {
        
        test('should create a valid deworming record with all fields', async () => {
            // Arrange
            const dewormingData = {
                codigo: 'T001',
                desparasitacion: true,
                fecha: new Date(),
                lastDewormingDate: new Date()
            };

            // Act
            const deworming = new Deworming(dewormingData);
            const savedDeworming = await deworming.save();

            // Assert
            expect(savedDeworming._id).toBeDefined();
            expect(savedDeworming.codigo).toBe('T001');
            expect(savedDeworming.desparasitacion).toBe(true);
            expect(savedDeworming.fecha).toBeDefined();
            expect(savedDeworming.lastDewormingDate).toBeDefined();
        });

        test('should create deworming record with default values', async () => {
            // Arrange
            const dewormingData = {
                codigo: 'T001'
            };

            // Act
            const deworming = new Deworming(dewormingData);
            const savedDeworming = await deworming.save();

            // Assert
            expect(savedDeworming.desparasitacion).toBe(false);
            expect(savedDeworming.fecha).toBeDefined();
            expect(savedDeworming.lastDewormingDate).toBeNull();
        });

        test('should fail validation when codigo is missing', async () => {
            // Arrange
            const dewormingData = {
                desparasitacion: true
            };

            // Act & Assert
            const deworming = new Deworming(dewormingData);
            await expect(deworming.save()).rejects.toThrow();
        });

    });

    describe('Boolean Field Validation', () => {
        
        test('should accept valid boolean values for desparasitacion', async () => {
            // Arrange
            const validValues = [true, false];

            // Act & Assert
            for (let i = 0; i < validValues.length; i++) {
                const value = validValues[i];
                const deworming = await createTestDeworming({
                    codigo: `T00${i + 1}`,
                    desparasitacion: value
                });
                expect(deworming.desparasitacion).toBe(value);
            }
        });

        test('should convert truthy values to true', async () => {
            // Arrange
            const dewormingData = {
                codigo: 'T001',
                desparasitacion: 'true'
            };

            // Act
            const deworming = new Deworming(dewormingData);
            const savedDeworming = await deworming.save();

            // Assert
            expect(savedDeworming.desparasitacion).toBe(true);
        });

        test('should convert falsy values to false', async () => {
            // Arrange
            const dewormingData = {
                codigo: 'T001',
                desparasitacion: false
            };

            // Act
            const deworming = new Deworming(dewormingData);
            const savedDeworming = await deworming.save();

            // Assert
            expect(savedDeworming.desparasitacion).toBe(false);
        });

    });

    describe('Date Handling', () => {
        
        test('should set default fecha when not provided', async () => {
            // Arrange
            const before = new Date();

            // Act
            const deworming = await createTestDeworming();

            // Assert
            const after = new Date();
            expect(deworming.fecha).toBeDefined();
            expect(deworming.fecha.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
            expect(deworming.fecha.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
        });

        test('should accept custom fecha', async () => {
            // Arrange
            const customDate = new Date('2024-01-15T10:30:00Z');
            const dewormingData = {
                codigo: 'T001',
                desparasitacion: true,
                fecha: customDate
            };

            // Act
            const deworming = new Deworming(dewormingData);
            const savedDeworming = await deworming.save();

            // Assert
            expect(savedDeworming.fecha.getTime()).toBe(customDate.getTime());
        });

        test('should handle lastDewormingDate correctly', async () => {
            // Arrange
            const lastDate = new Date('2024-01-01T00:00:00Z');

            // Act
            const deworming = await createTestDeworming({
                desparasitacion: true,
                lastDewormingDate: lastDate
            });

            // Assert
            expect(deworming.lastDewormingDate.getTime()).toBe(lastDate.getTime());
        });

        test('should default lastDewormingDate to null', async () => {
            // Arrange & Act
            const deworming = await createTestDeworming();

            // Assert
            expect(deworming.lastDewormingDate).toBeNull();
        });

    });

    describe('Schema Properties', () => {
        
        test('should have all required schema properties', async () => {
            // Arrange & Act
            const deworming = await createTestDeworming();

            // Assert
            expect(deworming).toHaveProperty('codigo');
            expect(deworming).toHaveProperty('desparasitacion');
            expect(deworming).toHaveProperty('fecha');
            expect(deworming).toHaveProperty('lastDewormingDate');
            expect(deworming).toHaveProperty('_id');
        });

        test('should not have unexpected properties', async () => {
            // Arrange & Act
            const deworming = await createTestDeworming();

            // Assert
            const dewormingObj = deworming.toObject();
            const expectedProperties = [
                '_id', 'codigo', 'desparasitacion', 'fecha', 
                'lastDewormingDate', '__v'
            ];
            const actualProperties = Object.keys(dewormingObj);
            
            expect(actualProperties.sort()).toEqual(expectedProperties.sort());
        });

    });

    describe('Data Persistence', () => {
        
        test('should persist data correctly', async () => {
            // Arrange
            const dewormingData = {
                codigo: 'R042',
                desparasitacion: true,
                lastDewormingDate: new Date('2024-01-01')
            };

            // Act
            const deworming = new Deworming(dewormingData);
            const savedDeworming = await deworming.save();
            const foundDeworming = await Deworming.findById(savedDeworming._id);

            // Assert
            expect(foundDeworming).toBeTruthy();
            expect(foundDeworming.codigo).toBe(dewormingData.codigo);
            expect(foundDeworming.desparasitacion).toBe(dewormingData.desparasitacion);
            expect(foundDeworming.lastDewormingDate.getTime()).toBe(dewormingData.lastDewormingDate.getTime());
        });

        test('should find dewormings by codigo', async () => {
            // Arrange
            const codigo = 'T123';
            await createTestDeworming({ codigo });
            await createTestDeworming({ codigo: 'T456' });

            // Act
            const foundDewormings = await Deworming.find({ codigo });

            // Assert
            expect(foundDewormings).toHaveLength(1);
            expect(foundDewormings[0].codigo).toBe(codigo);
        });

        test('should update deworming information', async () => {
            // Arrange
            const deworming = await createTestDeworming({ desparasitacion: false });

            // Act
            deworming.desparasitacion = true;
            deworming.lastDewormingDate = new Date();
            const updatedDeworming = await deworming.save();

            // Assert
            expect(updatedDeworming.desparasitacion).toBe(true);
            expect(updatedDeworming.lastDewormingDate).toBeDefined();
        });

        test('should delete deworming record', async () => {
            // Arrange
            const deworming = await createTestDeworming();
            const dewormingId = deworming._id;

            // Act
            await Deworming.findByIdAndDelete(dewormingId);
            const deletedDeworming = await Deworming.findById(dewormingId);

            // Assert
            expect(deletedDeworming).toBeNull();
        });

    });

    describe('Query Operations', () => {
        
        test('should find dewormings by date range', async () => {
            // Arrange
            const today = new Date();
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
            const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

            await createTestDeworming({ codigo: 'T001', fecha: yesterday });
            await createTestDeworming({ codigo: 'T002', fecha: today });
            await createTestDeworming({ codigo: 'T003', fecha: tomorrow });

            // Act
            const todayDewormings = await Deworming.find({
                fecha: {
                    $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                    $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
                }
            });

            // Assert
            expect(todayDewormings).toHaveLength(1);
            expect(todayDewormings[0].codigo).toBe('T002');
        });

        test('should find dewormings with treatment applied', async () => {
            // Arrange
            await createTestDeworming({ codigo: 'T001', desparasitacion: true });
            await createTestDeworming({ codigo: 'T002', desparasitacion: false });
            await createTestDeworming({ codigo: 'T003', desparasitacion: true });

            // Act
            const appliedDewormings = await Deworming.find({ desparasitacion: true });

            // Assert
            expect(appliedDewormings).toHaveLength(2);
            expect(appliedDewormings.map(d => d.codigo)).toContain('T001');
            expect(appliedDewormings.map(d => d.codigo)).toContain('T003');
        });

        test('should sort dewormings by date', async () => {
            // Arrange
            const date1 = new Date('2024-01-01');
            const date2 = new Date('2024-01-02');
            const date3 = new Date('2024-01-03');

            await createTestDeworming({ codigo: 'T002', fecha: date2 });
            await createTestDeworming({ codigo: 'T001', fecha: date1 });
            await createTestDeworming({ codigo: 'T003', fecha: date3 });

            // Act
            const sortedDewormings = await Deworming.find().sort({ fecha: 1 });

            // Assert
            expect(sortedDewormings).toHaveLength(3);
            expect(sortedDewormings[0].codigo).toBe('T001');
            expect(sortedDewormings[1].codigo).toBe('T002');
            expect(sortedDewormings[2].codigo).toBe('T003');
        });

        test('should count dewormings by codigo', async () => {
            // Arrange
            const codigo = 'T001';
            await createTestDeworming({ codigo });
            await createTestDeworming({ codigo });
            await createTestDeworming({ codigo: 'T002' });

            // Act
            const count = await Deworming.countDocuments({ codigo });

            // Assert
            expect(count).toBe(2);
        });

    });

    describe('Business Logic Scenarios', () => {
        
        test('should track deworming history for a rabbit', async () => {
            // Arrange
            const codigo = 'T001';
            const firstDate = new Date('2024-01-01');
            const secondDate = new Date('2024-02-01');
            
            const firstDeworming = await createTestDeworming({
                codigo,
                desparasitacion: true,
                fecha: firstDate,
                lastDewormingDate: firstDate
            });
            
            const secondDeworming = await createTestDeworming({
                codigo,
                desparasitacion: true,
                fecha: secondDate,
                lastDewormingDate: secondDate
            });

            // Act
            const dewormingHistory = await Deworming.find({ codigo }).sort({ fecha: 1 });

            // Assert
            expect(dewormingHistory).toHaveLength(2);
            expect(dewormingHistory[0].fecha.getTime()).toBe(firstDate.getTime());
            expect(dewormingHistory[1].fecha.getTime()).toBe(secondDate.getTime());
        });

        test('should find rabbits needing deworming follow-up', async () => {
            // Arrange
            const oldDate = new Date('2023-01-01');
            const recentDate = new Date();
            
            await createTestDeworming({
                codigo: 'T001',
                desparasitacion: true,
                lastDewormingDate: oldDate
            });
            
            await createTestDeworming({
                codigo: 'T002',
                desparasitacion: true,
                lastDewormingDate: recentDate
            });

            // Act
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            
            const needingFollowUp = await Deworming.find({
                desparasitacion: true,
                lastDewormingDate: { $lt: threeMonthsAgo }
            });

            // Assert
            expect(needingFollowUp).toHaveLength(1);
            expect(needingFollowUp[0].codigo).toBe('T001');
        });

        test('should handle multiple treatments on same day', async () => {
            // Arrange
            const codigo = 'T001';
            const sameDate = new Date();
            
            const deworming1 = await createTestDeworming({
                codigo,
                desparasitacion: true,
                fecha: sameDate
            });

            // Act
            const dailyTreatments = await Deworming.find({
                codigo,
                fecha: {
                    $gte: new Date(sameDate.getFullYear(), sameDate.getMonth(), sameDate.getDate()),
                    $lt: new Date(sameDate.getFullYear(), sameDate.getMonth(), sameDate.getDate() + 1)
                }
            });

            // Assert
            expect(dailyTreatments).toHaveLength(1);
            expect(dailyTreatments[0].desparasitacion).toBe(true);
        });

        test('should find rabbits by treatment status', async () => {
            // Arrange
            await createTestDeworming({ codigo: 'T001', desparasitacion: true });
            await createTestDeworming({ codigo: 'T002', desparasitacion: false });
            await createTestDeworming({ codigo: 'T003', desparasitacion: true });
            await createTestDeworming({ codigo: 'T004', desparasitacion: false });

            // Act
            const treatedRabbits = await Deworming.find({ desparasitacion: true });
            const untreatedRabbits = await Deworming.find({ desparasitacion: false });

            // Assert
            expect(treatedRabbits).toHaveLength(2);
            expect(untreatedRabbits).toHaveLength(2);
            expect(treatedRabbits.map(d => d.codigo)).toEqual(expect.arrayContaining(['T001', 'T003']));
            expect(untreatedRabbits.map(d => d.codigo)).toEqual(expect.arrayContaining(['T002', 'T004']));
        });

    });

});
