// routes/orderItemOptionsRoutes.js
const express = require('express');
const { obtenerOpcionesItemPedido, crearOpcionItemPedido, actualizarOpcionItemPedido, eliminarOpcionItemPedido } = require('../controllers/orderItemOptionsController');

const router = express.Router();

router.get('/', obtenerOpcionesItemPedido);
router.post('/', crearOpcionItemPedido);
router.put('/:id', actualizarOpcionItemPedido);
router.delete('/:id', eliminarOpcionItemPedido);

module.exports = router;