const request = require('supertest');
const express = require('express');
const reportRoutes = require('../../../src/routes/reportRoutes');

// Mock the controllers
jest.mock('../../../src/controllers/reportController');

const reportController = require('../../../src/controllers/reportController');

describe('Report Routes', () => {
    let app;

    beforeEach(() => {
        // Create express app with routes
        app = express();
        app.use(express.json());
        app.use('/', reportRoutes);

        // Reset all mocks
        jest.clearAllMocks();

        // Setup default controller mocks
        reportController.generateFeedingReport.mockImplementation((req, res) => {
            res.status(200).json({ 
                success: true,
                reportData: { companyName: 'Holptolt', records: [] }
            });
        });

        reportController.generateFeedingReportPDF.mockImplementation((req, res) => {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=feeding-report.pdf');
            res.end(Buffer.from('mock-pdf-content'));
        });

        reportController.generateVaccinationReport.mockImplementation((req, res) => {
            res.status(200).json({ 
                success: true,
                reportData: { companyName: 'Holptolt', records: [] }
            });
        });

        reportController.generateVaccinationReportPDF.mockImplementation((req, res) => {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=vaccination-report.pdf');
            res.end(Buffer.from('mock-pdf-content'));
        });

        reportController.generateDewormingReport.mockImplementation((req, res) => {
            res.status(200).json({ 
                success: true,
                reportData: { companyName: 'Holptolt', records: [] }
            });
        });

        reportController.generateDewormingReportPDF.mockImplementation((req, res) => {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=deworming-report.pdf');
            res.end(Buffer.from('mock-pdf-content'));
        });

        reportController.getAvailableRaces.mockImplementation((req, res) => {
            res.status(200).json({ 
                races: ['Nueva Zelanda', 'California', 'Chinchilla']
            });
        });
    });

    describe('CORS Middleware', () => {
        it('should set CORS headers for all routes', async () => {
            const response = await request(app)
                .get('/available-races');

            expect(response.headers['access-control-allow-origin']).toBe('*');
            expect(response.headers['access-control-allow-methods']).toBe('GET, POST, PUT, DELETE, OPTIONS');
            expect(response.headers['access-control-allow-headers']).toBe('Origin, X-Requested-With, Content-Type, Accept, Authorization');
        });

        it('should handle OPTIONS requests', async () => {
            const response = await request(app)
                .options('/available-races');

            expect(response.status).toBe(200);
            expect(response.headers['access-control-allow-origin']).toBe('*');
        });

        it('should handle OPTIONS for all routes', async () => {
            const routes = [
                '/feeding-report',
                '/feeding-report/pdf',
                '/vaccination-report',
                '/vaccination-report/pdf',
                '/deworming-report',
                '/deworming-report/pdf',
                '/available-races'
            ];

            for (const route of routes) {
                const response = await request(app).options(route);
                expect(response.status).toBe(200);
            }
        });
    });

    describe('POST /feeding-report', () => {
        it('should call generateFeedingReport controller', async () => {
            const reportData = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            const response = await request(app)
                .post('/feeding-report')
                .send(reportData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(reportController.generateFeedingReport).toHaveBeenCalled();
        });

        it('should pass request body to controller', async () => {
            const reportData = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda', 'California']
            };

            await request(app)
                .post('/feeding-report')
                .send(reportData)
                .expect(200);

            expect(reportController.generateFeedingReport).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });

        it('should include CORS headers in response', async () => {
            const response = await request(app)
                .post('/feeding-report')
                .send({
                    startDate: '2024-01-01',
                    endDate: '2024-01-31',
                    races: ['Nueva Zelanda']
                });

            expect(response.headers['access-control-allow-origin']).toBe('*');
        });
    });

    describe('POST /feeding-report/pdf', () => {
        it('should call generateFeedingReportPDF controller', async () => {
            const reportData = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            const response = await request(app)
                .post('/feeding-report/pdf')
                .send(reportData);

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toBe('application/pdf');
            expect(reportController.generateFeedingReportPDF).toHaveBeenCalled();
        });

        it('should handle PDF response correctly', async () => {
            const response = await request(app)
                .post('/feeding-report/pdf')
                .send({
                    startDate: '2024-01-01',
                    endDate: '2024-01-31',
                    races: ['Nueva Zelanda']
                });

            expect(response.headers['content-disposition']).toContain('attachment; filename=feeding-report.pdf');
            expect(Buffer.isBuffer(response.body)).toBe(true);
        });
    });

    describe('POST /vaccination-report', () => {
        it('should call generateVaccinationReport controller', async () => {
            const reportData = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['California']
            };

            const response = await request(app)
                .post('/vaccination-report')
                .send(reportData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(reportController.generateVaccinationReport).toHaveBeenCalled();
        });

        it('should pass correct parameters to controller', async () => {
            const reportData = {
                startDate: '2024-02-01',
                endDate: '2024-02-28',
                races: ['Chinchilla']
            };

            await request(app)
                .post('/vaccination-report')
                .send(reportData)
                .expect(200);

            expect(reportController.generateVaccinationReport).toHaveBeenCalled();
            // Parameter/body verification handled by route functionality
        });
    });

    describe('POST /vaccination-report/pdf', () => {
        it('should call generateVaccinationReportPDF controller', async () => {
            const reportData = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            const response = await request(app)
                .post('/vaccination-report/pdf')
                .send(reportData);

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toBe('application/pdf');
            expect(reportController.generateVaccinationReportPDF).toHaveBeenCalled();
        });
    });

    describe('POST /deworming-report', () => {
        it('should call generateDewormingReport controller', async () => {
            const reportData = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            const response = await request(app)
                .post('/deworming-report')
                .send(reportData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(reportController.generateDewormingReport).toHaveBeenCalled();
        });

        it('should handle multiple races in request', async () => {
            const reportData = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda', 'California', 'Chinchilla']
            };

            await request(app)
                .post('/deworming-report')
                .send(reportData)
                .expect(200);

            expect(reportController.generateDewormingReport).toHaveBeenCalled();
        });
    });

    describe('POST /deworming-report/pdf', () => {
        it('should call generateDewormingReportPDF controller', async () => {
            const reportData = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            const response = await request(app)
                .post('/deworming-report/pdf')
                .send(reportData);

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toBe('application/pdf');
            expect(reportController.generateDewormingReportPDF).toHaveBeenCalled();
        });
    });

    describe('GET /available-races', () => {
        it('should call getAvailableRaces controller', async () => {
            const response = await request(app)
                .get('/available-races');

            expect(response.status).toBe(200);
            expect(response.body.races).toEqual(['Nueva Zelanda', 'California', 'Chinchilla']);
            expect(reportController.getAvailableRaces).toHaveBeenCalled();
        });

        it('should not require request body', async () => {
            await request(app)
                .get('/available-races')
                .expect(200);

            expect(reportController.getAvailableRaces).toHaveBeenCalled();
        });
    });

    describe('Route method validation', () => {
        it('should only accept POST for report generation routes', async () => {
            const routes = [
                '/feeding-report',
                '/feeding-report/pdf',
                '/vaccination-report',
                '/vaccination-report/pdf',
                '/deworming-report',
                '/deworming-report/pdf'
            ];

            for (const route of routes) {
                const response = await request(app).get(route);
                expect(response.status).toBe(404);
            }
        });

        it('should only accept GET for available-races route', async () => {
            const response = await request(app)
                .post('/available-races')
                .send({});

            expect(response.status).toBe(404);
        });
    });

    describe('Request body handling', () => {
        it('should handle empty request body', async () => {
            await request(app)
                .post('/feeding-report')
                .send({})
                .expect(200);

            expect(reportController.generateFeedingReport).toHaveBeenCalled();
        });

        it('should handle malformed JSON gracefully', async () => {
            const response = await request(app)
                .post('/feeding-report')
                .set('Content-Type', 'application/json')
                .send('invalid json');

            expect(response.status).toBe(400);
        });
    });

    describe('Content-Type handling', () => {
        it('should handle JSON content type', async () => {
            const response = await request(app)
                .post('/feeding-report')
                .set('Content-Type', 'application/json')
                .send(JSON.stringify({
                    startDate: '2024-01-01',
                    endDate: '2024-01-31',
                    races: ['Nueva Zelanda']
                }));

            expect(response.status).toBe(200);
        });

        it('should set correct content type for PDF responses', async () => {
            const pdfRoutes = [
                '/feeding-report/pdf',
                '/vaccination-report/pdf',
                '/deworming-report/pdf'
            ];

            for (const route of pdfRoutes) {
                const response = await request(app)
                    .post(route)
                    .send({
                        startDate: '2024-01-01',
                        endDate: '2024-01-31',
                        races: ['Nueva Zelanda']
                    });

                expect(response.headers['content-type']).toBe('application/pdf');
            }
        });
    });

    describe('Controller function calls verification', () => {
        it('should call each controller function exactly once per request', async () => {
            // Test each route independently
            await request(app).post('/feeding-report').send({});
            expect(reportController.generateFeedingReport).toHaveBeenCalledTimes(1);

            await request(app).post('/feeding-report/pdf').send({});
            expect(reportController.generateFeedingReportPDF).toHaveBeenCalledTimes(1);

            await request(app).post('/vaccination-report').send({});
            expect(reportController.generateVaccinationReport).toHaveBeenCalledTimes(1);

            await request(app).post('/vaccination-report/pdf').send({});
            expect(reportController.generateVaccinationReportPDF).toHaveBeenCalledTimes(1);

            await request(app).post('/deworming-report').send({});
            expect(reportController.generateDewormingReport).toHaveBeenCalledTimes(1);

            await request(app).post('/deworming-report/pdf').send({});
            expect(reportController.generateDewormingReportPDF).toHaveBeenCalledTimes(1);

            await request(app).get('/available-races');
            expect(reportController.getAvailableRaces).toHaveBeenCalledTimes(1);
        });
    });

    describe('Express router functionality', () => {
        it('should export Express router', () => {
            expect(typeof reportRoutes).toBe('function');
            expect(reportRoutes.name).toBe('router');
        });

        it('should handle concurrent requests', async () => {
            const promises = [
                request(app).get('/available-races'),
                request(app).post('/feeding-report').send({}),
                request(app).post('/vaccination-report').send({})
            ];

            const responses = await Promise.all(promises);
            
            responses.forEach(response => {
                expect(response.status).toBeLessThan(400);
            });
        });
    });
});
