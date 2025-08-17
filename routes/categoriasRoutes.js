// routes/categoriasRoutes.js
const express = require('express');
const {
  obtenerCategorias,
  obtenerCategoriaPorId,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria
} = require('../controllers/categoriasController');

const router = express.Router();

// Rutas públicas (sin autenticación)
router.get('/', obtenerCategorias);           // GET /api/categorias
router.get('/:id', obtenerCategoriaPorId);   // GET /api/categorias/:id

// Rutas de administrador (requieren autenticación y rol ADMIN)
router.post('/', crearCategoria);            // POST /api/categorias
router.put('/:id', actualizarCategoria);     // PUT /api/categorias/:id
router.delete('/:id', eliminarCategoria);    // DELETE /api/categorias/:id

module.exports = router;