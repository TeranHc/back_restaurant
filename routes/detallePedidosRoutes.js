// routes/detallePedidosRoutes.js
const express = require('express');
const { obtenerDetallePedidos, crearDetallePedido, actualizarDetallePedido, eliminarDetallePedido } = require('../controllers/detallePedidosController');

const router = express.Router();

router.get('/', obtenerDetallePedidos);
router.post('/', crearDetallePedido);
router.put('/:id', actualizarDetallePedido);
router.delete('/:id', eliminarDetallePedido);

module.exports = router;