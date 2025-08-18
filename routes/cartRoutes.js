// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const {
  obtenerCarrito,
  agregarAlCarrito,
  actualizarCarrito,
  eliminarDelCarrito,
  limpiarCarrito
} = require('../controllers/cartController');

// Rutas de usuario autenticado (requieren autenticación)
// Todas las rutas del carrito son específicas del usuario autenticado
// Cada usuario solo puede gestionar su propio carrito

router.get('/cart', obtenerCarrito);                                    // GET /cart - Obtener carrito del usuario autenticado
router.post('/cart', agregarAlCarrito);                                 // POST /cart - Agregar producto al carrito (o actualizar cantidad si ya existe)
router.put('/cart/:id', actualizarCarrito);                             // PUT /cart/:id - Actualizar cantidad de item específico en carrito
router.delete('/cart/:id', eliminarDelCarrito);                         // DELETE /cart/:id - Eliminar item específico del carrito
router.delete('/cart', limpiarCarrito);                                 // DELETE /cart - Limpiar todo el carrito del usuario

module.exports = router;