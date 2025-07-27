// routes/cartRoutes.js
const express = require('express');
const { obtenerCarrito, agregarAlCarrito, actualizarCarrito, eliminarDelCarrito } = require('../controllers/cartController');

const router = express.Router();

router.get('/', obtenerCarrito);
router.post('/', agregarAlCarrito);
router.put('/:id', actualizarCarrito);
router.delete('/:id', eliminarDelCarrito);

module.exports = router;