const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // ← AGREGADO: Servir archivos estáticos

// Importar rutas existentes
const productosRoutes = require('./routes/productosRoutes');
const usersRoutes = require('./routes/usersRoutes');
const authRoutes = require('./routes/authRoutes');

// Importar nuevas rutas
const categoriasRoutes = require('./routes/categoriasRoutes');
const restaurantsRoutes = require('./routes/restaurantsRoutes');
const pedidosRoutes = require('./routes/pedidosRoutes');
const cartRoutes = require('./routes/cartRoutes');
const reservationsRoutes = require('./routes/reservationsRoutes');
const availableSlotsRoutes = require('./routes/availableSlotsRoutes');
const detallePedidosRoutes = require('./routes/detallePedidosRoutes');
const productOptionsRoutes = require('./routes/productOptionsRoutes');
const orderItemOptionsRoutes = require('./routes/orderItemOptionsRoutes');

// Usar rutas existentes
app.use('/api', productosRoutes);
app.use('/api', usersRoutes);  
app.use('/api/auth', authRoutes);

// Usar nuevas rutas
app.use('/api/categorias', categoriasRoutes);
app.use('/api/restaurants', restaurantsRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/available-slots', availableSlotsRoutes);
app.use('/api/detalle-pedidos', detallePedidosRoutes);
app.use('/api/product-options', productOptionsRoutes);
app.use('/api/order-item-options', orderItemOptionsRoutes);

// Ruta de prueba para ver todos los endpoints disponibles
app.get('/api', (req, res) => {
  res.json({ 
    message: 'API del Restaurante funcionando correctamente',
    endpoints: [
      'GET /api/productos - Obtener productos',
      'GET /api/users - Obtener usuarios', 
      'POST /api/auth/login - Iniciar sesión',
      'GET /api/categorias - Obtener categorías',
      'GET /api/restaurants - Obtener restaurantes',
      'GET /api/pedidos - Obtener pedidos',
      'GET /api/cart - Obtener carrito',
      'GET /api/reservations - Obtener reservaciones',
      'GET /api/available-slots - Obtener horarios disponibles',
      'GET /api/detalle-pedidos - Obtener detalles de pedidos',
      'GET /api/product-options - Obtener opciones de productos',
      'GET /api/order-item-options - Obtener opciones de items de pedido'
    ]
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});