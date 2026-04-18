/**
 * Unit tests for Vaccination model
 * Testing all validations and business logic
 * Following the Arrange, Act, Assert pattern
 */

const Vaccination = require('../../../src/models/vaccination');
const { createTestVaccination } = require('../../helpers/testHelpers');

describe('Vaccination Model', () => {
    
    describe('Vaccination Creation and Validation', () => {
        
        test('should create a valid vaccination record with all fields', async () => {
            // Arrange
            const vaccinationData = {
                codigo: 'T001',
                mixomatosis: true,
                vhd: false,
                fecha: new Date(),
                lastMixomatosisDate: new Date(),
                lastVhdDate: null
            };

            // Act
            const vaccination = new Vaccination(vaccinationData);
            const savedVaccination = await vaccination.save();

            // Assert
            expect(savedVaccination._id).toBeDefined();
            expect(savedVaccination.codigo).toBe('T001');
            expect(savedVaccination.mixomatosis).toBe(true);
            expect(savedVaccination.vhd).toBe(false);
            expect(savedVaccination.fecha).toBeDefined();
            expect(savedVaccination.lastMixomatosisDate).toBeDefined();
            expect(savedVaccination.lastVhdDate).toBeNull();
        });

        test('should create vaccination record with default values', async () => {
            // Arrange
            const vaccinationData = {
                codigo: 'T001'
            };

            // Act
            const vaccination = new Vaccination(vaccinationData);
            const savedVaccination = await vaccination.save();

            // Assert
            expect(savedVaccination.mixomatosis).toBe(false);
            expect(savedVaccination.vhd).toBe(false);
            expect(savedVaccination.fecha).toBeDefined();
            expect(savedVaccination.lastMixomatosisDate).toBeNull();
            expect(savedVaccination.lastVhdDate).toBeNull();
        });

        test('should fail validation when codigo is missing', async () => {
            // Arrange
            const vaccinationData = {
                mixomatosis: true,
                vhd: true
            };

            // Act & Assert
            const vaccination = new Vaccination(vaccinationData);
            await expect(vaccination.save()).rejects.toThrow();
        });

    });

    describe('Boolean Field Validation', () => {
        
        test('should accept valid boolean values for mixomatosis', async () => {
            // Arrange
            const validValues = [true, false];

            // Act & Assert
            for (let i = 0; i < validValues.length; i++) {
                const value = validValues[i];
                const vaccination = await createTestVaccination({
                    codigo: `T00${i + 1}`,
                    mixomatosis: value
                });
                expect(vaccination.mixomatosis).toBe(value);
            }
        });

        test('should accept valid boolean values for vhd', async () => {
            // Arrange
            const validValues = [true, false];

            // Act & Assert
            for (let i = 0; i < validValues.length; i++) {
                const value = validValues[i];
                const vaccination = await createTestVaccination({
                    codigo: `T00${i + 1}`,
                    vhd: value
                });
                expect(vaccination.vhd).toBe(value);
            }
        });

        test('should convert truthy values to true', async () => {
            // Arrange
            const vaccinationData = {
                codigo: 'T001',
                mixomatosis: 'true',
                vhd: 1
            };

            // Act
            const vaccination = new Vaccination(vaccinationData);
            const savedVaccination = await vaccination.save();

            // Assert
            expect(savedVaccination.mixomatosis).toBe(true);
            expect(savedVaccination.vhd).toBe(true);
        });

        test('should convert falsy values to false', async () => {
            // Arrange
            const vaccinationData = {
                codigo: 'T001',
                mixomatosis: false,
                vhd: 0
            };

            // Act
            const vaccination = new Vaccination(vaccinationData);
            const savedVaccination = await vaccination.save();

            // Assert
            expect(savedVaccination.mixomatosis).toBe(false);
            expect(savedVaccination.vhd).toBe(false);
        });

    });

    describe('Date Handling', () => {
        
        test('should set default fecha when not provided', async () => {
            // Arrange
            const before = new Date();

            // Act
            const vaccination = await createTestVaccination();

            // Assert
            const after = new Date();
            expect(vaccination.fecha).toBeDefined();
            expect(vaccination.fecha.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
            expect(vaccination.fecha.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
        });

        test('should accept custom fecha', async () => {
            // Arrange
            const customDate = new Date('2024-01-15T10:30:00Z');
            const vaccinationData = {
                codigo: 'T001',
                mixomatosis: true,
                fecha: customDate
            };

            // Act
            const vaccination = new Vaccination(vaccinationData);
            const savedVaccination = await vaccination.save();

            // Assert
            expect(savedVaccination.fecha.getTime()).toBe(customDate.getTime());
        });

        test('should handle lastMixomatosisDate correctly', async () => {
            // Arrange
            const lastDate = new Date('2024-01-01T00:00:00Z');

            // Act
            const vaccination = await createTestVaccination({
                mixomatosis: true,
                lastMixomatosisDate: lastDate
            });

            // Assert
            expect(vaccination.lastMixomatosisDate.getTime()).toBe(lastDate.getTime());
        });

        test('should handle lastVhdDate correctly', async () => {
            // Arrange
            const lastDate = new Date('2024-01-01T00:00:00Z');

            // Act
            const vaccination = await createTestVaccination({
                vhd: true,
                lastVhdDate: lastDate
            });

            // Assert
            expect(vaccination.lastVhdDate.getTime()).toBe(lastDate.getTime());
        });

        test('should default last dates to null', async () => {
            // Arrange & Act
            const vaccination = await createTestVaccination();

            // Assert
            expect(vaccination.lastMixomatosisDate).toBeNull();
            expect(vaccination.lastVhdDate).toBeNull();
        });

    });

    describe('Schema Properties', () => {
        
        test('should have all required schema properties', async () => {
            // Arrange & Act
            const vaccination = await createTestVaccination();

            // Assert
            expect(vaccination).toHaveProperty('codigo');
            expect(vaccination).toHaveProperty('mixomatosis');
            expect(vaccination).toHaveProperty('vhd');
            expect(vaccination).toHaveProperty('fecha');
            expect(vaccination).toHaveProperty('lastMixomatosisDate');
            expect(vaccination).toHaveProperty('lastVhdDate');
            expect(vaccination).toHaveProperty('_id');
        });

        test('should not have unexpected properties', async () => {
            // Arrange & Act
            const vaccination = await createTestVaccination();

            // Assert
            const vaccinationObj = vaccination.toObject();
            const expectedProperties = [
                '_id', 'codigo', 'mixomatosis', 'vhd', 'fecha', 
                'lastMixomatosisDate', 'lastVhdDate', '__v'
            ];
            const actualProperties = Object.keys(vaccinationObj);
            
            expect(actualProperties.sort()).toEqual(expectedProperties.sort());
        });

    });

    describe('Data Persistence', () => {
        
        test('should persist data correctly', async () => {
            // Arrange
            const vaccinationData = {
                codigo: 'R042',
                mixomatosis: true,
                vhd: true,
                lastMixomatosisDate: new Date('2024-01-01'),
                lastVhdDate: new Date('2024-01-02')
            };

            // Act
            const vaccination = new Vaccination(vaccinationData);
            const savedVaccination = await vaccination.save();
            const foundVaccination = await Vaccination.findById(savedVaccination._id);

            // Assert
            expect(foundVaccination).toBeTruthy();
            expect(foundVaccination.codigo).toBe(vaccinationData.codigo);
            expect(foundVaccination.mixomatosis).toBe(vaccinationData.mixomatosis);
            expect(foundVaccination.vhd).toBe(vaccinationData.vhd);
            expect(foundVaccination.lastMixomatosisDate.getTime()).toBe(vaccinationData.lastMixomatosisDate.getTime());
            expect(foundVaccination.lastVhdDate.getTime()).toBe(vaccinationData.lastVhdDate.getTime());
        });

        test('should find vaccinations by codigo', async () => {
            // Arrange
            const codigo = 'T123';
            await createTestVaccination({ codigo });
            await createTestVaccination({ codigo: 'T456' });

            // Act
            const foundVaccinations = await Vaccination.find({ codigo });

            // Assert
            expect(foundVaccinations).toHaveLength(1);
            expect(foundVaccinations[0].codigo).toBe(codigo);
        });

        test('should update vaccination information', async () => {
            // Arrange
            const vaccination = await createTestVaccination({ mixomatosis: false });

            // Act
            vaccination.mixomatosis = true;
            vaccination.lastMixomatosisDate = new Date();
            const updatedVaccination = await vaccination.save();

            // Assert
            expect(updatedVaccination.mixomatosis).toBe(true);
            expect(updatedVaccination.lastMixomatosisDate).toBeDefined();
        });

        test('should delete vaccination record', async () => {
            // Arrange
            const vaccination = await createTestVaccination();
            const vaccinationId = vaccination._id;

            // Act
            await Vaccination.findByIdAndDelete(vaccinationId);
            const deletedVaccination = await Vaccination.findById(vaccinationId);

            // Assert
            expect(deletedVaccination).toBeNull();
        });

    });

    describe('Query Operations', () => {
        
        test('should find vaccinations by date range', async () => {
            // Arrange
            const today = new Date();
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
            const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

            await createTestVaccination({ codigo: 'T001', fecha: yesterday });
            await createTestVaccination({ codigo: 'T002', fecha: today });
            await createTestVaccination({ codigo: 'T003', fecha: tomorrow });

            // Act
            const todayVaccinations = await Vaccination.find({
                fecha: {
                    $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                    $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
                }
            });

            // Assert
            expect(todayVaccinations).toHaveLength(1);
            expect(todayVaccinations[0].codigo).toBe('T002');
        });

        test('should find vaccinations with mixomatosis applied', async () => {
            // Arrange
            await createTestVaccination({ codigo: 'T001', mixomatosis: true });
            await createTestVaccination({ codigo: 'T002', mixomatosis: false });
            await createTestVaccination({ codigo: 'T003', mixomatosis: true });

            // Act
            const mixomatosisVaccinations = await Vaccination.find({ mixomatosis: true });

            // Assert
            expect(mixomatosisVaccinations).toHaveLength(2);
            expect(mixomatosisVaccinations.map(v => v.codigo)).toContain('T001');
            expect(mixomatosisVaccinations.map(v => v.codigo)).toContain('T003');
        });

        test('should find vaccinations with vhd applied', async () => {
            // Arrange
            await createTestVaccination({ codigo: 'T001', vhd: true });
            await createTestVaccination({ codigo: 'T002', vhd: false });
            await createTestVaccination({ codigo: 'T003', vhd: true });

            // Act
            const vhdVaccinations = await Vaccination.find({ vhd: true });

            // Assert
            expect(vhdVaccinations).toHaveLength(2);
            expect(vhdVaccinations.map(v => v.codigo)).toContain('T001');
            expect(vhdVaccinations.map(v => v.codigo)).toContain('T003');
        });

        test('should find vaccinations with any vaccine applied', async () => {
            // Arrange
            await createTestVaccination({ codigo: 'T001', mixomatosis: true, vhd: false });
            await createTestVaccination({ codigo: 'T002', mixomatosis: false, vhd: true });
            await createTestVaccination({ codigo: 'T003', mixomatosis: false, vhd: false });

            // Act
            const anyVaccinations = await Vaccination.find({
                $or: [{ mixomatosis: true }, { vhd: true }]
            });

            // Assert
            expect(anyVaccinations).toHaveLength(2);
            expect(anyVaccinations.map(v => v.codigo)).toContain('T001');
            expect(anyVaccinations.map(v => v.codigo)).toContain('T002');
        });

        test('should sort vaccinations by date', async () => {
            // Arrange
            const date1 = new Date('2024-01-01');
            const date2 = new Date('2024-01-02');
            const date3 = new Date('2024-01-03');

            await createTestVaccination({ codigo: 'T002', fecha: date2 });
            await createTestVaccination({ codigo: 'T001', fecha: date1 });
            await createTestVaccination({ codigo: 'T003', fecha: date3 });

            // Act
            const sortedVaccinations = await Vaccination.find().sort({ fecha: 1 });

            // Assert
            expect(sortedVaccinations).toHaveLength(3);
            expect(sortedVaccinations[0].codigo).toBe('T001');
            expect(sortedVaccinations[1].codigo).toBe('T002');
            expect(sortedVaccinations[2].codigo).toBe('T003');
        });

    });

    describe('Business Logic Scenarios', () => {
        
        test('should track vaccination history for a rabbit', async () => {
            // Arrange
            const codigo = 'T001';
            const firstDate = new Date('2024-01-01');
            const secondDate = new Date('2024-02-01');
            
            const firstVaccination = await createTestVaccination({
                codigo,
                mixomatosis: true,
                vhd: false,
                fecha: firstDate,
                lastMixomatosisDate: firstDate
            });
            
            const secondVaccination = await createTestVaccination({
                codigo,
                mixomatosis: false,
                vhd: true,
                fecha: secondDate,
                lastVhdDate: secondDate
            });

            // Act
            const vaccinationHistory = await Vaccination.find({ codigo }).sort({ fecha: 1 });

            // Assert
            expect(vaccinationHistory).toHaveLength(2);
            expect(vaccinationHistory[0].mixomatosis).toBe(true);
            expect(vaccinationHistory[0].vhd).toBe(false);
            expect(vaccinationHistory[1].mixomatosis).toBe(false);
            expect(vaccinationHistory[1].vhd).toBe(true);
        });

        test('should handle multiple vaccinations on same day', async () => {
            // Arrange
            const codigo = 'T001';
            const sameDate = new Date();
            
            const vaccination1 = await createTestVaccination({
                codigo,
                mixomatosis: true,
                vhd: false,
                fecha: sameDate
            });
            
            const vaccination2 = await createTestVaccination({
                codigo,
                mixomatosis: false,
                vhd: true,
                fecha: sameDate
            });

            // Act
            const dailyVaccinations = await Vaccination.find({
                codigo,
                fecha: {
                    $gte: new Date(sameDate.getFullYear(), sameDate.getMonth(), sameDate.getDate()),
                    $lt: new Date(sameDate.getFullYear(), sameDate.getMonth(), sameDate.getDate() + 1)
                }
            });

            // Assert
            expect(dailyVaccinations).toHaveLength(2);
        });

        test('should find rabbits needing vaccination follow-up', async () => {
            // Arrange
            const oldDate = new Date('2023-01-01');
            const recentDate = new Date();
            
            await createTestVaccination({
                codigo: 'T001',
                mixomatosis: true,
                lastMixomatosisDate: oldDate
            });
            
            await createTestVaccination({
                codigo: 'T002',
                mixomatosis: true,
                lastMixomatosisDate: recentDate
            });

            // Act
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            
            const needingFollowUp = await Vaccination.find({
                mixomatosis: true,
                lastMixomatosisDate: { $lt: sixMonthsAgo }
            });

            // Assert
            expect(needingFollowUp).toHaveLength(1);
            expect(needingFollowUp[0].codigo).toBe('T001');
        });

    });

});
