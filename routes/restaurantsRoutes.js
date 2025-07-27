// routes/restaurantsRoutes.js
const express = require('express');
const { obtenerRestaurantes, crearRestaurante, actualizarRestaurante, eliminarRestaurante } = require('../controllers/restaurantsController');

const router = express.Router();

router.get('/', obtenerRestaurantes);
router.post('/', crearRestaurante);
router.put('/:id', actualizarRestaurante);
router.delete('/:id', eliminarRestaurante);

module.exports = router;