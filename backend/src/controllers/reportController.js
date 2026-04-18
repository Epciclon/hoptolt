const Feeding = require('../models/feeding');
const Rabbit = require('../models/rabbit');
const Race = require('../models/race');
const AssignRabbit = require('../models/assignRabbit');
const Vaccination = require('../models/vaccination');
const Deworming = require('../models/deworming');
const puppeteer = require('puppeteer');
const htmlPdf = require('html-pdf-node');
const moment = require('moment');

// Configurar moment en español
moment.locale('es');

exports.generateFeedingReport = async (req, res) => {
    try {
        const { startDate, endDate, races } = req.body;
        const companyName = 'Holptolt'; // Empresa fija

        // Validaciones
        if (!startDate || !endDate) {
            return res.status(400).json({ 
                message: 'Las fechas de inicio y fin son obligatorias.' 
            });
        }

        if (!races || !Array.isArray(races) || races.length === 0) {
            return res.status(400).json({ 
                message: 'Debe seleccionar al menos una raza para generar el reporte.' 
            });
        }

        const fechaInicio = new Date(startDate);
        const fechaFin = new Date(endDate);

        // Validar que la fecha de fin no sea menor a la fecha de inicio
        if (fechaFin < fechaInicio) {
            return res.status(400).json({ 
                message: 'La fecha de fin del reporte no puede ser menor a la fecha de inicio del reporte.' 
            });
        }

        // Ajustar fechas para incluir todo el día
        const inicioBusqueda = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), fechaInicio.getDate());
        const finBusqueda = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), fechaFin.getDate() + 1);

        // Obtener conejos de las razas seleccionadas
        const conejos = await Rabbit.find({ race: { $in: races } });
        
        if (conejos.length === 0) {
            return res.status(404).json({ 
                message: 'No se encontraron conejos para las razas seleccionadas.' 
            });
        }

        const codigosConejos = conejos.map(conejo => conejo.code);

        // Consultar registros de alimentación en el rango de fechas
        const registrosAlimentacion = await Feeding.find({
            codigo: { $in: codigosConejos },
            fecha: {
                $gte: inicioBusqueda,
                $lt: finBusqueda
            }
        }).sort({ fecha: 1 });

        if (registrosAlimentacion.length === 0) {
            return res.status(404).json({ 
                message: 'No se encontraron resultados para generar el reporte con los filtros aplicados.' 
            });
        }

        // Obtener asignaciones de jaulas para los conejos
        const asignacionesJaulas = await AssignRabbit.find({ 
            rabbitCode: { $in: codigosConejos },
            status: 'asignado'
        });

        // Crear un mapa de conejos para acceso rápido
        const mapaConejos = {};
        conejos.forEach(conejo => {
            mapaConejos[conejo.code] = conejo;
        });

        // Crear un mapa de jaulas para acceso rápido
        const mapaJaulas = {};
        asignacionesJaulas.forEach(asignacion => {
            mapaJaulas[asignacion.rabbitCode] = asignacion.cageNumber;
        });

        // Procesar datos para el reporte
        const datosReporte = registrosAlimentacion.map(registro => {
            const conejo = mapaConejos[registro.codigo];
            const jaula = mapaJaulas[registro.codigo] || 'Sin asignar';
            return {
                codigo: registro.codigo,
                raza: conejo ? conejo.race : 'N/A',
                peso: conejo ? conejo.weight : 'N/A',
                jaula: jaula,
                fechaHora: moment(registro.fecha).format('DD/MM/YYYY HH:mm'),
                heno: registro.heno,
                hierba: registro.hierba,
                balanceado: registro.balanceado,
                justificacion: registro.justificacion || 'N/A'
            };
        });

        res.json({
            success: true,
            reportData: {
                companyName,
                startDate: moment(fechaInicio).format('DD/MM/YYYY'),
                endDate: moment(fechaFin).format('DD/MM/YYYY'),
                selectedRaces: races,
                data: datosReporte,
                totalRecords: datosReporte.length
            }
        });

    } catch (error) {
        console.error('Error al generar reporte de alimentación:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor al generar el reporte.', 
            error: error.message 
        });
    }
};

exports.generateFeedingReportPDF = async (req, res) => {
    try {
        const { startDate, endDate, races } = req.body;
        const companyName = 'Holptolt'; // Empresa fija

        // Validaciones (duplicamos la lógica para evitar problemas)
        if (!startDate || !endDate) {
            return res.status(400).json({ 
                message: 'Las fechas de inicio y fin son obligatorias.' 
            });
        }

        if (!races || !Array.isArray(races) || races.length === 0) {
            return res.status(400).json({ 
                message: 'Debe seleccionar al menos una raza para generar el reporte.' 
            });
        }

        const fechaInicio = new Date(startDate);
        const fechaFin = new Date(endDate);

        // Validar que la fecha de fin no sea menor a la fecha de inicio
        if (fechaFin < fechaInicio) {
            return res.status(400).json({ 
                message: 'La fecha de fin del reporte no puede ser menor a la fecha de inicio del reporte.' 
            });
        }

        // Ajustar fechas para incluir todo el día
        const inicioBusqueda = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), fechaInicio.getDate());
        const finBusqueda = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), fechaFin.getDate() + 1);

        // Obtener conejos de las razas seleccionadas
        const conejos = await Rabbit.find({ race: { $in: races } });
        
        if (conejos.length === 0) {
            return res.status(404).json({ 
                message: 'No se encontraron conejos para las razas seleccionadas.' 
            });
        }

        const codigosConejos = conejos.map(conejo => conejo.code);

        // Consultar registros de alimentación en el rango de fechas
        const registrosAlimentacion = await Feeding.find({
            codigo: { $in: codigosConejos },
            fecha: {
                $gte: inicioBusqueda,
                $lt: finBusqueda
            }
        }).sort({ fecha: 1 });

        if (registrosAlimentacion.length === 0) {
            return res.status(404).json({ 
                message: 'No se encontraron resultados para generar el reporte con los filtros aplicados.' 
            });
        }

        // Obtener asignaciones de jaulas para los conejos
        const asignacionesJaulas = await AssignRabbit.find({ 
            rabbitCode: { $in: codigosConejos },
            status: 'asignado'
        });

        // Crear un mapa de conejos para acceso rápido
        const mapaConejos = {};
        conejos.forEach(conejo => {
            mapaConejos[conejo.code] = conejo;
        });

        // Crear un mapa de jaulas para acceso rápido
        const mapaJaulas = {};
        asignacionesJaulas.forEach(asignacion => {
            mapaJaulas[asignacion.rabbitCode] = asignacion.cageNumber;
        });

        // Procesar datos para el reporte
        const datosReporte = registrosAlimentacion.map(registro => {
            const conejo = mapaConejos[registro.codigo];
            const jaula = mapaJaulas[registro.codigo] || 'Sin asignar';
            return {
                codigo: registro.codigo,
                raza: conejo ? conejo.race : 'N/A',
                peso: conejo ? conejo.weight : 'N/A',
                jaula: jaula,
                fechaHora: moment(registro.fecha).format('DD/MM/YYYY HH:mm'),
                heno: registro.heno,
                hierba: registro.hierba,
                balanceado: registro.balanceado,
                justificacion: registro.justificacion || 'N/A'
            };
        });

        const reportData = {
            companyName,
            startDate: moment(fechaInicio).format('DD/MM/YYYY'),
            endDate: moment(fechaFin).format('DD/MM/YYYY'),
            selectedRaces: races,
            data: datosReporte,
            totalRecords: datosReporte.length
        };

        // Generar HTML para el PDF
        const htmlContent = generateHTMLReport(reportData);
        console.log('HTML generado, longitud:', htmlContent.length);

        // Configurar Puppeteer
        let browser;
        let page;
        
        try {
            console.log('Iniciando Puppeteer...');
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });

            console.log('Puppeteer iniciado, creando página...');
            page = await browser.newPage();
            
            // Configurar el viewport y esperar a que el contenido se cargue
            await page.setViewport({ width: 1200, height: 800 });
            console.log('Cargando contenido HTML...');
            
            await page.setContent(htmlContent, { 
                waitUntil: ['networkidle0', 'domcontentloaded'],
                timeout: 30000
            });

            console.log('HTML cargado, generando PDF...');
            
            // Generar PDF con configuración mejorada
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '1cm',
                    right: '1cm',
                    bottom: '1cm',
                    left: '1cm'
                },
                preferCSSPageSize: true,
                displayHeaderFooter: false
            });

            console.log('PDF generado, tamaño:', pdfBuffer.length, 'bytes');

            await browser.close();

            // Verificar que el PDF se generó correctamente
            if (!pdfBuffer || pdfBuffer.length === 0) {
                throw new Error('El PDF generado está vacío');
            }

            console.log('PDF generado correctamente, configurando respuesta...');

            // Configurar headers para descarga
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="Reporte_Alimentacion_${moment().format('DDMMYYYY_HHmm')}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');

            console.log('Enviando PDF al cliente...');
            
            // Enviar el buffer directamente
            res.status(200);
            res.end(pdfBuffer, 'binary');

        } catch (pdfError) {
            console.error('Error específico al generar PDF con Puppeteer:', pdfError);
            if (browser) {
                await browser.close();
            }
            
            // Intentar con html-pdf-node como respaldo
            try {
                console.log('Intentando generar PDF con html-pdf-node...');
                
                const options = {
                    format: 'A4',
                    margin: {
                        top: '1cm',
                        right: '1cm',
                        bottom: '1cm',
                        left: '1cm'
                    },
                    printBackground: true,
                    displayHeaderFooter: false
                };

                const file = { content: htmlContent };
                const pdfBuffer = await htmlPdf.generatePdf(file, options);

                console.log('PDF generado con html-pdf-node, tamaño:', pdfBuffer.length, 'bytes');

                // Verificar que el PDF se generó correctamente
                if (!pdfBuffer || pdfBuffer.length === 0) {
                    throw new Error('El PDF generado está vacío');
                }

                console.log('PDF generado con html-pdf-node, configurando respuesta...');

                // Configurar headers para descarga
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="Reporte_Alimentacion_${moment().format('DDMMYYYY_HHmm')}.pdf"`);
                res.setHeader('Content-Length', pdfBuffer.length);
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');

                console.log('Enviando PDF al cliente...');
                
                // Enviar el buffer directamente
                res.status(200);
                res.end(pdfBuffer, 'binary');
                
            } catch (fallbackError) {
                console.error('Error también con html-pdf-node:', fallbackError);
                throw new Error('No se pudo generar el PDF con ninguna de las bibliotecas disponibles');
            }
        }

    } catch (error) {
        console.error('Error al generar PDF del reporte:', error);
        res.status(500).json({ 
            message: 'Error al generar el PDF del reporte.', 
            error: error.message 
        });
    }
};

// Función auxiliar para generar el HTML del reporte
function generateHTMLReport(reportData) {
    // Escapar caracteres especiales en los datos
    const escapeHtml = (text) => {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reporte de Alimentación de Conejos</title>
        <style>
            * {
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Arial', sans-serif;
                margin: 0;
                padding: 20px;
                color: #333;
                line-height: 1.4;
                background: #fff;
            }
            
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #4CAF50;
                padding-bottom: 15px;
                page-break-inside: avoid;
            }
            
            .header h1 {
                color: #4CAF50;
                margin: 0 0 10px 0;
                font-size: 24px;
                font-weight: bold;
            }
            
            .company-name {
                font-size: 18px;
                font-weight: bold;
                margin: 10px 0;
                color: #2E7D32;
            }
            
            .date-range {
                font-size: 14px;
                color: #666;
                margin: 5px 0;
            }
            
            .races-info {
                font-size: 12px;
                color: #666;
                margin: 5px 0;
            }
            
            .summary {
                background-color: #f5f5f5;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
                page-break-inside: avoid;
                border: 1px solid #ddd;
            }
            
            .summary h3 {
                margin: 0 0 10px 0;
                color: #4CAF50;
                font-size: 16px;
            }
            
            .summary p {
                margin: 5px 0;
                font-size: 14px;
            }
            
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                font-size: 10px;
                page-break-inside: auto;
            }
            
            th, td {
                border: 1px solid #ddd;
                padding: 6px 4px;
                text-align: left;
                vertical-align: top;
                word-wrap: break-word;
            }
            
            th {
                background-color: #4CAF50 !important;
                color: white !important;
                font-weight: bold;
                text-align: center;
                font-size: 9px;
                -webkit-print-color-adjust: exact;
                page-break-inside: avoid;
            }
            
            tbody tr {
                page-break-inside: avoid;
            }
            
            tr:nth-child(even) td {
                background-color: #f9f9f9 !important;
                -webkit-print-color-adjust: exact;
            }
            
            .center {
                text-align: center;
            }
            
            .number {
                text-align: right;
            }
            
            .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 10px;
                color: #666;
                page-break-inside: avoid;
                border-top: 1px solid #ddd;
                padding-top: 15px;
            }
            
            /* Ajustes para la tabla */
            .table-container {
                width: 100%;
                overflow: visible;
            }
            
            /* Evitar que las filas se rompan */
            @media print {
                tbody tr {
                    page-break-inside: avoid;
                }
                
                .header {
                    page-break-after: avoid;
                }
                
                .summary {
                    page-break-after: avoid;
                }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Reporte de Alimentación de Conejos</h1>
            <div class="company-name">Holptolt</div>
            <div class="date-range">
                Período: ${escapeHtml(reportData.startDate)} - ${escapeHtml(reportData.endDate)}
            </div>
            <div class="races-info">
                Razas incluidas: ${reportData.selectedRaces.map(race => escapeHtml(race)).join(', ')}
            </div>
        </div>

        <div class="summary">
            <h3>Resumen del Reporte</h3>
            <p><strong>Total de registros:</strong> ${reportData.totalRecords}</p>
            <p><strong>Fecha de generación:</strong> ${moment().format('DD/MM/YYYY HH:mm')}</p>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th style="width: 9%;">Código</th>
                        <th style="width: 11%;">Raza</th>
                        <th style="width: 7%;">Peso (kg)</th>
                        <th style="width: 7%;">Jaula</th>
                        <th style="width: 13%;">Fecha y Hora</th>
                        <th style="width: 9%;">Heno (gr)</th>
                        <th style="width: 9%;">Hierba (gr)</th>
                        <th style="width: 11%;">Balanceado (gr)</th>
                        <th style="width: 24%;">Justificación</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.data.map(row => `
                        <tr>
                            <td class="center">${escapeHtml(row.codigo)}</td>
                            <td>${escapeHtml(row.raza)}</td>
                            <td class="number">${escapeHtml(row.peso)}</td>
                            <td class="center">${escapeHtml(row.jaula)}</td>
                            <td class="center">${escapeHtml(row.fechaHora)}</td>
                            <td class="number">${escapeHtml(row.heno)}</td>
                            <td class="number">${escapeHtml(row.hierba)}</td>
                            <td class="number">${escapeHtml(row.balanceado)}</td>
                            <td>${escapeHtml(row.justificacion)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>Reporte generado automáticamente por el Sistema de Gestión de Conejos</p>
        </div>
    </body>
    </html>
    `;
}

// Función para obtener las razas disponibles (endpoint auxiliar)
exports.getAvailableRaces = async (req, res) => {
    try {
        const races = await Race.find({}, { name: 1, _id: 0 });
        res.json({ races: races.map(race => race.name) });
    } catch (error) {
        console.error('Error al obtener razas:', error);
        res.status(500).json({ 
            message: 'Error al obtener las razas disponibles.', 
            error: error.message 
        });
    }
};

// ==================== REPORTE DE VACUNACIÓN ====================

exports.generateVaccinationReport = async (req, res) => {
    try {
        const { startDate, endDate, races } = req.body;
        const companyName = 'Holptolt'; // Empresa fija

        // Validaciones
        if (!startDate || !endDate) {
            return res.status(400).json({ 
                message: 'Las fechas de inicio y fin son obligatorias.' 
            });
        }

        if (!races || !Array.isArray(races) || races.length === 0) {
            return res.status(400).json({ 
                message: 'Debe seleccionar al menos una raza para generar el reporte.' 
            });
        }

        const fechaInicio = new Date(startDate);
        const fechaFin = new Date(endDate);

        // Validar que la fecha de fin no sea menor a la fecha de inicio
        if (fechaFin < fechaInicio) {
            return res.status(400).json({ 
                message: 'La fecha de fin del reporte no puede ser menor a la fecha de inicio del reporte.' 
            });
        }

        // Ajustar fechas para incluir todo el día
        const inicioBusqueda = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), fechaInicio.getDate());
        const finBusqueda = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), fechaFin.getDate() + 1);

        // Obtener conejos de las razas seleccionadas
        const conejos = await Rabbit.find({ race: { $in: races } });
        
        if (conejos.length === 0) {
            return res.status(404).json({ 
                message: 'No se encontraron conejos para las razas seleccionadas.' 
            });
        }

        const codigosConejos = conejos.map(conejo => conejo.code);

        // Consultar registros de vacunación en el rango de fechas
        const registrosVacunacion = await Vaccination.find({
            codigo: { $in: codigosConejos },
            fecha: {
                $gte: inicioBusqueda,
                $lt: finBusqueda
            }
        }).sort({ fecha: 1 });

        if (registrosVacunacion.length === 0) {
            return res.status(404).json({ 
                message: 'No se encontraron resultados para generar el reporte con los filtros aplicados.' 
            });
        }

        // Obtener asignaciones de jaulas para los conejos
        const asignacionesJaulas = await AssignRabbit.find({ 
            rabbitCode: { $in: codigosConejos },
            status: 'asignado'
        });

        // Crear un mapa de conejos para acceso rápido
        const mapaConejos = {};
        conejos.forEach(conejo => {
            mapaConejos[conejo.code] = conejo;
        });

        // Crear un mapa de jaulas para acceso rápido
        const mapaJaulas = {};
        asignacionesJaulas.forEach(asignacion => {
            mapaJaulas[asignacion.rabbitCode] = asignacion.cageNumber;
        });

        // Procesar datos para el reporte
        const datosReporte = registrosVacunacion.map(registro => {
            const conejo = mapaConejos[registro.codigo];
            const jaula = mapaJaulas[registro.codigo] || 'Sin asignar';
            
            // Construir lista de vacunas aplicadas
            const vacunasAplicadas = [];
            if (registro.mixomatosis) {
                vacunasAplicadas.push('Mixomatosis');
            }
            if (registro.vhd) {
                vacunasAplicadas.push('VHD (Enfermedad Hemorrágica Vírica)');
            }
            
            return {
                codigo: registro.codigo,
                raza: conejo ? conejo.race : 'N/A',
                jaula: jaula,
                fecha: moment(registro.fecha).format('DD/MM/YYYY'),
                vacunasAplicadas: vacunasAplicadas.length > 0 ? vacunasAplicadas.join(', ') : 'Ninguna'
            };
        });

        // Filtrar solo registros que tienen vacunas aplicadas (según especificación)
        const datosReporteFiltrados = datosReporte.filter(registro => registro.vacunasAplicadas !== 'Ninguna');

        if (datosReporteFiltrados.length === 0) {
            return res.status(404).json({ 
                message: 'No se encontraron vacunas aplicadas en el período seleccionado.' 
            });
        }

        res.json({
            success: true,
            reportData: {
                companyName,
                startDate: moment(fechaInicio).format('DD/MM/YYYY'),
                endDate: moment(fechaFin).format('DD/MM/YYYY'),
                selectedRaces: races,
                data: datosReporteFiltrados,
                totalRecords: datosReporteFiltrados.length
            }
        });

    } catch (error) {
        console.error('Error al generar reporte de vacunación:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor al generar el reporte.', 
            error: error.message 
        });
    }
};

exports.generateVaccinationReportPDF = async (req, res) => {
    try {
        const { startDate, endDate, races } = req.body;
        const companyName = 'Holptolt'; // Empresa fija

        // Validaciones (duplicamos la lógica para evitar problemas)
        if (!startDate || !endDate) {
            return res.status(400).json({ 
                message: 'Las fechas de inicio y fin son obligatorias.' 
            });
        }

        if (!races || !Array.isArray(races) || races.length === 0) {
            return res.status(400).json({ 
                message: 'Debe seleccionar al menos una raza para generar el reporte.' 
            });
        }

        const fechaInicio = new Date(startDate);
        const fechaFin = new Date(endDate);

        // Validar que la fecha de fin no sea menor a la fecha de inicio
        if (fechaFin < fechaInicio) {
            return res.status(400).json({ 
                message: 'La fecha de fin del reporte no puede ser menor a la fecha de inicio del reporte.' 
            });
        }

        // Ajustar fechas para incluir todo el día
        const inicioBusqueda = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), fechaInicio.getDate());
        const finBusqueda = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), fechaFin.getDate() + 1);

        // Obtener conejos de las razas seleccionadas
        const conejos = await Rabbit.find({ race: { $in: races } });
        
        if (conejos.length === 0) {
            return res.status(404).json({ 
                message: 'No se encontraron conejos para las razas seleccionadas.' 
            });
        }

        const codigosConejos = conejos.map(conejo => conejo.code);

        // Consultar registros de vacunación en el rango de fechas
        const registrosVacunacion = await Vaccination.find({
            codigo: { $in: codigosConejos },
            fecha: {
                $gte: inicioBusqueda,
                $lt: finBusqueda
            }
        }).sort({ fecha: 1 });

        if (registrosVacunacion.length === 0) {
            return res.status(404).json({ 
                message: 'No se encontraron resultados para generar el reporte con los filtros aplicados.' 
            });
        }

        // Obtener asignaciones de jaulas para los conejos
        const asignacionesJaulas = await AssignRabbit.find({ 
            rabbitCode: { $in: codigosConejos },
            status: 'asignado'
        });

        // Crear un mapa de conejos para acceso rápido
        const mapaConejos = {};
        conejos.forEach(conejo => {
            mapaConejos[conejo.code] = conejo;
        });

        // Crear un mapa de jaulas para acceso rápido
        const mapaJaulas = {};
        asignacionesJaulas.forEach(asignacion => {
            mapaJaulas[asignacion.rabbitCode] = asignacion.cageNumber;
        });

        // Procesar datos para el reporte
        const datosReporte = registrosVacunacion.map(registro => {
            const conejo = mapaConejos[registro.codigo];
            const jaula = mapaJaulas[registro.codigo] || 'Sin asignar';
            
            // Construir lista de vacunas aplicadas
            const vacunasAplicadas = [];
            if (registro.mixomatosis) {
                vacunasAplicadas.push('Mixomatosis');
            }
            if (registro.vhd) {
                vacunasAplicadas.push('VHD (Enfermedad Hemorrágica Vírica)');
            }
            
            return {
                codigo: registro.codigo,
                raza: conejo ? conejo.race : 'N/A',
                jaula: jaula,
                fecha: moment(registro.fecha).format('DD/MM/YYYY'),
                vacunasAplicadas: vacunasAplicadas.length > 0 ? vacunasAplicadas.join(', ') : 'Ninguna'
            };
        });

        // Filtrar solo registros que tienen vacunas aplicadas (según especificación)
        const datosReporteFiltrados = datosReporte.filter(registro => registro.vacunasAplicadas !== 'Ninguna');

        if (datosReporteFiltrados.length === 0) {
            return res.status(404).json({ 
                message: 'No se encontraron vacunas aplicadas en el período seleccionado.' 
            });
        }

        const reportData = {
            companyName,
            startDate: moment(fechaInicio).format('DD/MM/YYYY'),
            endDate: moment(fechaFin).format('DD/MM/YYYY'),
            selectedRaces: races,
            data: datosReporteFiltrados,
            totalRecords: datosReporteFiltrados.length
        };

        // Generar HTML para el PDF
        const htmlContent = generateVaccinationHTMLReport(reportData);
        console.log('HTML de vacunación generado, longitud:', htmlContent.length);

        // Configurar Puppeteer
        let browser;
        let page;
        
        try {
            console.log('Iniciando Puppeteer para reporte de vacunación...');
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });

            console.log('Puppeteer iniciado, creando página...');
            page = await browser.newPage();
            
            // Configurar el viewport y esperar a que el contenido se cargue
            await page.setViewport({ width: 1200, height: 800 });
            console.log('Cargando contenido HTML...');
            
            await page.setContent(htmlContent, { 
                waitUntil: ['networkidle0', 'domcontentloaded'],
                timeout: 30000
            });

            console.log('HTML cargado, generando PDF...');
            
            // Generar PDF con configuración mejorada
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '1cm',
                    right: '1cm',
                    bottom: '1cm',
                    left: '1cm'
                },
                preferCSSPageSize: true,
                displayHeaderFooter: false
            });

            console.log('PDF de vacunación generado, tamaño:', pdfBuffer.length, 'bytes');

            await browser.close();

            // Verificar que el PDF se generó correctamente
            if (!pdfBuffer || pdfBuffer.length === 0) {
                throw new Error('El PDF generado está vacío');
            }

            console.log('PDF generado correctamente, configurando respuesta...');

            // Configurar headers para descarga
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="Reporte_Vacunacion_${moment().format('DDMMYYYY_HHmm')}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');

            console.log('Enviando PDF al cliente...');
            
            // Enviar el buffer directamente
            res.status(200);
            res.end(pdfBuffer, 'binary');

        } catch (pdfError) {
            console.error('Error específico al generar PDF con Puppeteer:', pdfError);
            if (browser) {
                await browser.close();
            }
            
            // Intentar con html-pdf-node como respaldo
            try {
                console.log('Intentando generar PDF con html-pdf-node...');
                
                const options = {
                    format: 'A4',
                    margin: {
                        top: '1cm',
                        right: '1cm',
                        bottom: '1cm',
                        left: '1cm'
                    },
                    printBackground: true,
                    displayHeaderFooter: false
                };

                const file = { content: htmlContent };
                const pdfBuffer = await htmlPdf.generatePdf(file, options);

                console.log('PDF de vacunación generado con html-pdf-node, tamaño:', pdfBuffer.length, 'bytes');

                // Verificar que el PDF se generó correctamente
                if (!pdfBuffer || pdfBuffer.length === 0) {
                    throw new Error('El PDF generado está vacío');
                }

                console.log('PDF generado con html-pdf-node, configurando respuesta...');

                // Configurar headers para descarga
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="Reporte_Vacunacion_${moment().format('DDMMYYYY_HHmm')}.pdf"`);
                res.setHeader('Content-Length', pdfBuffer.length);
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');

                console.log('Enviando PDF al cliente...');
                
                // Enviar el buffer directamente
                res.status(200);
                res.end(pdfBuffer, 'binary');
                
            } catch (fallbackError) {
                console.error('Error también con html-pdf-node:', fallbackError);
                throw new Error('No se pudo generar el PDF con ninguna de las bibliotecas disponibles');
            }
        }

    } catch (error) {
        console.error('Error al generar PDF del reporte de vacunación:', error);
        res.status(500).json({ 
            message: 'Error al generar el PDF del reporte de vacunación.', 
            error: error.message 
        });
    }
};

// Función auxiliar para generar el HTML del reporte de vacunación
function generateVaccinationHTMLReport(reportData) {
    // Escapar caracteres especiales en los datos
    const escapeHtml = (text) => {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reporte de Vacunas</title>
        <style>
            * {
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Arial', sans-serif;
                margin: 0;
                padding: 20px;
                color: #333;
                line-height: 1.4;
                background: #fff;
            }
            
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #4CAF50;
                padding-bottom: 15px;
                page-break-inside: avoid;
            }
            
            .header h1 {
                color: #4CAF50;
                margin: 0 0 10px 0;
                font-size: 24px;
                font-weight: bold;
            }
            
            .company-name {
                font-size: 18px;
                font-weight: bold;
                margin: 10px 0;
                color: #2E7D32;
            }
            
            .date-range {
                font-size: 14px;
                color: #666;
                margin: 5px 0;
            }
            
            .races-info {
                font-size: 12px;
                color: #666;
                margin: 5px 0;
            }
            
            .summary {
                background-color: #f5f5f5;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
                page-break-inside: avoid;
                border: 1px solid #ddd;
            }
            
            .summary h3 {
                margin: 0 0 10px 0;
                color: #4CAF50;
                font-size: 16px;
            }
            
            .summary p {
                margin: 5px 0;
                font-size: 14px;
            }
            
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                font-size: 11px;
                page-break-inside: auto;
            }
            
            th, td {
                border: 1px solid #ddd;
                padding: 8px 6px;
                text-align: left;
                vertical-align: top;
                word-wrap: break-word;
            }
            
            th {
                background-color: #4CAF50 !important;
                color: white !important;
                font-weight: bold;
                text-align: center;
                font-size: 10px;
                -webkit-print-color-adjust: exact;
                page-break-inside: avoid;
            }
            
            tbody tr {
                page-break-inside: avoid;
            }
            
            tr:nth-child(even) td {
                background-color: #f9f9f9 !important;
                -webkit-print-color-adjust: exact;
            }
            
            .center {
                text-align: center;
            }
            
            .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 10px;
                color: #666;
                page-break-inside: avoid;
                border-top: 1px solid #ddd;
                padding-top: 15px;
            }
            
            /* Ajustes para la tabla */
            .table-container {
                width: 100%;
                overflow: visible;
            }
            
            /* Evitar que las filas se rompan */
            @media print {
                tbody tr {
                    page-break-inside: avoid;
                }
                
                .header {
                    page-break-after: avoid;
                }
                
                .summary {
                    page-break-after: avoid;
                }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Reporte de Vacunas</h1>
            <div class="company-name">Holptolt</div>
            <div class="date-range">
                Período: ${escapeHtml(reportData.startDate)} - ${escapeHtml(reportData.endDate)}
            </div>
            <div class="races-info">
                Razas incluidas: ${reportData.selectedRaces.map(race => escapeHtml(race)).join(', ')}
            </div>
        </div>

        <div class="summary">
            <h3>Resumen del Reporte</h3>
            <p><strong>Total de registros:</strong> ${reportData.totalRecords}</p>
            <p><strong>Fecha de generación:</strong> ${moment().format('DD/MM/YYYY HH:mm')}</p>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th style="width: 15%;">Jaula</th>
                        <th style="width: 15%;">Código de Conejo</th>
                        <th style="width: 20%;">Raza</th>
                        <th style="width: 15%;">Fecha</th>
                        <th style="width: 35%;">Vacunas Aplicadas</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.data.map(row => `
                        <tr>
                            <td class="center">${escapeHtml(row.jaula)}</td>
                            <td class="center">${escapeHtml(row.codigo)}</td>
                            <td>${escapeHtml(row.raza)}</td>
                            <td class="center">${escapeHtml(row.fecha)}</td>
                            <td>${escapeHtml(row.vacunasAplicadas)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>Reporte generado automáticamente por el Sistema de Gestión de Conejos</p>
        </div>
    </body>
    </html>
    `;
}

// ==================== REPORTE DE DESPARASITACIÓN ====================

exports.generateDewormingReport = async (req, res) => {
    try {
        const { startDate, endDate, races } = req.body;
        const companyName = 'Holptolt'; // Empresa fija

        // Validaciones
        if (!startDate || !endDate) {
            return res.status(400).json({ 
                message: 'Las fechas de inicio y fin son obligatorias.' 
            });
        }

        if (!races || !Array.isArray(races) || races.length === 0) {
            return res.status(400).json({ 
                message: 'Debe seleccionar al menos una raza para generar el reporte.' 
            });
        }

        const fechaInicio = new Date(startDate);
        const fechaFin = new Date(endDate);

        // Validar que la fecha de fin no sea menor a la fecha de inicio
        if (fechaFin < fechaInicio) {
            return res.status(400).json({ 
                message: 'La fecha de fin del reporte no puede ser menor a la fecha de inicio del reporte.' 
            });
        }

        // Ajustar fechas para incluir todo el día
        const inicioBusqueda = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), fechaInicio.getDate());
        const finBusqueda = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), fechaFin.getDate() + 1);

        // Obtener conejos de las razas seleccionadas
        const conejos = await Rabbit.find({ race: { $in: races } });
        
        if (conejos.length === 0) {
            return res.status(404).json({ 
                message: 'No se encontraron conejos para las razas seleccionadas.' 
            });
        }

        const codigosConejos = conejos.map(conejo => conejo.code);

        // Consultar registros de desparasitación en el rango de fechas
        const registrosDesparasitacion = await Deworming.find({
            codigo: { $in: codigosConejos },
            fecha: {
                $gte: inicioBusqueda,
                $lt: finBusqueda
            }
        }).sort({ fecha: 1 });

        if (registrosDesparasitacion.length === 0) {
            return res.status(404).json({ 
                message: 'No se encontraron resultados para generar el reporte con los filtros aplicados.' 
            });
        }

        // Obtener asignaciones de jaulas para los conejos
        const asignacionesJaulas = await AssignRabbit.find({ 
            rabbitCode: { $in: codigosConejos },
            status: 'asignado'
        });

        // Crear un mapa de conejos para acceso rápido
        const mapaConejos = {};
        conejos.forEach(conejo => {
            mapaConejos[conejo.code] = conejo;
        });

        // Crear un mapa de jaulas para acceso rápido
        const mapaJaulas = {};
        asignacionesJaulas.forEach(asignacion => {
            mapaJaulas[asignacion.rabbitCode] = asignacion.cageNumber;
        });

        // Procesar datos para el reporte
        const datosReporte = registrosDesparasitacion.map(registro => {
            const conejo = mapaConejos[registro.codigo];
            const jaula = mapaJaulas[registro.codigo] || 'Sin asignar';
            
            return {
                codigo: registro.codigo,
                raza: conejo ? conejo.race : 'N/A',
                jaula: jaula,
                fecha: moment(registro.fecha).format('DD/MM/YYYY'),
                desparasitacion: registro.desparasitacion ? 'Sí' : 'No'
            };
        });

        // Filtrar solo registros que tienen desparasitación aplicada (según especificación)
        const datosReporteFiltrados = datosReporte.filter(registro => registro.desparasitacion === 'Sí');

        if (datosReporteFiltrados.length === 0) {
            return res.status(404).json({ 
                message: 'No se encontraron desparasitaciones aplicadas en el período seleccionado.' 
            });
        }

        res.json({
            success: true,
            reportData: {
                companyName,
                startDate: moment(fechaInicio).format('DD/MM/YYYY'),
                endDate: moment(fechaFin).format('DD/MM/YYYY'),
                selectedRaces: races,
                data: datosReporteFiltrados,
                totalRecords: datosReporteFiltrados.length
            }
        });

    } catch (error) {
        console.error('Error al generar reporte de desparasitación:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor al generar el reporte.', 
            error: error.message 
        });
    }
};

exports.generateDewormingReportPDF = async (req, res) => {
    try {
        const { startDate, endDate, races } = req.body;
        const companyName = 'Holptolt'; // Empresa fija

        // Validaciones (duplicamos la lógica para evitar problemas)
        if (!startDate || !endDate) {
            return res.status(400).json({ 
                message: 'Las fechas de inicio y fin son obligatorias.' 
            });
        }

        if (!races || !Array.isArray(races) || races.length === 0) {
            return res.status(400).json({ 
                message: 'Debe seleccionar al menos una raza para generar el reporte.' 
            });
        }

        const fechaInicio = new Date(startDate);
        const fechaFin = new Date(endDate);

        // Validar que la fecha de fin no sea menor a la fecha de inicio
        if (fechaFin < fechaInicio) {
            return res.status(400).json({ 
                message: 'La fecha de fin del reporte no puede ser menor a la fecha de inicio del reporte.' 
            });
        }

        // Ajustar fechas para incluir todo el día
        const inicioBusqueda = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), fechaInicio.getDate());
        const finBusqueda = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), fechaFin.getDate() + 1);

        // Obtener conejos de las razas seleccionadas
        const conejos = await Rabbit.find({ race: { $in: races } });
        
        if (conejos.length === 0) {
            return res.status(404).json({ 
                message: 'No se encontraron conejos para las razas seleccionadas.' 
            });
        }

        const codigosConejos = conejos.map(conejo => conejo.code);

        // Consultar registros de desparasitación en el rango de fechas
        const registrosDesparasitacion = await Deworming.find({
            codigo: { $in: codigosConejos },
            fecha: {
                $gte: inicioBusqueda,
                $lt: finBusqueda
            }
        }).sort({ fecha: 1 });

        if (registrosDesparasitacion.length === 0) {
            return res.status(404).json({ 
                message: 'No se encontraron resultados para generar el reporte con los filtros aplicados.' 
            });
        }

        // Obtener asignaciones de jaulas para los conejos
        const asignacionesJaulas = await AssignRabbit.find({ 
            rabbitCode: { $in: codigosConejos },
            status: 'asignado'
        });

        // Crear un mapa de conejos para acceso rápido
        const mapaConejos = {};
        conejos.forEach(conejo => {
            mapaConejos[conejo.code] = conejo;
        });

        // Crear un mapa de jaulas para acceso rápido
        const mapaJaulas = {};
        asignacionesJaulas.forEach(asignacion => {
            mapaJaulas[asignacion.rabbitCode] = asignacion.cageNumber;
        });

        // Procesar datos para el reporte
        const datosReporte = registrosDesparasitacion.map(registro => {
            const conejo = mapaConejos[registro.codigo];
            const jaula = mapaJaulas[registro.codigo] || 'Sin asignar';
            
            return {
                codigo: registro.codigo,
                raza: conejo ? conejo.race : 'N/A',
                jaula: jaula,
                fecha: moment(registro.fecha).format('DD/MM/YYYY'),
                desparasitacion: registro.desparasitacion ? 'Sí' : 'No'
            };
        });

        // Filtrar solo registros que tienen desparasitación aplicada (según especificación)
        const datosReporteFiltrados = datosReporte.filter(registro => registro.desparasitacion === 'Sí');

        if (datosReporteFiltrados.length === 0) {
            return res.status(404).json({ 
                message: 'No se encontraron desparasitaciones aplicadas en el período seleccionado.' 
            });
        }

        const reportData = {
            companyName,
            startDate: moment(fechaInicio).format('DD/MM/YYYY'),
            endDate: moment(fechaFin).format('DD/MM/YYYY'),
            selectedRaces: races,
            data: datosReporteFiltrados,
            totalRecords: datosReporteFiltrados.length
        };

        // Generar HTML para el PDF
        const htmlContent = generateDewormingHTMLReport(reportData);
        console.log('HTML de desparasitación generado, longitud:', htmlContent.length);

        // Configurar Puppeteer
        let browser;
        let page;
        
        try {
            console.log('Iniciando Puppeteer para reporte de desparasitación...');
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });

            console.log('Puppeteer iniciado, creando página...');
            page = await browser.newPage();
            
            // Configurar el viewport y esperar a que el contenido se cargue
            await page.setViewport({ width: 1200, height: 800 });
            console.log('Cargando contenido HTML...');
            
            await page.setContent(htmlContent, { 
                waitUntil: ['networkidle0', 'domcontentloaded'],
                timeout: 30000
            });

            console.log('HTML cargado, generando PDF...');
            
            // Generar PDF con configuración mejorada
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '1cm',
                    right: '1cm',
                    bottom: '1cm',
                    left: '1cm'
                },
                preferCSSPageSize: true,
                displayHeaderFooter: false
            });

            console.log('PDF de desparasitación generado, tamaño:', pdfBuffer.length, 'bytes');

            await browser.close();

            // Verificar que el PDF se generó correctamente
            if (!pdfBuffer || pdfBuffer.length === 0) {
                throw new Error('El PDF generado está vacío');
            }

            console.log('PDF generado correctamente, configurando respuesta...');

            // Configurar headers para descarga
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="Reporte_Desparasitacion_${moment().format('DDMMYYYY_HHmm')}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');

            console.log('Enviando PDF al cliente...');
            
            // Enviar el buffer directamente
            res.status(200);
            res.end(pdfBuffer, 'binary');

        } catch (pdfError) {
            console.error('Error específico al generar PDF con Puppeteer:', pdfError);
            if (browser) {
                await browser.close();
            }
            
            // Intentar con html-pdf-node como respaldo
            try {
                console.log('Intentando generar PDF con html-pdf-node...');
                
                const options = {
                    format: 'A4',
                    margin: {
                        top: '1cm',
                        right: '1cm',
                        bottom: '1cm',
                        left: '1cm'
                    },
                    printBackground: true,
                    displayHeaderFooter: false
                };

                const file = { content: htmlContent };
                const pdfBuffer = await htmlPdf.generatePdf(file, options);

                console.log('PDF de desparasitación generado con html-pdf-node, tamaño:', pdfBuffer.length, 'bytes');

                // Verificar que el PDF se generó correctamente
                if (!pdfBuffer || pdfBuffer.length === 0) {
                    throw new Error('El PDF generado está vacío');
                }

                console.log('PDF generado con html-pdf-node, configurando respuesta...');

                // Configurar headers para descarga
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="Reporte_Desparasitacion_${moment().format('DDMMYYYY_HHmm')}.pdf"`);
                res.setHeader('Content-Length', pdfBuffer.length);
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');

                console.log('Enviando PDF al cliente...');
                
                // Enviar el buffer directamente
                res.status(200);
                res.end(pdfBuffer, 'binary');
                
            } catch (fallbackError) {
                console.error('Error también con html-pdf-node:', fallbackError);
                throw new Error('No se pudo generar el PDF con ninguna de las bibliotecas disponibles');
            }
        }

    } catch (error) {
        console.error('Error al generar PDF del reporte de desparasitación:', error);
        res.status(500).json({ 
            message: 'Error al generar el PDF del reporte de desparasitación.', 
            error: error.message 
        });
    }
};

// Función auxiliar para generar el HTML del reporte de desparasitación
function generateDewormingHTMLReport(reportData) {
    // Escapar caracteres especiales en los datos
    const escapeHtml = (text) => {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reporte de Desparasitación</title>
        <style>
            * {
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Arial', sans-serif;
                margin: 0;
                padding: 20px;
                color: #333;
                line-height: 1.4;
                background: #fff;
            }
            
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #4CAF50;
                padding-bottom: 15px;
                page-break-inside: avoid;
            }
            
            .header h1 {
                color: #4CAF50;
                margin: 0 0 10px 0;
                font-size: 24px;
                font-weight: bold;
            }
            
            .company-name {
                font-size: 18px;
                font-weight: bold;
                margin: 10px 0;
                color: #2E7D32;
            }
            
            .date-range {
                font-size: 14px;
                color: #666;
                margin: 5px 0;
            }
            
            .races-info {
                font-size: 12px;
                color: #666;
                margin: 5px 0;
            }
            
            .summary {
                background-color: #f5f5f5;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
                page-break-inside: avoid;
                border: 1px solid #ddd;
            }
            
            .summary h3 {
                margin: 0 0 10px 0;
                color: #4CAF50;
                font-size: 16px;
            }
            
            .summary p {
                margin: 5px 0;
                font-size: 14px;
            }
            
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                font-size: 12px;
                page-break-inside: auto;
            }
            
            th, td {
                border: 1px solid #ddd;
                padding: 10px 8px;
                text-align: left;
                vertical-align: top;
                word-wrap: break-word;
            }
            
            th {
                background-color: #4CAF50 !important;
                color: white !important;
                font-weight: bold;
                text-align: center;
                font-size: 11px;
                -webkit-print-color-adjust: exact;
                page-break-inside: avoid;
            }
            
            tbody tr {
                page-break-inside: avoid;
            }
            
            tr:nth-child(even) td {
                background-color: #f9f9f9 !important;
                -webkit-print-color-adjust: exact;
            }
            
            .center {
                text-align: center;
            }
            
            .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 10px;
                color: #666;
                page-break-inside: avoid;
                border-top: 1px solid #ddd;
                padding-top: 15px;
            }
            
            /* Ajustes para la tabla */
            .table-container {
                width: 100%;
                overflow: visible;
            }
            
            /* Evitar que las filas se rompan */
            @media print {
                tbody tr {
                    page-break-inside: avoid;
                }
                
                .header {
                    page-break-after: avoid;
                }
                
                .summary {
                    page-break-after: avoid;
                }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Reporte de Desparasitación</h1>
            <div class="company-name">Holptolt</div>
            <div class="date-range">
                Período: ${escapeHtml(reportData.startDate)} - ${escapeHtml(reportData.endDate)}
            </div>
            <div class="races-info">
                Razas incluidas: ${reportData.selectedRaces.map(race => escapeHtml(race)).join(', ')}
            </div>
        </div>

        <div class="summary">
            <h3>Resumen del Reporte</h3>
            <p><strong>Total de registros:</strong> ${reportData.totalRecords}</p>
            <p><strong>Fecha de generación:</strong> ${moment().format('DD/MM/YYYY HH:mm')}</p>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th style="width: 20%;">Jaula</th>
                        <th style="width: 20%;">Código de Conejo</th>
                        <th style="width: 30%;">Raza</th>
                        <th style="width: 30%;">Fecha de Desparasitación</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.data.map(row => `
                        <tr>
                            <td class="center">${escapeHtml(row.jaula)}</td>
                            <td class="center">${escapeHtml(row.codigo)}</td>
                            <td>${escapeHtml(row.raza)}</td>
                            <td class="center">${escapeHtml(row.fecha)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>Reporte generado automáticamente por el Sistema de Gestión de Conejos</p>
        </div>
    </body>
    </html>
    `;
}
