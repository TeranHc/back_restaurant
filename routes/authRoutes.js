// routes/authRoutes.js - CORREGIDO
const express = require('express');
const router = express.Router();
const { 
  login, 
  register, 
  verifyToken, 
  logout, 
  refreshToken,
  syncOAuthUser,
  googleOAuth,
  googleCallback
} = require('../controllers/authController');

// Rutas de autenticación tradicional
router.post('/login', login);
router.post('/register', register);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);

// Rutas OAuth con Google
router.get('/google', googleOAuth);                    // Iniciar proceso OAuth
router.get('/google/callback', googleCallback);       // Callback de Google (GET no POST)
router.post('/sync-oauth', syncOAuthUser);            // Sincronizar usuario OAuth

// Rutas de verificación
router.get('/verify', verifyToken);
router.get('/verify-token', verifyToken);

// Ruta para verificar estado de la API de auth
router.get('/status', (req, res) => {
  res.json({ 
    message: 'Auth API funcionando correctamente',
    authProvider: 'Supabase Auth',
    endpoints: [
      'POST /api/auth/login - Iniciar sesión',
      'POST /api/auth/register - Registrar usuario', 
      'POST /api/auth/logout - Cerrar sesión',
      'POST /api/auth/refresh-token - Renovar token',
      'GET /api/auth/verify - Verificar token',
      'GET /api/auth/verify-token - Verificar token (alias)',
      'GET /api/auth/google - Iniciar OAuth con Google',
      'GET /api/auth/google/callback - Callback OAuth Google (GET)',
      'POST /api/auth/sync-oauth - Sincronizar usuario OAuth',
      'GET /api/auth/status - Estado de la API'
    ]
  });
});

module.exports = router;