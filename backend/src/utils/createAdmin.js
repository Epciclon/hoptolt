const mongoose = require('mongoose');
const User = require('../models/user');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

const createAdminUser = async () => {
    try {
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('Conectado a MongoDB');

        // Verificar si ya existe un admin
        const existingAdmin = await User.findOne({ role: 'admin' });
        
        if (existingAdmin) {
            console.log('Ya existe un usuario administrador:', existingAdmin.username);
            process.exit(0);
        }

        // Crear usuario administrador
        const adminUser = new User({
            username: 'admin',
            email: 'admin@holptolt.com',
            password: 'Admin123!', // Contraseña inicial - debe cambiarse
            firstName: 'Administrador',
            lastName: 'Sistema',
            role: 'admin',
            isActive: true
        });

        await adminUser.save();
        
        console.log('✅ Usuario administrador creado exitosamente:');
        console.log('   Username: admin');
        console.log('   Email: admin@holptolt.com');
        console.log('   Password: Admin123!');
        console.log('   ⚠️  IMPORTANTE: Cambie la contraseña después del primer login');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error creando usuario administrador:', error);
        
        if (error.name === 'ValidationError') {
            console.error('Errores de validación:');
            Object.values(error.errors).forEach(err => {
                console.error(`  - ${err.message}`);
            });
        }
        
        process.exit(1);
    }
};

// Ejecutar solo si este script se ejecuta directamente
if (require.main === module) {
    createAdminUser();
}

module.exports = createAdminUser;
