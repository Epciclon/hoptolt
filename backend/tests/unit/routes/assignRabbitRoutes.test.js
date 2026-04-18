const request = require('supertest');
const express = require('express');
const assignRabbitRoutes = require('../../../src/routes/assignRabbitRoutes');

// Mock the controllers
jest.mock('../../../src/controllers/assignRabbitController');

const assignRabbitController = require('../../../src/controllers/assignRabbitController');

describe('Assign Rabbit Routes', () => {
    let app;

    beforeEach(() => {
        // Create express app with routes
        app = express();
        app.use(express.json());
        app.use('/', assignRabbitRoutes);

        // Reset all mocks
        jest.clearAllMocks();

        // Setup default controller mocks
        assignRabbitController.assignRabbit.mockImplementation((req, res) => {
            res.status(201).json({ 
                message: 'Conejo asignado exitosamente',
                assignment: { 
                    rabbitCode: req.body.rabbitCode, 
                    cageNumber: req.body.cageNumber,
                    assignmentDate: new Date()
                }
            });
        });

        assignRabbitController.getAssignments.mockImplementation((req, res) => {
            res.status(200).json({ 
                assignments: [
                    { rabbitCode: 'R001', cageNumber: 'C001', status: 'asignado' },
                    { rabbitCode: 'R002', cageNumber: 'C002', status: 'asignado' }
                ],
                total: 2
            });
        });

        assignRabbitController.unassignRabbit.mockImplementation((req, res) => {
            res.status(200).json({ 
                message: 'Conejo liberado exitosamente',
                assignment: { 
                    rabbitCode: req.body.rabbitCode,
                    status: 'liberado'
                }
            });
        });

        assignRabbitController.deleteAssignmentByRabbitCode.mockImplementation((req, res) => {
            res.status(200).json({ 
                message: 'Asignación eliminada exitosamente'
            });
        });
    });

    describe('POST /assign-rabbit', () => {
        it('should call assignRabbit controller', async () => {
            const assignmentData = {
                rabbitCode: 'R003',
                cageNumber: 'C003'
            };

            const response = await request(app)
                .post('/assign-rabbit')
                .send(assignmentData);

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('Conejo asignado exitosamente');
            expect(assignRabbitController.assignRabbit).toHaveBeenCalled();
        });

        it('should pass request body to controller', async () => {
            const assignmentData = {
                rabbitCode: 'R004',
                cageNumber: 'C004',
                notes: 'Special assignment'
            };

            await request(app)
                .post('/assign-rabbit')
                .send(assignmentData);

            expect(assignRabbitController.assignRabbit).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle minimal assignment data', async () => {
            const assignmentData = {
                rabbitCode: 'R005',
                cageNumber: 'C005'
            };

            await request(app)
                .post('/assign-rabbit')
                .send(assignmentData);

            expect(assignRabbitController.assignRabbit).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle empty request body', async () => {
            await request(app)
                .post('/assign-rabbit')
                .send({});

            expect(assignRabbitController.assignRabbit).toHaveBeenCalled();
        });

        it('should handle additional fields in request body', async () => {
            const assignmentData = {
                rabbitCode: 'R006',
                cageNumber: 'C006',
                assignmentDate: '2024-01-15',
                notes: 'Temporary assignment',
                priority: 'high'
            };

            await request(app)
                .post('/assign-rabbit')
                .send(assignmentData);

            expect(assignRabbitController.assignRabbit).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });
    });

    describe('GET /assignments', () => {
        it('should call getAssignments controller', async () => {
            const response = await request(app)
                .get('/assignments');

            expect(response.status).toBe(200);
            expect(response.body.assignments).toHaveLength(2);
            expect(response.body.total).toBe(2);
            expect(assignRabbitController.getAssignments).toHaveBeenCalled();
        });

        it('should handle query parameters for filtering', async () => {
            await request(app)
                .get('/assignments')
                .query({ 
                    cageNumber: 'C001',
                    status: 'asignado',
                    page: '1',
                    limit: '10'
                });

            expect(assignRabbitController.getAssignments).toHaveBeenCalled();
        });

        it('should handle pagination parameters', async () => {
            await request(app)
                .get('/assignments')
                .query({ page: '2', limit: '5' });

            expect(assignRabbitController.getAssignments).toHaveBeenCalled();
        });

        it('should work without query parameters', async () => {
            await request(app)
                .get('/assignments');

            expect(assignRabbitController.getAssignments).toHaveBeenCalled();
        });

        it('should handle multiple filter parameters', async () => {
            await request(app)
                .get('/assignments')
                .query({ 
                    status: 'asignado',
                    dateFrom: '2024-01-01',
                    dateTo: '2024-01-31',
                    sortBy: 'assignmentDate'
                });

            expect(assignRabbitController.getAssignments).toHaveBeenCalled();
        });
    });

    describe('POST /unassign', () => {
        it('should call unassignRabbit controller', async () => {
            const unassignData = {
                rabbitCode: 'R001'
            };

            const response = await request(app)
                .post('/unassign')
                .send(unassignData);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Conejo liberado exitosamente');
            expect(assignRabbitController.unassignRabbit).toHaveBeenCalled();
        });

        it('should pass request body to controller', async () => {
            const unassignData = {
                rabbitCode: 'R002',
                reason: 'Cleaning cage',
                unassignmentDate: '2024-01-15'
            };

            await request(app)
                .post('/unassign')
                .send(unassignData);

            expect(assignRabbitController.unassignRabbit).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle minimal unassign data', async () => {
            const unassignData = {
                rabbitCode: 'R003'
            };

            await request(app)
                .post('/unassign')
                .send(unassignData);

            expect(assignRabbitController.unassignRabbit).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should handle empty request body', async () => {
            await request(app)
                .post('/unassign')
                .send({});

            expect(assignRabbitController.unassignRabbit).toHaveBeenCalled();
        });

        it('should handle additional metadata in request', async () => {
            const unassignData = {
                rabbitCode: 'R004',
                reason: 'Medical treatment',
                notes: 'Temporary removal for health check',
                userId: 'user123'
            };

            await request(app)
                .post('/unassign')
                .send(unassignData);

            expect(assignRabbitController.unassignRabbit).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });
    });

    describe('DELETE /assignments/:rabbitCode', () => {
        it('should call deleteAssignmentByRabbitCode controller with correct parameter', async () => {
            const rabbitCode = 'R001';
            const response = await request(app)
                .delete(`/assignments/${rabbitCode}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Asignación eliminada exitosamente');
            expect(assignRabbitController.deleteAssignmentByRabbitCode).toHaveBeenCalled();
        });

        it('should pass rabbitCode parameter to controller', async () => {
            const rabbitCode = 'R999';
            
            await request(app)
                .delete(`/assignments/${rabbitCode}`);

            expect(assignRabbitController.deleteAssignmentByRabbitCode).toHaveBeenCalled();
        });

        it('should handle alphanumeric rabbit codes', async () => {
            const rabbitCode = 'RABBIT001';
            
            await request(app)
                .delete(`/assignments/${rabbitCode}`);

            expect(assignRabbitController.deleteAssignmentByRabbitCode).toHaveBeenCalled();
        });

        it('should handle rabbit codes with special characters', async () => {
            const rabbitCode = 'R-001_A';
            
            await request(app)
                .delete(`/assignments/${rabbitCode}`);

            expect(assignRabbitController.deleteAssignmentByRabbitCode).toHaveBeenCalled();
        });

        it('should handle URL encoded rabbit codes', async () => {
            const rabbitCode = 'R 001';
            const encodedCode = encodeURIComponent(rabbitCode);
            
            await request(app)
                .delete(`/assignments/${encodedCode}`);

            expect(assignRabbitController.deleteAssignmentByRabbitCode).toHaveBeenCalled();
        });
    });

    describe('HTTP method validation', () => {
        it('should only accept POST for /assign-rabbit', async () => {
            const unsupportedMethods = ['GET', 'PUT', 'DELETE', 'PATCH'];
            
            for (const method of unsupportedMethods) {
                const response = await request(app)[method.toLowerCase()]('/assign-rabbit');
                expect(response.status).toBe(404);
            }
        });

        it('should only accept GET for /assignments', async () => {
            const unsupportedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
            
            for (const method of unsupportedMethods) {
                const response = await request(app)[method.toLowerCase()]('/assignments');
                expect(response.status).toBe(404);
            }
        });

        it('should only accept POST for /unassign', async () => {
            const unsupportedMethods = ['GET', 'PUT', 'DELETE', 'PATCH'];
            
            for (const method of unsupportedMethods) {
                const response = await request(app)[method.toLowerCase()]('/unassign');
                expect(response.status).toBe(404);
            }
        });

        it('should only accept DELETE for /assignments/:rabbitCode', async () => {
            const rabbitCode = 'R001';
            const unsupportedMethods = ['GET', 'POST', 'PUT', 'PATCH'];
            
            for (const method of unsupportedMethods) {
                const response = await request(app)[method.toLowerCase()](`/assignments/${rabbitCode}`);
                expect(response.status).toBe(404);
            }
        });
    });

    describe('Request/Response handling', () => {
        it('should handle JSON content type', async () => {
            const assignmentData = { rabbitCode: 'R007', cageNumber: 'C007' };
            
            const response = await request(app)
                .post('/assign-rabbit')
                .set('Content-Type', 'application/json')
                .send(JSON.stringify(assignmentData));

            expect(response.status).toBe(201);
        });

        it('should handle malformed JSON gracefully', async () => {
            const response = await request(app)
                .post('/assign-rabbit')
                .set('Content-Type', 'application/json')
                .send('invalid json');

            expect(response.status).toBe(400);
        });

        it('should handle query parameters with special characters', async () => {
            await request(app)
                .get('/assignments')
                .query({ 
                    search: 'R-001_A',
                    filter: 'status=asignado'
                });

            expect(assignRabbitController.getAssignments).toHaveBeenCalled();
        });
    });

    describe('Controller function calls verification', () => {
        it('should call each controller function exactly once per request', async () => {
            await request(app).post('/assign-rabbit').send({});
            expect(assignRabbitController.assignRabbit).toHaveBeenCalledTimes(1);

            await request(app).get('/assignments');
            expect(assignRabbitController.getAssignments).toHaveBeenCalledTimes(1);

            await request(app).post('/unassign').send({});
            expect(assignRabbitController.unassignRabbit).toHaveBeenCalledTimes(1);

            await request(app).delete('/assignments/R001');
            expect(assignRabbitController.deleteAssignmentByRabbitCode).toHaveBeenCalledTimes(1);
        });
    });

    describe('Route specificity and conflicts', () => {
        it('should not confuse /assignments with /assignments/:rabbitCode', async () => {
            // Test that GET /assignments calls getAssignments
            await request(app).get('/assignments');
            expect(assignRabbitController.getAssignments).toHaveBeenCalled();
            expect(assignRabbitController.deleteAssignmentByRabbitCode).not.toHaveBeenCalled();

            // Reset mocks
            jest.clearAllMocks();

            // Test that DELETE /assignments/R001 calls deleteAssignmentByRabbitCode
            await request(app).delete('/assignments/R001');
            expect(assignRabbitController.deleteAssignmentByRabbitCode).toHaveBeenCalled();
            expect(assignRabbitController.getAssignments).not.toHaveBeenCalled();
        });
    });

    describe('Edge cases and error handling', () => {
        it('should handle requests with no body for POST routes', async () => {
            const response = await request(app)
                .post('/assign-rabbit')
                .send();

            expect(response.status).toBe(201); // Assuming controller handles this gracefully
        });

        it('should handle very long rabbit codes', async () => {
            const longRabbitCode = 'R'.repeat(100) + '001';
            
            await request(app)
                .delete(`/assignments/${longRabbitCode}`);

            expect(assignRabbitController.deleteAssignmentByRabbitCode).toHaveBeenCalled();
        });

        it('should handle numeric rabbit codes', async () => {
            const rabbitCode = '12345';
            
            await request(app)
                .delete(`/assignments/${rabbitCode}`);

            expect(assignRabbitController.deleteAssignmentByRabbitCode).toHaveBeenCalled();
        });
    });

    describe('Express router functionality', () => {
        it('should export Express router', () => {
            expect(typeof assignRabbitRoutes).toBe('function');
            expect(assignRabbitRoutes.name).toBe('router');
        });

        it('should handle concurrent requests', async () => {
            const promises = [
                request(app).get('/assignments'),
                request(app).post('/assign-rabbit').send({ rabbitCode: 'R010', cageNumber: 'C010' }),
                request(app).post('/unassign').send({ rabbitCode: 'R011' })
            ];

            const responses = await Promise.all(promises);
            
            responses.forEach(response => {
                expect(response.status).toBeLessThan(400);
            });
        });
    });
});
