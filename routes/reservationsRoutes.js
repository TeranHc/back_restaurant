// routes/reservationsRoutes.js
const express = require('express');
const { obtenerReservaciones, crearReservacion, actualizarReservacion, eliminarReservacion } = require('../controllers/reservationsController');

const router = express.Router();

router.get('/', obtenerReservaciones);
router.post('/', crearReservacion);
router.put('/:id', actualizarReservacion);
router.delete('/:id', eliminarReservacion);

module.exports = router;