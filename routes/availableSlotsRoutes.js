// routes/availableSlotsRoutes.js
const express = require('express');
const { obtenerHorariosDisponibles, crearHorarioDisponible, actualizarHorarioDisponible, eliminarHorarioDisponible } = require('../controllers/availableSlotsController');

const router = express.Router();

router.get('/', obtenerHorariosDisponibles);
router.post('/', crearHorarioDisponible);
router.put('/:id', actualizarHorarioDisponible);
router.delete('/:id', eliminarHorarioDisponible);

module.exports = router;