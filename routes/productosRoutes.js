const express = require('express');
const router = express.Router();
const {
  obtenerProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
} = require('../controllers/productosController');

router.get('/productos', obtenerProductos);
router.post('/productos', crearProducto);
router.put('/productos/:id', actualizarProducto);
router.delete('/productos/:id', eliminarProducto);

module.exports = router;
