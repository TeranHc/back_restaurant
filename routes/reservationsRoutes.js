// routes/reservations.js
const express = require('express');
const router = express.Router();
const { 
  obtenerReservaciones, 
  crearReservacion, 
  actualizarReservacion, 
  eliminarReservacion,
  obtenerReservasUsuario,
  cancelarReservaUsuario,
  cancelarReserva
} = require('../controllers/reservationsController');

const { verificarToken, verificarAdmin } = require('../middleware/auth');

// ==================== RUTAS DE RESERVACIONES ====================

// GET /api/reservations - Obtener todas las reservaciones (admin)
router.get('/', verificarToken, obtenerReservaciones); // ✅ CAMBIADO: verificarAdmin → verificarToken

// GET /api/reservations/user/:userId - Obtener reservas de un usuario específico
router.get('/user/:userId', verificarToken, obtenerReservasUsuario);

// POST /api/reservations - Crear nueva reservación
router.post('/', verificarToken, crearReservacion);

// PUT /api/reservations/:id - Actualizar reservación
router.put('/:id', verificarToken, actualizarReservacion);

// PUT /api/reservations/:reservationId/cancel - Cancelar reserva (método directo)
router.put('/:reservationId/cancel', verificarToken, cancelarReserva);

// PUT /api/reservations/user/:userId/:reservationId/cancel - Cancelar reserva de usuario específico
router.put('/user/:userId/:reservationId/cancel', verificarToken, cancelarReservaUsuario);

// DELETE /api/reservations/:id - Eliminar reservación
router.delete('/:id', verificarToken, eliminarReservacion);

module.exports = router;