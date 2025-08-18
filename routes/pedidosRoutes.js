// routes/pedidosRoutes.js
const express = require('express');
const router = express.Router();
const {
  obtenerPedidos,
  obtenerPedido,
  crearPedido,
  crearPedidoYLimpiarCarrito,
  actualizarPedido,
  cancelarPedido,
  eliminarPedido
} = require('../controllers/pedidosController');

// ============================================
// RUTAS DE USUARIO AUTENTICADO
// ============================================

// Obtener pedidos (usuario: sus pedidos, admin: todos)
router.get('/pedidos', obtenerPedidos);

// Obtener pedido específico por ID
router.get('/pedidos/:id', obtenerPedido);

// Crear nuevo pedido desde carrito (MANTIENE carrito intacto)
router.post('/pedidos', crearPedido);

// Crear pedido desde carrito Y limpiar carrito (alternativa)
router.post('/pedidos/limpiar-carrito', crearPedidoYLimpiarCarrito);

// Cancelar pedido (usuario: solo sus pedidos pendientes, admin: cualquiera)
router.patch('/pedidos/:id/cancelar', cancelarPedido);

// ============================================
// RUTAS DE ADMINISTRADOR (requieren rol ADMIN)
// ============================================

// Actualizar estado del pedido (solo admins)
router.put('/pedidos/:id', actualizarPedido);

// Eliminar pedido completamente (solo admins)
router.delete('/pedidos/:id', eliminarPedido);

module.exports = router;