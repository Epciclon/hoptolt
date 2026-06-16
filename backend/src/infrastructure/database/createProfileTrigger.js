/**
 * Crea en la base de datos de Supabase la función y el trigger de PostgreSQL
 * que sincroniza automáticamente cada nuevo usuario de auth.users hacia public.profiles.
 *
 * Este script se ejecuta UNA VEZ al iniciar el servidor (idempotente gracias a
 * CREATE OR REPLACE y DROP IF EXISTS … CREATE).
 */
const sequelize = require('./connection');

async function createProfileSyncTrigger() {
    try {
        // 1. Función PL/pgSQL que copia el usuario a public.profiles
        await sequelize.query(`
            CREATE OR REPLACE FUNCTION public.handle_new_user()
            RETURNS trigger
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = public
            AS $$
            BEGIN
                INSERT INTO public.profiles (
                    id,
                    email,
                    "fullName",
                    username,
                    "createdAt",
                    "updatedAt"
                )
                VALUES (
                    NEW.id,
                    NEW.email,
                    COALESCE(NEW.raw_user_meta_data->>'fullName', ''),
                    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
                    NOW(),
                    NOW()
                )
                ON CONFLICT (id) DO NOTHING;
                RETURN NEW;
            END;
            $$;
        `);

        // 2. Eliminar el trigger si ya existía (para que el re-deploy sea idempotente)
        await sequelize.query(`
            DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        `);

        // 3. Crear el trigger que dispara la función al insertar en auth.users
        await sequelize.query(`
            CREATE TRIGGER on_auth_user_created
                AFTER INSERT ON auth.users
                FOR EACH ROW
                EXECUTE PROCEDURE public.handle_new_user();
        `);

        console.log('✅ Trigger de sincronización de perfiles configurado correctamente.');
    } catch (err) {
        // Si no tenemos permisos sobre auth.users (ej. en entornos locales sin Supabase)
        // no bloqueamos el arranque del servidor; simplemente avisamos.
        console.warn('⚠️  No se pudo crear el trigger de sincronización de perfiles:', err.message);
    }
}

module.exports = createProfileSyncTrigger;
