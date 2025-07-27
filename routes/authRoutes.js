// ===== routes/authRoutes.js (ACTUALIZAR) =====
const express = require('express');
const router = express.Router();
const { login, register, verifyToken } = require('../controllers/authController');

router.post('/login', login);
router.post('/register', register);
router.get('/verify', verifyToken); // ← NUEVA ruta
router.get('/verify-token', verifyToken);


module.exports = router;