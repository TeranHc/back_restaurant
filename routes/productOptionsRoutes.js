// routes/productOptionsRoutes.js
const express = require('express');
const { 
  obtenerOpcionesProducto, 
  crearOpcionProducto, 
  actualizarOpcionProducto, 
  eliminarOpcionProducto 
} = require('../controllers/productOptionsController');

const router = express.Router();

// Rutas públicas (sin autenticación)
router.get('/', obtenerOpcionesProducto);             // GET /product-options - Obtener opciones (con query ?product_id=X)

// Rutas de administrador (requieren autenticación y rol ADMIN)
router.post('/', crearOpcionProducto);               // POST /product-options - Crear nueva opción
router.put('/:id', actualizarOpcionProducto);        // PUT /product-options/:id - Actualizar opción
router.delete('/:id', eliminarOpcionProducto);       // DELETE /product-options/:id - Eliminar opción

module.exports = router;