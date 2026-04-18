/**
 * Unit tests for AssignRabbit model
 * Testing all validations and business logic
 * Following the Arrange, Act, Assert pattern
 */

const AssignRabbit = require('../../../src/models/assignRabbit');
const { createTestAssignment } = require('../../helpers/testHelpers');

describe('AssignRabbit Model', () => {
    
    describe('AssignRabbit Creation and Validation', () => {
        
        test('should create a valid rabbit assignment with all required fields', async () => {
            // Arrange
            const assignmentData = {
                rabbitCode: 'H001',
                cageNumber: 5,
                status: 'asignado'
            };

            // Act
            const assignment = new AssignRabbit(assignmentData);
            const savedAssignment = await assignment.save();

            // Assert
            expect(savedAssignment._id).toBeDefined();
            expect(savedAssignment.rabbitCode).toBe('H001');
            expect(savedAssignment.cageNumber).toBe(5);
            expect(savedAssignment.status).toBe('asignado');
            expect(savedAssignment.assignedAt).toBeDefined();
        });

        test('should create assignment with default values', async () => {
            // Arrange
            const assignmentData = {
                rabbitCode: 'H001',
                cageNumber: 5
            };

            // Act
            const assignment = new AssignRabbit(assignmentData);
            const savedAssignment = await assignment.save();

            // Assert
            expect(savedAssignment.status).toBe('asignado'); // Default status
            expect(savedAssignment.assignedAt).toBeDefined(); // Should have current date
        });

        test('should fail validation when rabbitCode is missing', async () => {
            // Arrange
            const assignmentData = {
                cageNumber: 5
            };

            // Act & Assert
            const assignment = new AssignRabbit(assignmentData);
            await expect(assignment.save()).rejects.toThrow();
        });

        test('should fail validation when cageNumber is missing', async () => {
            // Arrange
            const assignmentData = {
                rabbitCode: 'H001'
            };

            // Act & Assert
            const assignment = new AssignRabbit(assignmentData);
            await expect(assignment.save()).rejects.toThrow();
        });

    });

    describe('Data Type Validation', () => {
        
        test('should accept valid rabbit codes', async () => {
            // Arrange
            const validCodes = ['H001', 'HEMBRA001', 'R123', 'ABC', 'M042'];

            // Act & Assert
            for (let i = 0; i < validCodes.length; i++) {
                const code = validCodes[i];
                const assignment = await createTestAssignment({
                    rabbitCode: code,
                    cageNumber: i + 1
                });
                expect(assignment.rabbitCode).toBe(code);
            }
        });

        test('should accept valid cage numbers', async () => {
            // Arrange
            const validNumbers = [1, 50, 999];

            // Act & Assert
            for (let i = 0; i < validNumbers.length; i++) {
                const number = validNumbers[i];
                const assignment = await createTestAssignment({
                    rabbitCode: `H00${i + 1}`,
                    cageNumber: number
                });
                expect(assignment.cageNumber).toBe(number);
            }
        });

    });

    describe('Status Field', () => {
        
        test('should accept valid status values', async () => {
            // Arrange
            const validStatuses = ['asignado', 'libre', 'mantenimiento'];

            // Act & Assert
            for (let i = 0; i < validStatuses.length; i++) {
                const status = validStatuses[i];
                const assignment = await createTestAssignment({
                    rabbitCode: `H00${i + 1}`,
                    cageNumber: i + 1,
                    status: status
                });
                expect(assignment.status).toBe(status);
            }
        });

        test('should default to asignado when status not provided', async () => {
            // Arrange & Act
            const assignment = await createTestAssignment();

            // Assert
            expect(assignment.status).toBe('asignado');
        });

    });

    describe('Date Fields', () => {
        
        test('should set assignedAt automatically if not provided', async () => {
            // Arrange
            const before = new Date();

            // Act
            const assignment = await createTestAssignment();

            // Assert
            const after = new Date();
            expect(assignment.assignedAt).toBeDefined();
            expect(assignment.assignedAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
            expect(assignment.assignedAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
        });

        test('should accept custom assignment date', async () => {
            // Arrange
            const customDate = new Date('2024-01-15T10:30:00Z');

            // Act
            const assignment = await createTestAssignment({
                assignedAt: customDate
            });

            // Assert
            expect(assignment.assignedAt.getTime()).toBe(customDate.getTime());
        });

    });

    describe('Schema Properties', () => {
        
        test('should have all required schema properties', async () => {
            // Arrange & Act
            const assignment = await createTestAssignment();

            // Assert
            expect(assignment).toHaveProperty('rabbitCode');
            expect(assignment).toHaveProperty('cageNumber');
            expect(assignment).toHaveProperty('status');
            expect(assignment).toHaveProperty('assignedAt');
            expect(assignment).toHaveProperty('_id');
        });

        test('should not have unexpected properties', async () => {
            // Arrange & Act
            const assignment = await createTestAssignment();

            // Assert
            const assignmentObj = assignment.toObject();
            const expectedProperties = [
                '_id', 'rabbitCode', 'cageNumber', 
                'status', 'assignedAt', '__v'
            ];
            const actualProperties = Object.keys(assignmentObj);
            
            expect(actualProperties.sort()).toEqual(expectedProperties.sort());
        });

    });

    describe('Data Persistence', () => {
        
        test('should persist data correctly', async () => {
            // Arrange
            const assignmentData = {
                rabbitCode: 'H042',
                cageNumber: 15,
                status: 'libre'
            };

            // Act
            const assignment = new AssignRabbit(assignmentData);
            const savedAssignment = await assignment.save();
            const foundAssignment = await AssignRabbit.findById(savedAssignment._id);

            // Assert
            expect(foundAssignment).toBeTruthy();
            expect(foundAssignment.rabbitCode).toBe(assignmentData.rabbitCode);
            expect(foundAssignment.cageNumber).toBe(assignmentData.cageNumber);
            expect(foundAssignment.status).toBe(assignmentData.status);
        });

        test('should find assignments by rabbitCode', async () => {
            // Arrange
            const rabbitCode = 'H123';
            await createTestAssignment({ rabbitCode });
            await createTestAssignment({ rabbitCode: 'H456' });

            // Act
            const foundAssignments = await AssignRabbit.find({ rabbitCode });

            // Assert
            expect(foundAssignments).toHaveLength(1);
            expect(foundAssignments[0].rabbitCode).toBe(rabbitCode);
        });

        test('should update assignment information', async () => {
            // Arrange
            const assignment = await createTestAssignment({ status: 'asignado' });

            // Act
            assignment.status = 'libre';
            const updatedAssignment = await assignment.save();

            // Assert
            expect(updatedAssignment.status).toBe('libre');
        });

        test('should delete assignment record', async () => {
            // Arrange
            const assignment = await createTestAssignment();
            const assignmentId = assignment._id;

            // Act
            await AssignRabbit.findByIdAndDelete(assignmentId);
            const deletedAssignment = await AssignRabbit.findById(assignmentId);

            // Assert
            expect(deletedAssignment).toBeNull();
        });

    });

    describe('Query Operations', () => {
        
        test('should find assignments by cage number', async () => {
            // Arrange
            const cageNumber = 10;
            await createTestAssignment({ rabbitCode: 'H001', cageNumber });
            await createTestAssignment({ rabbitCode: 'H002', cageNumber: 20 });

            // Act
            const cageAssignments = await AssignRabbit.find({ cageNumber });

            // Assert
            expect(cageAssignments).toHaveLength(1);
            expect(cageAssignments[0].cageNumber).toBe(cageNumber);
        });

        test('should find assignments by status', async () => {
            // Arrange
            await createTestAssignment({ rabbitCode: 'H001', status: 'asignado' });
            await createTestAssignment({ rabbitCode: 'H002', status: 'libre' });
            await createTestAssignment({ rabbitCode: 'H003', status: 'asignado' });

            // Act
            const assignedCages = await AssignRabbit.find({ status: 'asignado' });

            // Assert
            expect(assignedCages).toHaveLength(2);
            expect(assignedCages.every(a => a.status === 'asignado')).toBe(true);
        });

        test('should find assignments by date range', async () => {
            // Arrange
            const startDate = new Date('2024-01-01');
            const midDate = new Date('2024-01-15');
            const endDate = new Date('2024-02-01');

            await createTestAssignment({ rabbitCode: 'H001', assignedAt: startDate });
            await createTestAssignment({ rabbitCode: 'H002', assignedAt: midDate });
            await createTestAssignment({ rabbitCode: 'H003', assignedAt: endDate });

            // Act
            const januaryAssignments = await AssignRabbit.find({
                assignedAt: {
                    $gte: new Date('2024-01-01'),
                    $lt: new Date('2024-02-01')
                }
            });

            // Assert
            expect(januaryAssignments).toHaveLength(2);
            expect(januaryAssignments.map(a => a.rabbitCode)).toContain('H001');
            expect(januaryAssignments.map(a => a.rabbitCode)).toContain('H002');
        });

        test('should sort assignments by assignment date', async () => {
            // Arrange
            const date1 = new Date('2024-01-01');
            const date2 = new Date('2024-01-02');
            const date3 = new Date('2024-01-03');

            await createTestAssignment({ rabbitCode: 'H002', assignedAt: date2, cageNumber: 2 });
            await createTestAssignment({ rabbitCode: 'H001', assignedAt: date1, cageNumber: 1 });
            await createTestAssignment({ rabbitCode: 'H003', assignedAt: date3, cageNumber: 3 });

            // Act
            const sortedAssignments = await AssignRabbit.find().sort({ assignedAt: 1 });

            // Assert
            expect(sortedAssignments).toHaveLength(3);
            expect(sortedAssignments[0].rabbitCode).toBe('H001');
            expect(sortedAssignments[1].rabbitCode).toBe('H002');
            expect(sortedAssignments[2].rabbitCode).toBe('H003');
        });

    });

    describe('Business Logic Scenarios', () => {
        
        test('should find all assigned cages', async () => {
            // Arrange
            await createTestAssignment({ 
                rabbitCode: 'H001', 
                cageNumber: 5,
                status: 'asignado' 
            });
            await createTestAssignment({ 
                rabbitCode: 'H002', 
                cageNumber: 10,
                status: 'libre' 
            });
            await createTestAssignment({ 
                rabbitCode: 'H003', 
                cageNumber: 15,
                status: 'asignado' 
            });

            // Act
            const assignedCages = await AssignRabbit.find({ status: 'asignado' });

            // Assert
            expect(assignedCages).toHaveLength(2);
            expect(assignedCages.map(a => a.rabbitCode)).toContain('H001');
            expect(assignedCages.map(a => a.rabbitCode)).toContain('H003');
        });

        test('should find free cages', async () => {
            // Arrange
            await createTestAssignment({ 
                rabbitCode: 'H001', 
                cageNumber: 5,
                status: 'asignado' 
            });
            await createTestAssignment({ 
                rabbitCode: 'H002', 
                cageNumber: 10,
                status: 'libre' 
            });
            await createTestAssignment({ 
                rabbitCode: 'H003', 
                cageNumber: 15,
                status: 'libre' 
            });

            // Act
            const freeCages = await AssignRabbit.find({ status: 'libre' });

            // Assert
            expect(freeCages).toHaveLength(2);
            expect(freeCages.every(a => a.status === 'libre')).toBe(true);
        });

        test('should find rabbit current cage assignment', async () => {
            // Arrange
            const rabbitCode = 'H001';
            
            // Create historical assignment
            await createTestAssignment({
                rabbitCode,
                cageNumber: 5,
                status: 'libre',
                assignedAt: new Date('2024-01-01')
            });
            
            // Create current assignment
            const currentAssignment = await createTestAssignment({
                rabbitCode,
                cageNumber: 10,
                status: 'asignado',
                assignedAt: new Date('2024-02-01')
            });

            // Act
            const latestAssignment = await AssignRabbit
                .findOne({ rabbitCode, status: 'asignado' })
                .sort({ assignedAt: -1 });

            // Assert
            expect(latestAssignment).toBeTruthy();
            expect(latestAssignment.cageNumber).toBe(10);
            expect(latestAssignment.status).toBe('asignado');
        });

        test('should find recent assignments (last 7 days)', async () => {
            // Arrange
            const today = new Date();
            const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

            await createTestAssignment({ 
                rabbitCode: 'H001', 
                assignedAt: today 
            });
            await createTestAssignment({ 
                rabbitCode: 'H002', 
                assignedAt: lastWeek 
            });
            await createTestAssignment({ 
                rabbitCode: 'H003', 
                assignedAt: lastMonth 
            });

            // Act
            const recentAssignments = await AssignRabbit.find({
                assignedAt: { $gte: lastWeek }
            });

            // Assert
            expect(recentAssignments).toHaveLength(2);
            expect(recentAssignments.map(a => a.rabbitCode)).toContain('H001');
            expect(recentAssignments.map(a => a.rabbitCode)).toContain('H002');
        });

        test('should handle cage reassignment', async () => {
            // Arrange
            const rabbitCode = 'H001';
            
            // Initial assignment
            const initialAssignment = await createTestAssignment({
                rabbitCode,
                cageNumber: 5,
                status: 'asignado'
            });

            // Act - Reassign to different cage
            initialAssignment.status = 'libre';
            await initialAssignment.save();

            const newAssignment = await createTestAssignment({
                rabbitCode,
                cageNumber: 10,
                status: 'asignado'
            });

            // Assert
            const allAssignments = await AssignRabbit.find({ rabbitCode });
            expect(allAssignments).toHaveLength(2);
            
            const activeAssignment = await AssignRabbit.findOne({ 
                rabbitCode, 
                status: 'asignado' 
            });
            expect(activeAssignment.cageNumber).toBe(10);
        });

        test('should track cage occupancy over time', async () => {
            // Arrange
            const cageNumber = 5;
            
            // Multiple rabbits assigned to same cage at different times
            await createTestAssignment({
                rabbitCode: 'H001',
                cageNumber,
                status: 'libre', // Previously assigned
                assignedAt: new Date('2024-01-01')
            });
            
            await createTestAssignment({
                rabbitCode: 'H002',
                cageNumber,
                status: 'asignado', // Currently assigned
                assignedAt: new Date('2024-02-01')
            });

            // Act
            const cageHistory = await AssignRabbit
                .find({ cageNumber })
                .sort({ assignedAt: 1 });

            const currentOccupant = await AssignRabbit
                .findOne({ cageNumber, status: 'asignado' });

            // Assert
            expect(cageHistory).toHaveLength(2);
            expect(currentOccupant).toBeTruthy();
            expect(currentOccupant.rabbitCode).toBe('H002');
        });

    });

});
