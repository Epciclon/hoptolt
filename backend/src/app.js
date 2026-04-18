const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// Importar rutas
const cageRoutes = require('./routes/cageRoutes');
const raceRoutes = require('./routes/raceRoutes');
const rabbitRoutes = require('./routes/rabbitRoutes');
const assignRabbitRoutes = require('./routes/assignRabbitRoutes');
const matingRoutes = require('./routes/matingRoutes');
const feedingRoutes = require('./routes/feedingRoutes');
const vaccinationRoutes = require('./routes/vaccinationRoutes');
const dewormingRoutes = require('./routes/dewormingRoutes');
const growthRoutes = require('./routes/growthRoutes');
const reportRoutes = require('./routes/reportRoutes');
const authRoutes = require('./routes/authRoutes');

// Importar middleware de seguridad
const { authenticateToken } = require('./middleware/auth');
const { 
    apiLimiter, 
    helmetConfig, 
    securityLogger, 
    inputSanitizer 
} = require('./middleware/security');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Validar variables de entorno críticas
if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET no está definido en las variables de entorno');
    process.exit(1);
}

if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI no está definido en las variables de entorno');
    process.exit(1);
}

// Configurar confianza en proxies (para obtener IP real)
app.set('trust proxy', 1);

// Middleware de seguridad
app.use(helmetConfig);
app.use(securityLogger);
app.use(inputSanitizer);

// Configuración de CORS mejorada
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count']
}));

// Middleware básico
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting para API
app.use('/api', apiLimiter);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ MongoDB conectado exitosamente');
})
.catch(err => {
    console.error('❌ Error de conexión a MongoDB:', err);
    process.exit(1);
});

// Rutas de autenticación (públicas y protegidas)
app.use('/api/auth', authRoutes);

// Middleware de autenticación para rutas de la API (aplicar después de auth routes)
// Comentado temporalmente para mantener compatibilidad con frontend existente
// app.use('/api', authenticateToken);

// Routes principales (sin autenticación por ahora para mantener compatibilidad)
app.use('/api', cageRoutes);
app.use('/api', raceRoutes);
app.use('/api', rabbitRoutes);
app.use('/api', assignRabbitRoutes);
app.use('/api', matingRoutes);
app.use('/api', feedingRoutes);
app.use('/api', vaccinationRoutes);
app.use('/api', dewormingRoutes);
app.use('/api', growthRoutes);
app.use('/api/reports', reportRoutes);

// Ruta de health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Servidor funcionando correctamente',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Middleware de manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error no capturado:', err);
    
    // Error de validación de MongoDB
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            message: 'Error de validación',
            errors
        });
    }
    
    // Error de duplicado de MongoDB
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(400).json({
            success: false,
            message: `Ya existe un registro con este ${field}`
        });
    }
    
    // Error de JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Token inválido'
        });
    }
    
    // Error de token expirado
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expirado'
        });
    }
    
    // Error genérico
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
    });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

// Exportar app para Vercel
module.exports = app;

// Start the server solo localmente
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}