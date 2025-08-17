// routes/productosRoutes.js
const express = require('express');
const router = express.Router();
const {
  obtenerProductos,
  obtenerProductoPorId,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
} = require('../controllers/productosController');

// Rutas públicas (sin autenticación)
router.get('/productos', obtenerProductos);                    // GET /productos - Obtener todos los productos
router.get('/productos/:id', obtenerProductoPorId);            // GET /productos/:id - Obtener producto por ID

// Rutas de administrador (requieren autenticación y rol ADMIN)
router.post('/productos', crearProducto);                     // POST /productos - Crear nuevo producto (con imagen)
router.put('/productos/:id', actualizarProducto);              // PUT /productos/:id - Actualizar producto (con imagen)
router.delete('/productos/:id', eliminarProducto);             // DELETE /productos/:id - Eliminar producto

module.exports = router;