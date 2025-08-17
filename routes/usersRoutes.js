// routes/usersRoutes.js - ACTUALIZADO PARA SUPABASE AUTH
const express = require('express');
const router = express.Router();
const { 
  obtenerUsuarios,
  obtenerUsuarioPorId,
  actualizarPerfil,
  cambiarRol,
  desactivarUsuario
} = require('../controllers/usersController');

const { 
  verificarToken,
  verificarAdmin,
  verificarPropietarioOAdmin
} = require('../middleware/auth');

// ========================================
// RUTAS DE ADMINISTRACIÓN (Solo ADMIN)
// ========================================

// Obtener todos los usuarios (Solo ADMIN)
router.get('/users', verificarAdmin, obtenerUsuarios);

// Cambiar rol de usuario (Solo ADMIN)
router.put('/users/:id/role', verificarAdmin, cambiarRol);

// Desactivar usuario (Solo ADMIN)
router.put('/users/:id/deactivate', verificarAdmin, desactivarUsuario);

// ========================================
// RUTAS DE PERFIL (Usuario propio o ADMIN)
// ========================================

// Obtener usuario por ID (Propio usuario o ADMIN)
router.get('/users/:id', verificarPropietarioOAdmin('id'), obtenerUsuarioPorId);

// Actualizar perfil (Propio usuario o ADMIN)
router.put('/users/:id/profile', verificarPropietarioOAdmin('id'), actualizarPerfil);

// ========================================
// RUTAS DE PERFIL SIMPLIFICADAS
// ========================================

// Obtener perfil propio
router.get('/profile', verificarToken, async (req, res) => {
  // Redirigir a la ruta de obtener usuario por ID
  req.params.id = req.user.id;
  const { obtenerUsuarioPorId } = require('../controllers/usersController');
  return obtenerUsuarioPorId(req, res);
});

// Actualizar perfil propio
router.put('/profile', verificarToken, async (req, res) => {
  // Redirigir a la ruta de actualizar perfil
  req.params.id = req.user.id;
  const { actualizarPerfil } = require('../controllers/usersController');
  return actualizarPerfil(req, res);
});

// ========================================
// RUTA DE INFORMACIÓN
// ========================================

// Ruta para verificar estado de la API de usuarios
router.get('/status', (req, res) => {
  res.json({ 
    message: 'Users API funcionando correctamente',
    authProvider: 'Supabase Auth',
    endpoints: [
      // Rutas de administración
      '🔐 GET /api/users - Obtener todos los usuarios (ADMIN)',
      '🔐 PUT /api/users/:id/role - Cambiar rol de usuario (ADMIN)',
      '🔐 PUT /api/users/:id/deactivate - Desactivar usuario (ADMIN)',
      
      // Rutas de perfil
      '🔐 GET /api/users/:id - Obtener usuario por ID (Propio o ADMIN)',
      '🔐 PUT /api/users/:id/profile - Actualizar perfil (Propio o ADMIN)',
      
      // Rutas simplificadas
      '🔐 GET /api/profile - Obtener perfil propio',
      '🔐 PUT /api/profile - Actualizar perfil propio',
      
      // Información
      'GET /api/status - Estado de la API'
    ],
    roles: {
      CLIENT: 'Usuario cliente normal',
      ADMIN: 'Administrador del sistema'
    }
  });
});

module.exports = router;