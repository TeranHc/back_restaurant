// routes/restaurantsRoutes.js
const express = require('express');
const { 
  obtenerRestaurantes, 
  obtenerTodosRestaurantes,
  obtenerRestaurantePorId,
  crearRestaurante, 
  actualizarRestaurante, 
  eliminarRestaurante,
  toggleEstadoRestaurante
} = require('../controllers/restaurantsController');

const router = express.Router();

// ====================================
// RUTAS PÚBLICAS (sin autenticación)
// ====================================

// Obtener restaurantes activos (acceso público)
router.get('/', obtenerRestaurantes);

// Obtener restaurante específico por ID (acceso público)
router.get('/:id', obtenerRestaurantePorId);

// ====================================
// RUTAS ADMINISTRATIVAS (requieren auth + rol ADMIN)
// ====================================

// Obtener TODOS los restaurantes (activos e inactivos) - Solo ADMIN
router.get('/admin/all', obtenerTodosRestaurantes);

// Crear restaurante - Solo ADMIN
router.post('/', crearRestaurante);

// Actualizar restaurante - Solo ADMIN
router.put('/:id', actualizarRestaurante);

// Eliminar restaurante (hard delete) - Solo ADMIN
router.delete('/:id', eliminarRestaurante);

// Activar/desactivar restaurante (soft delete) - Solo ADMIN
router.patch('/:id/toggle-status', toggleEstadoRestaurante);

module.exports = router;