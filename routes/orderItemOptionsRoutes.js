// routes/orderItemOptionsRoutes.js
const express = require('express');
const router = express.Router();
const {
  obtenerOpcionesItemPedido,
  obtenerOpcionItemPorId,
  crearOpcionItemPedido,
  actualizarOpcionItemPedido,
  eliminarOpcionItemPedido,
  crearOpcionesMultiples
} = require('../controllers/orderItemOptionsController');

// Rutas de usuario autenticado (requieren autenticación)
// Los usuarios pueden ver y gestionar opciones de sus propios pedidos
// Los admins pueden gestionar opciones de cualquier pedido

router.get('/order-item-options', obtenerOpcionesItemPedido);           // GET /order-item-options?detalle_pedido_id=X&pedido_id=Y - Obtener opciones de items
router.get('/order-item-options/:id', obtenerOpcionItemPorId);          // GET /order-item-options/:id - Obtener opción específica por ID
router.post('/order-item-options', crearOpcionItemPedido);              // POST /order-item-options - Crear nueva opción de item
router.post('/order-item-options/bulk', crearOpcionesMultiples);        // POST /order-item-options/bulk - Crear múltiples opciones de una vez

// Rutas que requieren permisos especiales
// Usuario puede modificar solo en pedidos pendientes, Admin puede modificar cualquier pedido
router.put('/order-item-options/:id', actualizarOpcionItemPedido);      // PUT /order-item-options/:id - Actualizar opción de item
router.delete('/order-item-options/:id', eliminarOpcionItemPedido);     // DELETE /order-item-options/:id - Eliminar opción de item

module.exports = router;