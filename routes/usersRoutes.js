// ===== routes/usersRoutes.js =====
const express = require('express');
const router = express.Router();
const { obtenerUsuarios } = require('../controllers/usersController');

router.get('/users', obtenerUsuarios);

module.exports = router;