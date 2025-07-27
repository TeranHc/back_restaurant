// routes/categoriasRoutes.js
const express = require('express');
const { obtenerCategorias, crearCategoria, actualizarCategoria, eliminarCategoria } = require('../controllers/categoriasController');

const router = express.Router();

router.get('/', obtenerCategorias);
router.post('/', crearCategoria);
router.put('/:id', actualizarCategoria);
router.delete('/:id', eliminarCategoria);

module.exports = router;