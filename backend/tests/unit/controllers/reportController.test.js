const reportController = require('../../../src/controllers/reportController');
const Feeding = require('../../../src/models/feeding');
const Rabbit = require('../../../src/models/rabbit');
const Race = require('../../../src/models/race');
const AssignRabbit = require('../../../src/models/assignRabbit');
const Vaccination = require('../../../src/models/vaccination');
const Deworming = require('../../../src/models/deworming');
const puppeteer = require('puppeteer');
const htmlPdf = require('html-pdf-node');

// Mock de los modelos
jest.mock('../../../src/models/feeding');
jest.mock('../../../src/models/rabbit');
jest.mock('../../../src/models/race');
jest.mock('../../../src/models/assignRabbit');
jest.mock('../../../src/models/vaccination');
jest.mock('../../../src/models/deworming');

// Mock puppeteer y html-pdf-node
jest.mock('puppeteer', () => ({
    launch: jest.fn(),
}));
jest.mock('html-pdf-node', () => ({
    generatePdf: jest.fn(),
}));

describe('ReportController', () => {
    let req, res;

    // Mock helper functions
    const mockRequest = (params = {}, body = {}) => ({ params, body });
    const mockResponse = () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        res.set = jest.fn().mockReturnValue(res);
        res.send = jest.fn().mockReturnValue(res);
        res.setHeader = jest.fn().mockReturnValue(res);
        res.end = jest.fn().mockReturnValue(res);
        return res;
    };

    beforeEach(() => {
        req = mockRequest();
        res = mockResponse();
        jest.clearAllMocks();

        // Setup chainable mocks for Mongoose models
        const mockChain = {
            sort: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            populate: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([]),
        };

        // Mock Feeding model with chaining
        Feeding.find = jest.fn().mockReturnValue({
            ...mockChain,
            sort: jest.fn().mockResolvedValue([])
        });

        // Mock Vaccination model with chaining
        Vaccination.find = jest.fn().mockReturnValue({
            ...mockChain,
            sort: jest.fn().mockResolvedValue([])
        });

        // Mock Deworming model with chaining
        Deworming.find = jest.fn().mockReturnValue({
            ...mockChain,
            sort: jest.fn().mockResolvedValue([])
        });

        // Mock other models
        Rabbit.find = jest.fn().mockResolvedValue([]);
        Race.find = jest.fn().mockResolvedValue([]);
        AssignRabbit.find = jest.fn().mockResolvedValue([]);
    });

    describe('generateFeedingReport', () => {
        test('should return 400 when startDate is missing', async () => {
            req.body = {
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            await reportController.generateFeedingReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Las fechas de inicio y fin son obligatorias.'
            });
        });

        test('should return 400 when endDate is missing', async () => {
            req.body = {
                startDate: '2024-01-01',
                races: ['Nueva Zelanda']
            };

            await reportController.generateFeedingReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Las fechas de inicio y fin son obligatorias.'
            });
        });

        test('should return 400 when races is empty', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: []
            };

            await reportController.generateFeedingReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Debe seleccionar al menos una raza para generar el reporte.'
            });
        });

        test('should return 400 when endDate is before startDate', async () => {
            req.body = {
                startDate: '2024-01-31',
                endDate: '2024-01-01',
                races: ['Nueva Zelanda']
            };

            await reportController.generateFeedingReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'La fecha de fin del reporte no puede ser menor a la fecha de inicio del reporte.'
            });
        });

        test('should return 404 when no rabbits found', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            Rabbit.find.mockResolvedValue([]);

            await reportController.generateFeedingReport(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'No se encontraron conejos para las razas seleccionadas.'
            });
        });

        test('should return 404 when no feeding records found', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            const mockRabbits = [{ code: 'R001', race: 'Nueva Zelanda' }, { code: 'R002' }];
            Rabbit.find.mockResolvedValue(mockRabbits);
            
            // Mock the chained call
            Feeding.find = jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue([])
            });

            await reportController.generateFeedingReport(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'No se encontraron resultados para generar el reporte con los filtros aplicados.'
            });
        });

        test('should generate feeding report successfully', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            const mockRabbits = [{ code: 'R001', race: 'Nueva Zelanda' }, { code: 'R002' }];
            const mockFeedings = [
                {
                    codigo: 'R001',
                    fecha: new Date('2024-01-15'),
                    tipoAlimento: 'Pellets',
                    cantidad: 100
                }
            ];
            const mockAssignments = [
                { rabbitCode: 'R001', cageNumber: 'C001' }
            ];

            Rabbit.find.mockResolvedValue(mockRabbits);
            Feeding.find = jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockFeedings)
            });
            AssignRabbit.find.mockResolvedValue(mockAssignments);

            await reportController.generateFeedingReport(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    reportData: expect.objectContaining({
                        companyName: 'Holptolt'
                    })
                })
            );
        });

        test('should handle database errors', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            Rabbit.find.mockRejectedValue(new Error('Database error'));

            await reportController.generateFeedingReport(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error interno del servidor al generar el reporte.',
                error: 'Database error'
            });
        });
    });

    describe('generateFeedingReportPDF', () => {
        test('should return 400 when startDate is missing', async () => {
            req.body = {
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            await reportController.generateFeedingReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Las fechas de inicio y fin son obligatorias.'
            });
        });

        test('should return 400 when endDate is missing', async () => {
            req.body = {
                startDate: '2024-01-01',
                races: ['Nueva Zelanda']
            };

            await reportController.generateFeedingReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Las fechas de inicio y fin son obligatorias.'
            });
        });

        test('should return 400 when races is empty', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: []
            };

            await reportController.generateFeedingReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Debe seleccionar al menos una raza para generar el reporte.'
            });
        });

        test('should return 400 when endDate is before startDate', async () => {
            req.body = {
                startDate: '2024-01-31',
                endDate: '2024-01-01',
                races: ['Nueva Zelanda']
            };

            await reportController.generateFeedingReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'La fecha de fin del reporte no puede ser menor a la fecha de inicio del reporte.'
            });
        });

        test('should return 404 when no rabbits found', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            Rabbit.find.mockResolvedValue([]);

            await reportController.generateFeedingReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'No se encontraron conejos para las razas seleccionadas.'
            });
        });

        test('should return 404 when no feeding records found', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            const mockRabbits = [{ code: 'R001', race: 'Nueva Zelanda' }];
            Rabbit.find.mockResolvedValue(mockRabbits);
            
            Feeding.find = jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue([])
            });

            await reportController.generateFeedingReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'No se encontraron resultados para generar el reporte con los filtros aplicados.'
            });
        });

        test('should generate PDF successfully', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            const mockRabbits = [{ code: 'R001', race: 'Nueva Zelanda' }];
            const mockFeedings = [
                {
                    codigo: 'R001',
                    fecha: new Date('2024-01-15'),
                    tipoAlimento: 'Pellets',
                    cantidad: 100
                }
            ];
            const mockAssignments = [
                { rabbitCode: 'R001', cageNumber: 'C001' }
            ];

            Rabbit.find.mockResolvedValue(mockRabbits);
            Feeding.find = jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockFeedings)
            });
            AssignRabbit.find.mockResolvedValue(mockAssignments);
            
            htmlPdf.generatePdf.mockResolvedValue({ buffer: Buffer.from('mock-pdf') });

            await reportController.generateFeedingReportPDF(req, res);

            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
            expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('attachment; filename='));
            expect(res.end).toHaveBeenCalled();
        });

        test('should handle database errors', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            Rabbit.find.mockRejectedValue(new Error('Database error'));

            await reportController.generateFeedingReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al generar el PDF del reporte.',
                error: 'Database error'
            });
        });

        test('should handle PDF generation errors', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            const mockRabbits = [{ code: 'R001', race: 'Nueva Zelanda' }];
            const mockFeedings = [
                {
                    codigo: 'R001',
                    fecha: new Date('2024-01-15'),
                    tipoAlimento: 'Pellets',
                    cantidad: 100
                }
            ];

            Rabbit.find.mockResolvedValue(mockRabbits);
            Feeding.find = jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockFeedings)
            });
            AssignRabbit.find.mockResolvedValue([]);
            
            htmlPdf.generatePdf.mockRejectedValue(new Error('PDF generation error'));

            await reportController.generateFeedingReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al generar el PDF del reporte.',
                error: 'No se pudo generar el PDF con ninguna de las bibliotecas disponibles'
            });
        });
    });

    describe('getAvailableRaces', () => {
        test('should return available races successfully', async () => {
            const mockRaces = [
                { name: 'Nueva Zelanda' },
                { name: 'California' }
            ];

            Race.find.mockResolvedValue(mockRaces);

            await reportController.getAvailableRaces(req, res);

            expect(res.json).toHaveBeenCalledWith({
                races: ['Nueva Zelanda', 'California']
            });
        });

        test('should handle database errors', async () => {
            Race.find.mockRejectedValue(new Error('Database error'));

            await reportController.getAvailableRaces(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al obtener las razas disponibles.',
                error: 'Database error'
            });
        });
    });

    describe('generateVaccinationReport', () => {
        test('should return 400 when startDate is missing', async () => {
            req.body = {
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            await reportController.generateVaccinationReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Las fechas de inicio y fin son obligatorias.'
            });
        });

        test('should return 400 when endDate is missing', async () => {
            req.body = {
                startDate: '2024-01-01',
                races: ['Nueva Zelanda']
            };

            await reportController.generateVaccinationReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Las fechas de inicio y fin son obligatorias.'
            });
        });

        test('should return 400 when races is not provided', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31'
            };

            await reportController.generateVaccinationReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Debe seleccionar al menos una raza para generar el reporte.'
            });
        });

        test('should return 400 when races is empty', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: []
            };

            await reportController.generateVaccinationReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Debe seleccionar al menos una raza para generar el reporte.'
            });
        });

        test('should return 400 when endDate is before startDate', async () => {
            req.body = {
                startDate: '2024-01-31',
                endDate: '2024-01-01',
                races: ['Nueva Zelanda']
            };

            await reportController.generateVaccinationReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'La fecha de fin del reporte no puede ser menor a la fecha de inicio del reporte.'
            });
        });

        test('should return 404 when no rabbits found', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            Rabbit.find.mockResolvedValue([]);

            await reportController.generateVaccinationReport(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'No se encontraron conejos para las razas seleccionadas.'
            });
        });

        test('should return 404 when no vaccination records found', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            const mockRabbits = [{ code: 'R001', race: 'Nueva Zelanda' }];
            Rabbit.find.mockResolvedValue(mockRabbits);
            
            Vaccination.find = jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue([])
            });

            await reportController.generateVaccinationReport(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'No se encontraron resultados para generar el reporte con los filtros aplicados.'
            });
        });

        test('should generate vaccination report successfully', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            const mockRabbits = [{ code: 'R001', race: 'Nueva Zelanda' }];
            const mockVaccinations = [
                {
                    codigo: 'R001',
                    fecha: new Date('2024-01-15'),
                    mixomatosis: true,
                    vhd: false
                }
            ];
            const mockAssignments = [
                { rabbitCode: 'R001', cageNumber: 'C001' }
            ];

            Rabbit.find.mockResolvedValue(mockRabbits);
            Vaccination.find = jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockVaccinations)
            });
            AssignRabbit.find.mockResolvedValue(mockAssignments);

            await reportController.generateVaccinationReport(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    reportData: expect.objectContaining({
                        companyName: 'Holptolt'
                    })
                })
            );
        });

        test('should handle database errors', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            Rabbit.find.mockRejectedValue(new Error('Database error'));

            await reportController.generateVaccinationReport(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error interno del servidor al generar el reporte.',
                error: 'Database error'
            });
        });
    });

    describe('generateVaccinationReportPDF', () => {
        test('should return 400 when startDate is missing', async () => {
            req.body = {
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            await reportController.generateVaccinationReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Las fechas de inicio y fin son obligatorias.'
            });
        });

        test('should return 400 when endDate is missing', async () => {
            req.body = {
                startDate: '2024-01-01',
                races: ['Nueva Zelanda']
            };

            await reportController.generateVaccinationReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Las fechas de inicio y fin son obligatorias.'
            });
        });

        test('should return 400 when races is not provided', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31'
            };

            await reportController.generateVaccinationReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Debe seleccionar al menos una raza para generar el reporte.'
            });
        });

        test('should return 400 when races is empty', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: []
            };

            await reportController.generateVaccinationReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Debe seleccionar al menos una raza para generar el reporte.'
            });
        });

        test('should return 400 when endDate is before startDate', async () => {
            req.body = {
                startDate: '2024-01-31',
                endDate: '2024-01-01',
                races: ['Nueva Zelanda']
            };

            await reportController.generateVaccinationReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'La fecha de fin del reporte no puede ser menor a la fecha de inicio del reporte.'
            });
        });

        test('should return 404 when no rabbits found', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            Rabbit.find.mockResolvedValue([]);

            await reportController.generateVaccinationReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'No se encontraron conejos para las razas seleccionadas.'
            });
        });

        test('should return 404 when no vaccination records found', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            const mockRabbits = [{ code: 'R001', race: 'Nueva Zelanda' }];
            Rabbit.find.mockResolvedValue(mockRabbits);
            
            Vaccination.find = jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue([])
            });

            await reportController.generateVaccinationReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'No se encontraron resultados para generar el reporte con los filtros aplicados.'
            });
        });

        test('should generate PDF successfully', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            const mockRabbits = [{ code: 'R001', race: 'Nueva Zelanda' }];
            const mockVaccinations = [
                {
                    codigo: 'R001',
                    fecha: new Date('2024-01-15'),
                    mixomatosis: true,
                    vhd: false
                }
            ];

            Rabbit.find.mockResolvedValue(mockRabbits);
            Vaccination.find = jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockVaccinations)
            });
            AssignRabbit.find.mockResolvedValue([]);
            
            htmlPdf.generatePdf.mockResolvedValue({ buffer: Buffer.from('mock-pdf') });

            await reportController.generateVaccinationReportPDF(req, res);

            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
            expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('attachment; filename='));
            expect(res.end).toHaveBeenCalled();
        });

        test('should handle database errors', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            Rabbit.find.mockRejectedValue(new Error('Database error'));

            await reportController.generateVaccinationReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al generar el PDF del reporte de vacunación.',
                error: 'Database error'
            });
        });

        test('should handle PDF generation errors', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            const mockRabbits = [{ code: 'R001', race: 'Nueva Zelanda' }];
            const mockVaccinations = [
                {
                    codigo: 'R001',
                    fecha: new Date('2024-01-15'),
                    mixomatosis: true,
                    vhd: false
                }
            ];

            Rabbit.find.mockResolvedValue(mockRabbits);
            Vaccination.find = jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockVaccinations)
            });
            AssignRabbit.find.mockResolvedValue([]);
            
            htmlPdf.generatePdf.mockRejectedValue(new Error('PDF generation error'));

            await reportController.generateVaccinationReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al generar el PDF del reporte de vacunación.',
                error: 'No se pudo generar el PDF con ninguna de las bibliotecas disponibles'
            });
        });
    });

    describe('generateDewormingReport', () => {
        test('should return 400 when startDate is missing', async () => {
            req.body = {
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            await reportController.generateDewormingReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Las fechas de inicio y fin son obligatorias.'
            });
        });

        test('should return 400 when endDate is missing', async () => {
            req.body = {
                startDate: '2024-01-01',
                races: ['Nueva Zelanda']
            };

            await reportController.generateDewormingReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Las fechas de inicio y fin son obligatorias.'
            });
        });

        test('should return 400 when races is empty', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: []
            };

            await reportController.generateDewormingReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Debe seleccionar al menos una raza para generar el reporte.'
            });
        });

        test('should return 400 when races is not provided', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31'
            };

            await reportController.generateDewormingReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Debe seleccionar al menos una raza para generar el reporte.'
            });
        });

        test('should return 400 when endDate is before startDate', async () => {
            req.body = {
                startDate: '2024-01-31',
                endDate: '2024-01-01',
                races: ['Nueva Zelanda']
            };

            await reportController.generateDewormingReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'La fecha de fin del reporte no puede ser menor a la fecha de inicio del reporte.'
            });
        });

        test('should return 404 when no rabbits found', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            Rabbit.find.mockResolvedValue([]);

            await reportController.generateDewormingReport(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'No se encontraron conejos para las razas seleccionadas.'
            });
        });

        test('should return 404 when no deworming records found', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            const mockRabbits = [{ code: 'R001', race: 'Nueva Zelanda' }];
            Rabbit.find.mockResolvedValue(mockRabbits);
            
            Deworming.find = jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue([])
            });

            await reportController.generateDewormingReport(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'No se encontraron resultados para generar el reporte con los filtros aplicados.'
            });
        });

        test('should generate deworming report successfully', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            const mockRabbits = [{ code: 'R001', race: 'Nueva Zelanda' }];
            const mockDewormings = [
                {
                    codigo: 'R001',
                    fecha: new Date('2024-01-15'),
                    tipoDesparasitante: 'Ivermectina',
                    dosis: '0.2ml',
                    desparasitacion: true
                }
            ];
            const mockAssignments = [
                { rabbitCode: 'R001', cageNumber: 'C001' }
            ];

            Rabbit.find.mockResolvedValue(mockRabbits);
            Deworming.find = jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockDewormings)
            });
            AssignRabbit.find.mockResolvedValue(mockAssignments);

            await reportController.generateDewormingReport(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    reportData: expect.objectContaining({
                        companyName: 'Holptolt'
                    })
                })
            );
        });

        test('should handle database errors', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            Rabbit.find.mockRejectedValue(new Error('Database error'));

            await reportController.generateDewormingReport(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error interno del servidor al generar el reporte.',
                error: 'Database error'
            });
        });
    });

    describe('generateDewormingReportPDF', () => {
        test('should return 400 when startDate is missing', async () => {
            req.body = {
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            await reportController.generateDewormingReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Las fechas de inicio y fin son obligatorias.'
            });
        });

        test('should return 400 when endDate is missing', async () => {
            req.body = {
                startDate: '2024-01-01',
                races: ['Nueva Zelanda']
            };

            await reportController.generateDewormingReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Las fechas de inicio y fin son obligatorias.'
            });
        });

        test('should return 400 when races is empty', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: []
            };

            await reportController.generateDewormingReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Debe seleccionar al menos una raza para generar el reporte.'
            });
        });

        test('should return 400 when races is not provided', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31'
            };

            await reportController.generateDewormingReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Debe seleccionar al menos una raza para generar el reporte.'
            });
        });

        test('should return 400 when endDate is before startDate', async () => {
            req.body = {
                startDate: '2024-01-31',
                endDate: '2024-01-01',
                races: ['Nueva Zelanda']
            };

            await reportController.generateDewormingReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'La fecha de fin del reporte no puede ser menor a la fecha de inicio del reporte.'
            });
        });

        test('should return 404 when no rabbits found', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            Rabbit.find.mockResolvedValue([]);

            await reportController.generateDewormingReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'No se encontraron conejos para las razas seleccionadas.'
            });
        });

        test('should return 404 when no deworming records found', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            const mockRabbits = [{ code: 'R001', race: 'Nueva Zelanda' }];
            Rabbit.find.mockResolvedValue(mockRabbits);
            Deworming.find = jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue([])
            });

            await reportController.generateDewormingReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'No se encontraron resultados para generar el reporte con los filtros aplicados.'
            });
        });

        test('should generate PDF successfully', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            const mockRabbits = [{ code: 'R001', race: 'Nueva Zelanda' }];
            const mockDewormings = [
                {
                    codigo: 'R001',
                    fecha: new Date('2024-01-15'),
                    tipoDesparasitante: 'Ivermectina',
                    dosis: '0.2ml',
                    desparasitacion: true
                }
            ];

            Rabbit.find.mockResolvedValue(mockRabbits);
            Deworming.find = jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockDewormings)
            });
            AssignRabbit.find.mockResolvedValue([]);
            
            htmlPdf.generatePdf.mockResolvedValue({ buffer: Buffer.from('mock-pdf') });

            await reportController.generateDewormingReportPDF(req, res);

            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
            expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('attachment; filename='));
            expect(res.end).toHaveBeenCalled();
        });

        test('should handle database errors', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            Rabbit.find.mockRejectedValue(new Error('Database error'));

            await reportController.generateDewormingReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al generar el PDF del reporte de desparasitación.',
                error: 'Database error'
            });
        });

        test('should handle PDF generation errors', async () => {
            req.body = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                races: ['Nueva Zelanda']
            };

            const mockRabbits = [{ code: 'R001', race: 'Nueva Zelanda' }];
            const mockDewormings = [
                {
                    codigo: 'R001',
                    fecha: new Date('2024-01-15'),
                    tipoDesparasitante: 'Ivermectina',
                    dosis: '0.2ml',
                    desparasitacion: true
                }
            ];

            Rabbit.find.mockResolvedValue(mockRabbits);
            Deworming.find = jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockDewormings)
            });
            AssignRabbit.find.mockResolvedValue([]);
            
            htmlPdf.generatePdf.mockRejectedValue(new Error('PDF generation error'));

            await reportController.generateDewormingReportPDF(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error al generar el PDF del reporte de desparasitación.',
                error: 'No se pudo generar el PDF con ninguna de las bibliotecas disponibles'
            });
        });
    });
});
