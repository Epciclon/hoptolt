/**
 * Unit tests for Feeding model
 * Testing all validations and business logic
 * Following the Arrange, Act, Assert pattern
 */

const Feeding = require('../../../src/models/feeding');
const { createTestFeeding } = require('../../helpers/testHelpers');

describe('Feeding Model', () => {
    
    describe('Feeding Creation and Validation', () => {
        
        test('should create a valid feeding record with all required fields', async () => {
            // Arrange
            const feedingData = {
                codigo: 'T001',
                heno: 100,
                hierba: 80,
                balanceado: 120,
                fecha: new Date(),
                justificacion: 'Alimentación normal'
            };

            // Act
            const feeding = new Feeding(feedingData);
            const savedFeeding = await feeding.save();

            // Assert
            expect(savedFeeding._id).toBeDefined();
            expect(savedFeeding.codigo).toBe('T001');
            expect(savedFeeding.heno).toBe(100);
            expect(savedFeeding.hierba).toBe(80);
            expect(savedFeeding.balanceado).toBe(120);
            expect(savedFeeding.fecha).toBeDefined();
            expect(savedFeeding.justificacion).toBe('Alimentación normal');
        });

        test('should create feeding record with default values', async () => {
            // Arrange
            const feedingData = {
                codigo: 'T001',
                heno: 100,
                hierba: 80,
                balanceado: 120
            };

            // Act
            const feeding = new Feeding(feedingData);
            const savedFeeding = await feeding.save();

            // Assert
            expect(savedFeeding.fecha).toBeDefined();
            expect(savedFeeding.justificacion).toBeNull();
        });

        test('should fail validation when codigo is missing', async () => {
            // Arrange
            const feedingData = {
                heno: 100,
                hierba: 80,
                balanceado: 120
            };

            // Act & Assert
            const feeding = new Feeding(feedingData);
            await expect(feeding.save()).rejects.toThrow();
        });

        test('should fail validation when heno is missing', async () => {
            // Arrange
            const feedingData = {
                codigo: 'T001',
                hierba: 80,
                balanceado: 120
            };

            // Act & Assert
            const feeding = new Feeding(feedingData);
            await expect(feeding.save()).rejects.toThrow();
        });

        test('should fail validation when hierba is missing', async () => {
            // Arrange
            const feedingData = {
                codigo: 'T001',
                heno: 100,
                balanceado: 120
            };

            // Act & Assert
            const feeding = new Feeding(feedingData);
            await expect(feeding.save()).rejects.toThrow();
        });

        test('should fail validation when balanceado is missing', async () => {
            // Arrange
            const feedingData = {
                codigo: 'T001',
                heno: 100,
                hierba: 80
            };

            // Act & Assert
            const feeding = new Feeding(feedingData);
            await expect(feeding.save()).rejects.toThrow();
        });

    });

    describe('Numeric Field Validation', () => {
        
        test('should accept valid numeric values for food amounts', async () => {
            // Arrange
            const validAmounts = [0, 50, 100, 200.5];

            // Act & Assert
            for (let i = 0; i < validAmounts.length; i++) {
                const amount = validAmounts[i];
                const feeding = await createTestFeeding({
                    codigo: `T00${i + 1}`,
                    heno: amount,
                    hierba: amount,
                    balanceado: amount
                });
                expect(feeding.heno).toBe(amount);
                expect(feeding.hierba).toBe(amount);
                expect(feeding.balanceado).toBe(amount);
            }
        });

        test('should accept negative values (for corrections)', async () => {
            // Arrange
            const feedingData = {
                codigo: 'T001',
                heno: -10,
                hierba: -5,
                balanceado: -15
            };

            // Act
            const feeding = new Feeding(feedingData);
            const savedFeeding = await feeding.save();

            // Assert
            expect(savedFeeding.heno).toBe(-10);
            expect(savedFeeding.hierba).toBe(-5);
            expect(savedFeeding.balanceado).toBe(-15);
        });

    });

    describe('Date Handling', () => {
        
        test('should set default date when not provided', async () => {
            // Arrange
            const before = new Date();

            // Act
            const feeding = await createTestFeeding();

            // Assert
            const after = new Date();
            expect(feeding.fecha).toBeDefined();
            expect(feeding.fecha.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000); // Allow 1 second tolerance
            expect(feeding.fecha.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
        });

        test('should accept custom date', async () => {
            // Arrange
            const customDate = new Date('2024-01-15T10:30:00Z');
            const feedingData = {
                codigo: 'T001',
                heno: 100,
                hierba: 80,
                balanceado: 120,
                fecha: customDate
            };

            // Act
            const feeding = new Feeding(feedingData);
            const savedFeeding = await feeding.save();

            // Assert
            expect(savedFeeding.fecha.getTime()).toBe(customDate.getTime());
        });

    });

    describe('Justificacion Field', () => {
        
        test('should default justificacion to null', async () => {
            // Arrange & Act
            const feeding = await createTestFeeding({ justificacion: undefined });

            // Assert
            expect(feeding.justificacion).toBeNull();
        });

        test('should accept string justificacion', async () => {
            // Arrange
            const justificacion = 'Alimentación adicional por crecimiento acelerado';

            // Act
            const feeding = await createTestFeeding({ justificacion });

            // Assert
            expect(feeding.justificacion).toBe(justificacion);
        });

        test('should accept empty string justificacion', async () => {
            // Arrange & Act
            const feeding = await createTestFeeding({ justificacion: '' });

            // Assert
            expect(feeding.justificacion).toBe('');
        });

    });

    describe('Schema Properties', () => {
        
        test('should have all required schema properties', async () => {
            // Arrange & Act
            const feeding = await createTestFeeding();

            // Assert
            expect(feeding).toHaveProperty('codigo');
            expect(feeding).toHaveProperty('heno');
            expect(feeding).toHaveProperty('hierba');
            expect(feeding).toHaveProperty('balanceado');
            expect(feeding).toHaveProperty('fecha');
            expect(feeding).toHaveProperty('justificacion');
            expect(feeding).toHaveProperty('_id');
        });

        test('should not have unexpected properties', async () => {
            // Arrange & Act
            const feeding = await createTestFeeding();

            // Assert
            const feedingObj = feeding.toObject();
            const expectedProperties = ['_id', 'codigo', 'heno', 'hierba', 'balanceado', 'fecha', 'justificacion', '__v'];
            const actualProperties = Object.keys(feedingObj);
            
            expect(actualProperties.sort()).toEqual(expectedProperties.sort());
        });

    });

    describe('Data Persistence', () => {
        
        test('should persist data correctly', async () => {
            // Arrange
            const feedingData = {
                codigo: 'R042',
                heno: 150,
                hierba: 120,
                balanceado: 180,
                justificacion: 'Alimentación especial'
            };

            // Act
            const feeding = new Feeding(feedingData);
            const savedFeeding = await feeding.save();
            const foundFeeding = await Feeding.findById(savedFeeding._id);

            // Assert
            expect(foundFeeding).toBeTruthy();
            expect(foundFeeding.codigo).toBe(feedingData.codigo);
            expect(foundFeeding.heno).toBe(feedingData.heno);
            expect(foundFeeding.hierba).toBe(feedingData.hierba);
            expect(foundFeeding.balanceado).toBe(feedingData.balanceado);
            expect(foundFeeding.justificacion).toBe(feedingData.justificacion);
        });

        test('should find feedings by codigo', async () => {
            // Arrange
            const codigo = 'T123';
            await createTestFeeding({ codigo });
            await createTestFeeding({ codigo: 'T456' });

            // Act
            const foundFeedings = await Feeding.find({ codigo });

            // Assert
            expect(foundFeedings).toHaveLength(1);
            expect(foundFeedings[0].codigo).toBe(codigo);
        });

        test('should update feeding information', async () => {
            // Arrange
            const feeding = await createTestFeeding({ heno: 100 });
            const newHeno = 150;

            // Act
            feeding.heno = newHeno;
            const updatedFeeding = await feeding.save();

            // Assert
            expect(updatedFeeding.heno).toBe(newHeno);
        });

        test('should delete feeding record', async () => {
            // Arrange
            const feeding = await createTestFeeding();
            const feedingId = feeding._id;

            // Act
            await Feeding.findByIdAndDelete(feedingId);
            const deletedFeeding = await Feeding.findById(feedingId);

            // Assert
            expect(deletedFeeding).toBeNull();
        });

    });

    describe('Query Operations', () => {
        
        test('should find feedings by date range', async () => {
            // Arrange
            const today = new Date();
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
            const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

            await createTestFeeding({ codigo: 'T001', fecha: yesterday });
            await createTestFeeding({ codigo: 'T002', fecha: today });
            await createTestFeeding({ codigo: 'T003', fecha: tomorrow });

            // Act
            const todayFeedings = await Feeding.find({
                fecha: {
                    $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                    $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
                }
            });

            // Assert
            expect(todayFeedings).toHaveLength(1);
            expect(todayFeedings[0].codigo).toBe('T002');
        });

        test('should count feedings by codigo', async () => {
            // Arrange
            const codigo = 'T001';
            await createTestFeeding({ codigo });
            await createTestFeeding({ codigo });
            await createTestFeeding({ codigo: 'T002' });

            // Act
            const count = await Feeding.countDocuments({ codigo });

            // Assert
            expect(count).toBe(2);
        });

        test('should find feedings with justificacion', async () => {
            // Arrange
            await createTestFeeding({ codigo: 'T001', justificacion: 'Especial' });
            await createTestFeeding({ codigo: 'T002', justificacion: null });
            await createTestFeeding({ codigo: 'T003', justificacion: 'Otro motivo' });

            // Act
            const feedingsWithJustificacion = await Feeding.find({
                justificacion: { $ne: null }
            });

            // Assert
            expect(feedingsWithJustificacion).toHaveLength(2);
            expect(feedingsWithJustificacion.map(f => f.codigo)).toContain('T001');
            expect(feedingsWithJustificacion.map(f => f.codigo)).toContain('T003');
        });

        test('should sort feedings by date', async () => {
            // Arrange
            const date1 = new Date('2024-01-01');
            const date2 = new Date('2024-01-02');
            const date3 = new Date('2024-01-03');

            await createTestFeeding({ codigo: 'T002', fecha: date2 });
            await createTestFeeding({ codigo: 'T001', fecha: date1 });
            await createTestFeeding({ codigo: 'T003', fecha: date3 });

            // Act
            const sortedFeedings = await Feeding.find().sort({ fecha: 1 });

            // Assert
            expect(sortedFeedings).toHaveLength(3);
            expect(sortedFeedings[0].codigo).toBe('T001');
            expect(sortedFeedings[1].codigo).toBe('T002');
            expect(sortedFeedings[2].codigo).toBe('T003');
        });

    });

    describe('Business Logic Scenarios', () => {
        
        test('should handle multiple feedings for same rabbit in same day', async () => {
            // Arrange
            const codigo = 'T001';
            const today = new Date();
            
            const feeding1 = await createTestFeeding({
                codigo,
                fecha: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0), // 8 AM
                justificacion: 'Primera alimentación'
            });
            
            const feeding2 = await createTestFeeding({
                codigo,
                fecha: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0), // 4 PM
                justificacion: 'Segunda alimentación'
            });

            // Act
            const dailyFeedings = await Feeding.find({
                codigo,
                fecha: {
                    $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                    $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
                }
            });

            // Assert
            expect(dailyFeedings).toHaveLength(2);
            expect(dailyFeedings.map(f => f._id.toString())).toContain(feeding1._id.toString());
            expect(dailyFeedings.map(f => f._id.toString())).toContain(feeding2._id.toString());
        });

        test('should calculate total daily food consumption', async () => {
            // Arrange
            const codigo = 'T001';
            const today = new Date();
            
            await createTestFeeding({
                codigo,
                heno: 50,
                hierba: 40,
                balanceado: 60,
                fecha: today
            });
            
            await createTestFeeding({
                codigo,
                heno: 30,
                hierba: 35,
                balanceado: 45,
                fecha: today
            });

            // Act
            const dailyFeedings = await Feeding.find({
                codigo,
                fecha: {
                    $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                    $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
                }
            });

            const totalHeno = dailyFeedings.reduce((sum, f) => sum + f.heno, 0);
            const totalHierba = dailyFeedings.reduce((sum, f) => sum + f.hierba, 0);
            const totalBalanceado = dailyFeedings.reduce((sum, f) => sum + f.balanceado, 0);

            // Assert
            expect(totalHeno).toBe(80);
            expect(totalHierba).toBe(75);
            expect(totalBalanceado).toBe(105);
        });

    });

});
