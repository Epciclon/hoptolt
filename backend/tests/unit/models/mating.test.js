/**
 * Unit tests for Mating model
 * Testing all validations and business logic
 * Following the Arrange, Act, Assert pattern
 */

const Mating = require('../../../src/models/mating');
const { createTestMating } = require('../../helpers/testHelpers');

describe('Mating Model', () => {
    
    describe('Mating Creation and Validation', () => {
        
        test('should create a valid mating record with all required fields', async () => {
            // Arrange
            const matingDate = new Date();
            const birthDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days later
            
            const matingData = {
                rabbitCode: 'H001',
                cageNumber: 5,
                matingDate: matingDate,
                birthDate: birthDate,
                status: 'activo'
            };

            // Act
            const mating = new Mating(matingData);
            const savedMating = await mating.save();

            // Assert
            expect(savedMating._id).toBeDefined();
            expect(savedMating.rabbitCode).toBe('H001');
            expect(savedMating.cageNumber).toBe(5);
            expect(savedMating.matingDate.getTime()).toBe(matingDate.getTime());
            expect(savedMating.birthDate.getTime()).toBe(birthDate.getTime());
            expect(savedMating.status).toBe('activo');
            expect(savedMating.createdAt).toBeDefined();
        });

        test('should create mating record with default values', async () => {
            // Arrange
            const matingDate = new Date();
            const birthDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            
            const matingData = {
                rabbitCode: 'H001',
                cageNumber: 5,
                matingDate: matingDate,
                birthDate: birthDate
            };

            // Act
            const mating = new Mating(matingData);
            const savedMating = await mating.save();

            // Assert
            expect(savedMating.status).toBe('activo'); // Default status
            expect(savedMating.createdAt).toBeDefined();
        });

        test('should fail validation when rabbitCode is missing', async () => {
            // Arrange
            const matingData = {
                cageNumber: 5,
                matingDate: new Date(),
                birthDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            };

            // Act & Assert
            const mating = new Mating(matingData);
            await expect(mating.save()).rejects.toThrow();
        });

        test('should fail validation when cageNumber is missing', async () => {
            // Arrange
            const matingData = {
                rabbitCode: 'H001',
                matingDate: new Date(),
                birthDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            };

            // Act & Assert
            const mating = new Mating(matingData);
            await expect(mating.save()).rejects.toThrow();
        });

        test('should fail validation when matingDate is missing', async () => {
            // Arrange
            const matingData = {
                rabbitCode: 'H001',
                cageNumber: 5,
                birthDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            };

            // Act & Assert
            const mating = new Mating(matingData);
            await expect(mating.save()).rejects.toThrow();
        });

        test('should fail validation when birthDate is missing', async () => {
            // Arrange
            const matingData = {
                rabbitCode: 'H001',
                cageNumber: 5,
                matingDate: new Date()
            };

            // Act & Assert
            const mating = new Mating(matingData);
            await expect(mating.save()).rejects.toThrow();
        });

    });

    describe('Data Type Validation', () => {
        
        test('should accept valid rabbit codes', async () => {
            // Arrange
            const validCodes = ['H001', 'HEMBRA001', 'R123', 'ABC'];

            // Act & Assert
            for (let i = 0; i < validCodes.length; i++) {
                const code = validCodes[i];
                const mating = await createTestMating({
                    rabbitCode: code,
                    cageNumber: i + 1
                });
                expect(mating.rabbitCode).toBe(code);
            }
        });

        test('should accept valid cage numbers', async () => {
            // Arrange
            const validNumbers = [1, 50, 999];

            // Act & Assert
            for (let i = 0; i < validNumbers.length; i++) {
                const number = validNumbers[i];
                const mating = await createTestMating({
                    rabbitCode: `H00${i + 1}`,
                    cageNumber: number
                });
                expect(mating.cageNumber).toBe(number);
            }
        });

        test('should handle different date formats correctly', async () => {
            // Arrange
            const matingDate = new Date('2024-01-15T10:30:00Z');
            const birthDate = new Date('2024-02-15T10:30:00Z');

            // Act
            const mating = await createTestMating({
                matingDate: matingDate,
                birthDate: birthDate
            });

            // Assert
            expect(mating.matingDate.getTime()).toBe(matingDate.getTime());
            expect(mating.birthDate.getTime()).toBe(birthDate.getTime());
        });

    });

    describe('Status Field', () => {
        
        test('should accept valid status values', async () => {
            // Arrange
            const validStatuses = ['activo', 'finalizado', 'eliminado'];

            // Act & Assert
            for (let i = 0; i < validStatuses.length; i++) {
                const status = validStatuses[i];
                const mating = await createTestMating({
                    rabbitCode: `H00${i + 1}`,
                    cageNumber: i + 1,
                    status: status
                });
                expect(mating.status).toBe(status);
            }
        });

        test('should default to activo when status not provided', async () => {
            // Arrange & Act
            const mating = await createTestMating();

            // Assert
            expect(mating.status).toBe('activo');
        });

    });

    describe('Date Logic', () => {
        
        test('should accept birth date after mating date', async () => {
            // Arrange
            const matingDate = new Date('2024-01-01');
            const birthDate = new Date('2024-02-01'); // 31 days later

            // Act
            const mating = await createTestMating({
                matingDate: matingDate,
                birthDate: birthDate
            });

            // Assert
            expect(mating.birthDate.getTime()).toBeGreaterThan(mating.matingDate.getTime());
        });

        test('should accept birth date same as mating date (edge case)', async () => {
            // Arrange
            const sameDate = new Date('2024-01-01');

            // Act
            const mating = await createTestMating({
                matingDate: sameDate,
                birthDate: sameDate
            });

            // Assert
            expect(mating.birthDate.getTime()).toBe(mating.matingDate.getTime());
        });

        test('should handle typical gestation period (30-32 days)', async () => {
            // Arrange
            const matingDate = new Date('2024-01-01');
            const birthDate = new Date('2024-02-01'); // 31 days later

            // Act
            const mating = await createTestMating({
                matingDate: matingDate,
                birthDate: birthDate
            });

            // Assert
            const gestationDays = Math.floor((mating.birthDate - mating.matingDate) / (1000 * 60 * 60 * 24));
            expect(gestationDays).toBe(31);
        });

    });

    describe('Schema Properties', () => {
        
        test('should have all required schema properties', async () => {
            // Arrange & Act
            const mating = await createTestMating();

            // Assert
            expect(mating).toHaveProperty('rabbitCode');
            expect(mating).toHaveProperty('cageNumber');
            expect(mating).toHaveProperty('matingDate');
            expect(mating).toHaveProperty('birthDate');
            expect(mating).toHaveProperty('status');
            expect(mating).toHaveProperty('createdAt');
            expect(mating).toHaveProperty('_id');
        });

        test('should not have unexpected properties', async () => {
            // Arrange & Act
            const mating = await createTestMating();

            // Assert
            const matingObj = mating.toObject();
            const expectedProperties = [
                '_id', 'rabbitCode', 'cageNumber', 'matingDate', 
                'birthDate', 'status', 'createdAt', '__v'
            ];
            const actualProperties = Object.keys(matingObj);
            
            expect(actualProperties.sort()).toEqual(expectedProperties.sort());
        });

        test('should set createdAt timestamp', async () => {
            // Arrange
            const before = new Date();

            // Act
            const mating = await createTestMating();

            // Assert
            const after = new Date();
            expect(mating.createdAt).toBeDefined();
            expect(mating.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
            expect(mating.createdAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
        });

    });

    describe('Data Persistence', () => {
        
        test('should persist data correctly', async () => {
            // Arrange
            const matingData = {
                rabbitCode: 'H042',
                cageNumber: 15,
                matingDate: new Date('2024-01-01'),
                birthDate: new Date('2024-02-01'),
                status: 'finalizado'
            };

            // Act
            const mating = new Mating(matingData);
            const savedMating = await mating.save();
            const foundMating = await Mating.findById(savedMating._id);

            // Assert
            expect(foundMating).toBeTruthy();
            expect(foundMating.rabbitCode).toBe(matingData.rabbitCode);
            expect(foundMating.cageNumber).toBe(matingData.cageNumber);
            expect(foundMating.matingDate.getTime()).toBe(matingData.matingDate.getTime());
            expect(foundMating.birthDate.getTime()).toBe(matingData.birthDate.getTime());
            expect(foundMating.status).toBe(matingData.status);
        });

        test('should find matings by rabbitCode', async () => {
            // Arrange
            const rabbitCode = 'H123';
            await createTestMating({ rabbitCode });
            await createTestMating({ rabbitCode: 'H456' });

            // Act
            const foundMatings = await Mating.find({ rabbitCode });

            // Assert
            expect(foundMatings).toHaveLength(1);
            expect(foundMatings[0].rabbitCode).toBe(rabbitCode);
        });

        test('should update mating information', async () => {
            // Arrange
            const mating = await createTestMating({ status: 'activo' });

            // Act
            mating.status = 'finalizado';
            const updatedMating = await mating.save();

            // Assert
            expect(updatedMating.status).toBe('finalizado');
        });

        test('should delete mating record', async () => {
            // Arrange
            const mating = await createTestMating();
            const matingId = mating._id;

            // Act
            await Mating.findByIdAndDelete(matingId);
            const deletedMating = await Mating.findById(matingId);

            // Assert
            expect(deletedMating).toBeNull();
        });

    });

    describe('Query Operations', () => {
        
        test('should find matings by cage number', async () => {
            // Arrange
            const cageNumber = 10;
            await createTestMating({ rabbitCode: 'H001', cageNumber });
            await createTestMating({ rabbitCode: 'H002', cageNumber: 20 });

            // Act
            const cageMatings = await Mating.find({ cageNumber });

            // Assert
            expect(cageMatings).toHaveLength(1);
            expect(cageMatings[0].cageNumber).toBe(cageNumber);
        });

        test('should find matings by status', async () => {
            // Arrange
            await createTestMating({ rabbitCode: 'H001', status: 'activo' });
            await createTestMating({ rabbitCode: 'H002', status: 'finalizado' });
            await createTestMating({ rabbitCode: 'H003', status: 'activo' });

            // Act
            const activeMatings = await Mating.find({ status: 'activo' });

            // Assert
            expect(activeMatings).toHaveLength(2);
            expect(activeMatings.every(m => m.status === 'activo')).toBe(true);
        });

        test('should find matings by date range', async () => {
            // Arrange
            const startDate = new Date('2024-01-01');
            const midDate = new Date('2024-01-15');
            const endDate = new Date('2024-02-01');

            await createTestMating({ rabbitCode: 'H001', matingDate: startDate });
            await createTestMating({ rabbitCode: 'H002', matingDate: midDate });
            await createTestMating({ rabbitCode: 'H003', matingDate: endDate });

            // Act
            const januaryMatings = await Mating.find({
                matingDate: {
                    $gte: new Date('2024-01-01'),
                    $lt: new Date('2024-02-01')
                }
            });

            // Assert
            expect(januaryMatings).toHaveLength(2);
            expect(januaryMatings.map(m => m.rabbitCode)).toContain('H001');
            expect(januaryMatings.map(m => m.rabbitCode)).toContain('H002');
        });

        test('should sort matings by mating date', async () => {
            // Arrange
            const date1 = new Date('2024-01-01');
            const date2 = new Date('2024-01-02');
            const date3 = new Date('2024-01-03');

            await createTestMating({ rabbitCode: 'H002', matingDate: date2, cageNumber: 2 });
            await createTestMating({ rabbitCode: 'H001', matingDate: date1, cageNumber: 1 });
            await createTestMating({ rabbitCode: 'H003', matingDate: date3, cageNumber: 3 });

            // Act
            const sortedMatings = await Mating.find().sort({ matingDate: 1 });

            // Assert
            expect(sortedMatings).toHaveLength(3);
            expect(sortedMatings[0].rabbitCode).toBe('H001');
            expect(sortedMatings[1].rabbitCode).toBe('H002');
            expect(sortedMatings[2].rabbitCode).toBe('H003');
        });

    });

    describe('Business Logic Scenarios', () => {
        
        test('should track multiple matings for same rabbit', async () => {
            // Arrange
            const rabbitCode = 'H001';
            
            const firstMating = await createTestMating({
                rabbitCode,
                cageNumber: 1,
                matingDate: new Date('2024-01-01'),
                birthDate: new Date('2024-02-01'),
                status: 'finalizado'
            });
            
            const secondMating = await createTestMating({
                rabbitCode,
                cageNumber: 2,
                matingDate: new Date('2024-03-01'),
                birthDate: new Date('2024-04-01'),
                status: 'activo'
            });

            // Act
            const matingHistory = await Mating.find({ rabbitCode }).sort({ matingDate: 1 });

            // Assert
            expect(matingHistory).toHaveLength(2);
            expect(matingHistory[0].status).toBe('finalizado');
            expect(matingHistory[1].status).toBe('activo');
        });

        test('should find upcoming births', async () => {
            // Arrange
            const today = new Date();
            const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
            const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

            await createTestMating({
                rabbitCode: 'H001',
                birthDate: nextWeek,
                status: 'activo'
            });
            
            await createTestMating({
                rabbitCode: 'H002',
                birthDate: nextMonth,
                status: 'activo'
            });

            // Act
            const upcomingBirths = await Mating.find({
                birthDate: { $gte: today, $lte: nextWeek },
                status: 'activo'
            });

            // Assert
            expect(upcomingBirths).toHaveLength(1);
            expect(upcomingBirths[0].rabbitCode).toBe('H001');
        });

        test('should find overdue births', async () => {
            // Arrange
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const today = new Date();

            await createTestMating({
                rabbitCode: 'H001',
                birthDate: yesterday,
                status: 'activo'
            });
            
            await createTestMating({
                rabbitCode: 'H002',
                birthDate: today,
                status: 'activo'
            });

            // Act
            const overdueBirths = await Mating.find({
                birthDate: { $lt: today },
                status: 'activo'
            });

            // Assert
            expect(overdueBirths).toHaveLength(1);
            expect(overdueBirths[0].rabbitCode).toBe('H001');
        });

        test('should calculate gestation period', async () => {
            // Arrange
            const matingDate = new Date('2024-01-01');
            const birthDate = new Date('2024-02-01');
            
            const mating = await createTestMating({
                matingDate: matingDate,
                birthDate: birthDate
            });

            // Act
            const gestationPeriod = Math.floor((mating.birthDate - mating.matingDate) / (1000 * 60 * 60 * 24));

            // Assert
            expect(gestationPeriod).toBe(31); // 31 days
        });

    });

});
