// routes/productOptionsRoutes.js
const express = require('express');
const { obtenerOpcionesProducto, crearOpcionProducto, actualizarOpcionProducto, eliminarOpcionProducto } = require('../controllers/productOptionsController');

const router = express.Router();

router.get('/', obtenerOpcionesProducto);
router.post('/', crearOpcionProducto);
router.put('/:id', actualizarOpcionProducto);
router.delete('/:id', eliminarOpcionProducto);

module.exports = router;