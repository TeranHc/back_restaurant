const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ========================================
// MIDDLEWARES GLOBALES
// ========================================
// CORS configurado para múltiples orígenes
app.use(cors({
  origin: [
    'https://restaurante1-beryl.vercel.app', // Tu dominio de Vercel
    process.env.FRONTEND_URL // Variable de entorno
  ].filter(Boolean), // Filtrar valores undefined
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Servir archivos estáticos

// ========================================
// IMPORTAR RUTAS
// ========================================

// Rutas de autenticación y usuarios
const authRoutes = require('./routes/authRoutes');
const usersRoutes = require('./routes/usersRoutes');

// Rutas de productos y categorías
const productosRoutes = require('./routes/productosRoutes');
const categoriasRoutes = require('./routes/categoriasRoutes');
const productOptionsRoutes = require('./routes/productOptionsRoutes');

// Rutas de restaurantes y slots
const restaurantsRoutes = require('./routes/restaurantsRoutes');
const availableSlotsRoutes = require('./routes/availableSlotsRoutes');

// Rutas de pedidos y carrito
const pedidosRoutes = require('./routes/pedidosRoutes');
const detallePedidosRoutes = require('./routes/detallePedidosRoutes');
const orderItemOptionsRoutes = require('./routes/orderItemOptionsRoutes');
const cartRoutes = require('./routes/cartRoutes');

// Rutas de reservaciones
const reservationsRoutes = require('./routes/reservationsRoutes');

// ========================================
// USAR RUTAS - ORDEN IMPORTANTE
// ========================================

// 1. Rutas de autenticación (sin prefijo adicional)
app.use('/api/auth', authRoutes);

// 2. Rutas de usuarios (con autenticación integrada)
app.use('/api', usersRoutes);

// 3. Rutas públicas (sin autenticación requerida)
app.use('/api/categorias', categoriasRoutes);
app.use('/api/restaurants', restaurantsRoutes);
app.use('/api', productosRoutes); // Incluye /api/productos

// 4. Rutas que pueden requerir autenticación según el endpoint
app.use('/api', pedidosRoutes);              // CAMBIADO: ahora usa /api en vez de /api/pedidos
app.use('/api', detallePedidosRoutes);       // CAMBIADO: ahora usa /api en vez de /api/detalle-pedidos
app.use('/api/product-options', productOptionsRoutes);  // MANTENER: porque en el archivo usas router.get('/')
app.use('/api', orderItemOptionsRoutes);     // CAMBIADO: ahora usa /api en vez de /api/order-item-options

// 5. Rutas que requieren autenticación (middleware interno)
app.use('/api', cartRoutes);                 // CAMBIADO: ahora usa /api en vez de /api/cart
app.use('/api/reservations', reservationsRoutes);
app.use('/api/available-slots', availableSlotsRoutes);

// ========================================
// RUTA PRINCIPAL DE DOCUMENTACIÓN
// ========================================
app.get('/api', (req, res) => {
  res.json({ 
    message: 'API del Restaurante funcionando correctamente',
    version: '2.0.0',
    authProvider: 'Supabase Auth',
    
    publicEndpoints: [
      'GET /api - Documentación de la API',
      'GET /api/categorias - Obtener categorías',
      'GET /api/restaurants - Obtener restaurantes',
      'GET /api/productos - Obtener productos',
      'GET /api/product-options - Obtener opciones de productos'
    ],
    
    authEndpoints: [
      'POST /api/auth/login - Iniciar sesión',
      'POST /api/auth/register - Registrar usuario',
      'POST /api/auth/logout - Cerrar sesión',
      'POST /api/auth/refresh-token - Renovar token',
      'GET /api/auth/verify - Verificar token'
    ],
    
    protectedEndpoints: [
      // Usuarios
      '🔐 GET /api/profile - Obtener perfil propio',
      '🔐 PUT /api/profile - Actualizar perfil propio',
      '🔐👨‍💼 GET /api/users - Obtener todos los usuarios (ADMIN)',
      '🔐👨‍💼 PUT /api/users/:id/role - Cambiar rol (ADMIN)',
      
      // Carrito (ACTUALIZADO)
      '🔐 GET /api/cart - Obtener carrito del usuario',
      '🔐 POST /api/cart - Agregar producto al carrito',
      '🔐 PUT /api/cart/:id - Actualizar cantidad en carrito',
      '🔐 DELETE /api/cart/:id - Eliminar item del carrito',
      '🔐 DELETE /api/cart - Limpiar todo el carrito',
      
      // Pedidos (ACTUALIZADO)
      '🔐 GET /api/pedidos - Obtener pedidos (usuario: propios / admin: todos)',
      '🔐 GET /api/pedidos/:id - Obtener pedido específico por ID',
      '🔐 POST /api/pedidos - Crear pedido desde carrito',  // ACTUALIZADO
      '🔐 PATCH /api/pedidos/:id/cancelar - Cancelar pedido',
      '🔐👨‍💼 PUT /api/pedidos/:id - Actualizar estado del pedido (ADMIN)',
      '🔐👨‍💼 DELETE /api/pedidos/:id - Eliminar pedido (ADMIN)',
      // Detalles de Pedidos (NUEVO)
      '🔐 GET /api/detalle-pedidos - Obtener detalles de pedidos',
      '🔐 GET /api/detalle-pedidos/:id - Obtener detalle específico por ID',
      '🔐 POST /api/detalle-pedidos - Crear nuevo detalle de pedido',
      '🔐 PUT /api/detalle-pedidos/:id - Actualizar detalle de pedido',
      '🔐 DELETE /api/detalle-pedidos/:id - Eliminar detalle de pedido',
      
      // Opciones de Items de Pedidos (NUEVO)
      '🔐 GET /api/order-item-options - Obtener opciones de items',
      '🔐 GET /api/order-item-options/:id - Obtener opción específica por ID',
      '🔐 POST /api/order-item-options - Crear nueva opción de item',
      '🔐 POST /api/order-item-options/bulk - Crear múltiples opciones',
      '🔐 PUT /api/order-item-options/:id - Actualizar opción de item',
      '🔐 DELETE /api/order-item-options/:id - Eliminar opción de item',
      
      // Reservaciones
      '🔐 POST /api/reservations - Crear reservación',
      '🔐 GET /api/reservations/user/:userId - Obtener reservas del usuario',
      '🔐 PATCH /api/reservations/:id/cancel - Cancelar reserva',
      '🔐👨‍💼 GET /api/reservations - Obtener todas las reservas (ADMIN)',
      
      // Slots disponibles
      '🔐👨‍💼 GET /api/available-slots - Gestionar horarios (ADMIN)',
      '🔐👨‍💼 POST /api/available-slots - Crear horario (ADMIN)'
    ],
    
    authentication: {
      method: 'Bearer Token',
      header: 'Authorization: Bearer {supabase_jwt_token}',
      provider: 'Supabase Auth',
      roles: {
        CLIENT: 'Usuario cliente normal',
        ADMIN: 'Administrador del sistema'
      },
      notes: [
        'Los tokens son JWT de Supabase',
        'Los endpoints marcados con 🔐 requieren autenticación',
        'Los endpoints marcados con 👨‍💼 requieren rol ADMIN',
        'Usa POST /api/auth/refresh-token para renovar tokens expirados'
      ]
    },
    
    database: {
      provider: 'Supabase',
      features: [
        'Row Level Security (RLS) habilitado',
        'Autenticación integrada con auth.users',
        'Perfiles extendidos en user_profiles',
        'Políticas de seguridad por rol'
      ]
    }
  });
});

// ========================================
// RUTA 404 PARA APIs
// ========================================
app.use('/api/*', (req, res) => {
  res.status(404).json({
    message: 'Endpoint no encontrado',
    requestedPath: req.originalUrl,
    method: req.method,
    suggestion: 'Consulta GET /api para ver todos los endpoints disponibles'
  });
});

// ========================================
// MANEJO DE ERRORES GLOBAL
// ========================================
app.use((err, req, res, next) => {
  console.error('❌ Error no manejado:', err);
  
  // Error de Supabase
  if (err.code && err.message) {
    return res.status(400).json({
      message: 'Error de base de datos',
      details: err.message
    });
  }
  
  // Error genérico
  res.status(500).json({
    message: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ========================================
// INICIAR SERVIDOR
// ========================================
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log('\n🚀 =====================================');
  console.log(`   Servidor corriendo en puerto ${PORT}`);
  console.log('🚀 =====================================');
  console.log(`📖 API Docs: http://localhost:${PORT}/api`);
  console.log(`🔐 Auth Provider: Supabase Auth`);
  console.log(`🗄️  Database: Supabase PostgreSQL`);
  console.log('=====================================\n');
  
  // Información de configuración
  console.log('📋 Configuración:');
  console.log(`   - Frontend URL: ${process.env.FRONTEND_URL || 'https://restaurante1-beryl.vercel.app'}`);
  console.log(`   - Node ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(
    `   - Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurado' : '❌ No configurado'}`
  );
  console.log(
    `   - Supabase Key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ No configurado'}`
  );
  console.log(
    `   - Service Role: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurado' : '❌ No configurado'}\n`
  );

  console.log('🔧 Endpoints principales configurados:');
  console.log('   ✅ Auth: /api/auth/*');
  console.log('   ✅ Users: /api/users/* & /api/profile');
  console.log('   ✅ Products: /api/productos/*');
  console.log('   ✅ Categories: /api/categorias/*');
  console.log('   ✅ Product Options: /api/product-options/*');
  console.log('   ✅ Cart: /api/cart/*');
  console.log('   ✅ Orders: /api/pedidos/*');
  console.log('   ✅ Order Details: /api/detalle-pedidos/*');
  console.log('   ✅ Order Options: /api/order-item-options/*');
  console.log('   ✅ Reservations: /api/reservations/*');
  console.log('   ✅ Available Slots: /api/available-slots/*');
  console.log('=====================================\n');
});