// routes/detallePedidosRoutes.js
const express = require('express');
const router = express.Router();
const {
  obtenerDetallePedidos,
  obtenerDetallePorId,
  crearDetallePedido,
  actualizarDetallePedido,
  eliminarDetallePedido
} = require('../controllers/detallePedidosController');

// Rutas de usuario autenticado (requieren autenticación)
// Los usuarios pueden ver detalles de sus propios pedidos
// Los admins pueden ver detalles de cualquier pedido

router.get('/detalle-pedidos', obtenerDetallePedidos);                  // GET /detalle-pedidos?pedido_id=X - Obtener detalles de pedidos
router.get('/detalle-pedidos/:id', obtenerDetallePorId);                // GET /detalle-pedidos/:id - Obtener detalle específico por ID

// Rutas de creación y modificación
// Usuario puede crear/modificar solo en pedidos pendientes propios
// Admin puede crear/modificar en cualquier pedido

router.post('/detalle-pedidos', crearDetallePedido);                    // POST /detalle-pedidos - Crear nuevo detalle de pedido
router.put('/detalle-pedidos/:id', actualizarDetallePedido);            // PUT /detalle-pedidos/:id - Actualizar detalle de pedido
router.delete('/detalle-pedidos/:id', eliminarDetallePedido);           // DELETE /detalle-pedidos/:id - Eliminar detalle de pedido

module.exports = router;