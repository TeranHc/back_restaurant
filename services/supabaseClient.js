// services/supabaseClient.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Cliente normal de Supabase (para operaciones regulares con RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,       // URL del proyecto
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,  // Anon key pública
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

// Cliente administrativo que bypassa RLS usando Service Role Key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,       // Misma URL
  process.env.SUPABASE_SERVICE_ROLE_KEY,      // Service Role key privada
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

// Función de prueba de conexión normal
const testConnection = async () => {
  try {
    console.log('🔍 Probando conexión a Supabase...');

    // Test tabla user_profiles
    const { error: profileError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });
    if (profileError) {
      console.log('⚠️ Tabla user_profiles:', profileError.message);
    } else {
      console.log('✅ Conexión OK - user_profiles accesible');
    }

    // Test tabla restaurants
    const { error: restError } = await supabase
      .from('restaurants')
      .select('*', { count: 'exact', head: true });
    if (restError) {
      console.log('⚠️ Tabla restaurants:', restError.message);
    } else {
      console.log('✅ restaurants accesible');
    }

  } catch (error) {
    console.error('❌ Error general probando Supabase:', error.message);
  }
};

// Función de prueba de conexión admin
const testAdminConnection = async () => {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY no está configurada');
      return;
    }

    console.log('🔍 Probando conexión Admin...');

    // Verificar auth.users con admin
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.log('⚠️ Supabase Auth Admin:', authError.message);
    } else {
      console.log('✅ Supabase Auth Admin OK -', authUsers.users.length, 'usuarios registrados');
    }

    // Test acceso admin a user_profiles
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });
    if (profileError) {
      console.log('⚠️ Admin user_profiles:', profileError.message);
    } else {
      console.log('✅ Admin puede acceder a user_profiles');
    }

  } catch (error) {
    console.error('❌ Error de conexión Admin:', error.message);
  }
};

// Ejecutar pruebas al iniciar
testConnection();
testAdminConnection();

// Exportar clientes
module.exports = { supabase, supabaseAdmin };
