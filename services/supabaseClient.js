const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// AGREGAR SOLO ESTA VERIFICACIÓN (temporal para debugging)
const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count');
    if (error) {
      console.error('❌ Error conectando a Supabase:', error.message);
    } else {
      console.log('✅ Conexión a Supabase exitosa');
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error);
  }
};

// Llamar la verificación al iniciar
testConnection();

module.exports = supabase;