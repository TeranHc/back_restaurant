// routes/authRoutes.js - USANDO TU MIDDLEWARE EXISTENTE
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

// Importar tu middleware de autenticación existente
const { verificarToken } = require('../middleware/auth');

// Importar middlewares de seguridad (OPCIONAL - solo si quieres rate limiting)
const {
  authRateLimit,
  registerRateLimit,
  validateEmailFormat,
  sanitizeInput
} = require('../middleware/security');

// Aplicar sanitización a todas las rutas (OPCIONAL)
// router.use(sanitizeInput);

// Rutas de autenticación tradicional
router.post('/login', login); // Puedes agregar: authRateLimit, validateEmailFormat
router.post('/register', register); // Puedes agregar: registerRateLimit, validateEmailFormat
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);

// Rutas OAuth con Google
router.get('/google', googleOAuth);
router.get('/google/callback', googleCallback);
router.post('/sync-oauth', verificarToken, syncOAuthUser); // Protegida con tu middleware

// Rutas de verificación
router.get('/verify', verifyToken);
router.get('/verify-token', verifyToken);

// Ruta de estado
router.get('/status', (req, res) => {
  res.json({ 
    message: 'Auth API funcionando correctamente',
    authProvider: 'Supabase Auth',
    middleware: {
      authentication: 'Custom Supabase middleware',
      rateLimiting: 'Available (optional)',
      validation: 'Available (optional)'
    },
    endpoints: [
      'POST /api/auth/login - Iniciar sesión',
      'POST /api/auth/register - Registrar usuario', 
      'POST /api/auth/logout - Cerrar sesión',
      'POST /api/auth/refresh-token - Renovar token',
      'GET /api/auth/verify - Verificar token',
      'GET /api/auth/verify-token - Verificar token (alias)',
      'GET /api/auth/google - Iniciar OAuth con Google',
      'GET /api/auth/google/callback - Callback OAuth Google',
      'POST /api/auth/sync-oauth - Sincronizar usuario OAuth (protegida)',
      'GET /api/auth/status - Estado de la API'
    ]
  });
});

module.exports = router;