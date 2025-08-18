const express = require('express');
const { 
  obtenerRestaurantes, 
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

// Obtener todos los restaurantes (activos e inactivos)
router.get('/', obtenerRestaurantes);

// Obtener restaurante específico por ID
router.get('/:id', obtenerRestaurantePorId);

// ====================================
// RUTAS ADMINISTRATIVAS (requieren auth + rol ADMIN)
// ====================================

// Crear restaurante
router.post('/', crearRestaurante);

// Actualizar restaurante
router.put('/:id', actualizarRestaurante);

// Eliminar restaurante (hard delete)
router.delete('/:id', eliminarRestaurante);

// Activar/desactivar restaurante (soft delete)
router.patch('/:id/toggle-status', toggleEstadoRestaurante);

module.exports = router;
