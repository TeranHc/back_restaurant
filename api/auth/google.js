// routes/google.js o donde tengas definida esta ruta
const { supabase } = require('../services/supabaseClient');

// VERSIÓN ACTUALIZADA PARA PRODUCCIÓN
app.get('/api/auth/google', async (req, res) => {
  try {
    console.log('=== INICIANDO GOOGLE OAUTH ===');
    
    // Usar la URL de producción de Vercel
    const frontendUrl = process.env.FRONTEND_URL || 'https://restaurante1-beryl.vercel.app';
    const redirectTo = `${frontendUrl}/login/callback`;
    
    console.log('Frontend URL:', frontendUrl);
    console.log('Redirect URL:', redirectTo);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo, // Usar la URL de producción
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });

    if (error) {
      throw error;
    }

    console.log('URL de autenticación generada:', data.url);

    res.json({
      success: true,
      authUrl: data.url
    });
    
  } catch (error) {
    console.error('Error en Google OAuth:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});