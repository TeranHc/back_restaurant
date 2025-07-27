// routes/pedidosRoutes.js
const express = require('express');
const { obtenerPedidos, crearPedido, actualizarPedido, eliminarPedido } = require('../controllers/pedidosController');

const router = express.Router();

router.get('/', obtenerPedidos);
router.post('/', crearPedido);
router.put('/:id', actualizarPedido);
router.delete('/:id', eliminarPedido);

module.exports = router;