const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const sequelize = require('./infrastructure/database/connection');
require('./domain/models');
const apiRoutes = require('./modules');
const swaggerConfig = require('./infrastructure/docs/swagger');
const { apiLimiter, helmetConfig, inputSanitizer } = require('./common/middlewares/security.middleware');
const errorMiddleware = require('./common/middlewares/error.middleware');
const createProfileSyncTrigger = require('./infrastructure/database/createProfileTrigger');

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL no está definido en las variables de entorno');
    process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.warn('⚠️  SUPABASE_URL o SUPABASE_ANON_KEY no están configurados. Las rutas protegidas no funcionarán correctamente.');
    console.warn('   Configúralos en backend/.env → Supabase Dashboard → Project Settings → API');
}

app.set('trust proxy', 1);

app.use(helmetConfig);
app.use(inputSanitizer);

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', apiLimiter);

sequelize.authenticate()
    .then(async () => {
        console.log('✅ Supabase PostgreSQL conectado exitosamente');

        // Sincronización automática eliminada a petición del usuario
        // await sequelize.sync({ alter: true });

        // Solo configuramos el trigger de sincronización de perfiles de Supabase Auth
        await createProfileSyncTrigger();
    })
    .catch(err => {
        console.error('❌ Error al inicializar la base de datos:', err);
        process.exit(1);
    });

app.use('/api', apiRoutes);

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Servidor funcionando correctamente',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'Supabase Cloud'
    });
});

swaggerConfig(app);

app.use('*', (req, res) => {
    res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

app.use(errorMiddleware);

module.exports = { app, sequelize };

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
        console.log(`🌐 Base de datos: Supabase Cloud`);
    });
}