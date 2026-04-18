const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// Middleware específico para manejo de CORS en PDFs
const corsMiddleware = (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
};

// Aplicar middleware CORS a todas las rutas
router.use(corsMiddleware);

// Ruta para generar vista previa del reporte de alimentación
router.post('/feeding-report', reportController.generateFeedingReport);

// Ruta para generar y descargar el reporte de alimentación en PDF
router.post('/feeding-report/pdf', reportController.generateFeedingReportPDF);

// Ruta para generar vista previa del reporte de vacunación
router.post('/vaccination-report', reportController.generateVaccinationReport);

// Ruta para generar y descargar el reporte de vacunación en PDF
router.post('/vaccination-report/pdf', reportController.generateVaccinationReportPDF);

// Ruta para generar vista previa del reporte de desparasitación
router.post('/deworming-report', reportController.generateDewormingReport);

// Ruta para generar y descargar el reporte de desparasitación en PDF
router.post('/deworming-report/pdf', reportController.generateDewormingReportPDF);

// Ruta para obtener las razas disponibles para filtrar
router.get('/available-races', reportController.getAvailableRaces);

module.exports = router;
