// middleware/auth.js - ACTUALIZADO PARA SUPABASE AUTH
const { supabase, supabaseAdmin } = require('../services/supabaseClient');

const verificarToken = async (req, res, next) => {
  try {
    console.log('🔐 Verificando token Supabase...');
    
    // Obtener token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No se encontró token en el header');
      return res.status(401).json({ 
        message: 'Token de acceso requerido' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      console.log('❌ Token vacío');
      return res.status(401).json({ 
        message: 'Token no proporcionado' 
      });
    }

    console.log('Token extraído (primeros 20 chars):', token.substring(0, 20) + '...');

    // Verificar token con Supabase Auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    console.log('Resultado verificación token:');
    console.log('- Error:', userError?.message || 'Ninguno');
    console.log('- Usuario encontrado:', userData.user ? 'SÍ' : 'NO');

    if (userError || !userData.user) {
      console.log('❌ Token inválido o expirado');
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }

    console.log('Token válido - User ID:', userData.user.id);

    // Obtener perfil del usuario
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();

    console.log('Perfil obtenido:', profile ? 'SÍ' : 'NO');

    if (profileError) {
      console.log('⚠️ Error obteniendo perfil, usando datos básicos');
    }

    console.log('✅ Usuario verificado:', userData.user.email, '- Rol:', profile?.role || 'CLIENT');
    
    // Agregar información del usuario a la request
    req.user = {
      id: userData.user.id,
      email: userData.user.email,
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
      phone: profile?.phone || '',
      role: profile?.role || 'CLIENT'
    };
    
    next();
  } catch (error) {
    console.error('❌ Error verificando token:', error.message);
    
    return res.status(401).json({ 
      message: 'Error de autenticación' 
    });
  }
};

// Middleware específico para administradores
const verificarAdmin = async (req, res, next) => {
  try {
    // Primero verificar el token
    await new Promise((resolve, reject) => {
      verificarToken(req, res, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    // Luego verificar que sea admin
    if (req.user.role !== 'ADMIN') {
      console.log('❌ Usuario no es administrador:', req.user.email);
      return res.status(403).json({ 
        message: 'Acceso denegado. Se requieren permisos de administrador.' 
      });
    }

    console.log('✅ Acceso de administrador verificado:', req.user.email);
    next();
  } catch (error) {
    console.error('❌ Error verificando admin:', error.message);
    return res.status(401).json({ 
      message: 'Error de autenticación' 
    });
  }
};

// Middleware que permite bypass para administradores
const verificarTokenOAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Si no hay token, denegar acceso
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No se encontró token - se requiere autenticación');
      return res.status(401).json({ 
        message: 'Token de acceso requerido para esta operación' 
      });
    }

    // Si hay token, verificar normalmente
    return verificarToken(req, res, next);
  } catch (error) {
    console.error('❌ Error en verificarTokenOAdmin:', error.message);
    return res.status(401).json({ 
      message: 'Error de autenticación' 
    });
  }
};

// Middleware para verificar que el usuario pueda acceder a sus propios recursos
const verificarPropietarioOAdmin = (resourceIdParam = 'userId') => {
  return async (req, res, next) => {
    try {
      // Primero verificar el token
      await new Promise((resolve, reject) => {
        verificarToken(req, res, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      const resourceId = req.params[resourceIdParam];
      
      // Si es admin, puede acceder a cualquier recurso
      if (req.user.role === 'ADMIN') {
        console.log('✅ Acceso de admin aprobado para recurso:', resourceId);
        return next();
      }

      // Si no es admin, debe ser el propietario del recurso
      if (req.user.id !== resourceId) {
        console.log('❌ Usuario intenta acceder a recurso que no le pertenece');
        return res.status(403).json({ 
          message: 'Acceso denegado. Solo puedes acceder a tus propios recursos.' 
        });
      }

      console.log('✅ Acceso de propietario verificado');
      next();
    } catch (error) {
      console.error('❌ Error verificando propietario:', error.message);
      return res.status(401).json({ 
        message: 'Error de autenticación' 
      });
    }
  };
};

// middleware/security.js - COMPLEMENTO PARA TU MIDDLEWARE EXISTENTE
const rateLimit = require('express-rate-limit');

// Rate limiting para rutas de autenticación
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos por IP
  message: {
    error: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting más estricto para registro
const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // máximo 3 registros por IP por hora
  message: {
    error: 'Demasiados intentos de registro. Intenta de nuevo en 1 hora.'
  }
});

// Middleware para validar formato de email
const validateEmailFormat = (req, res, next) => {
  const { email } = req.body;
  
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Formato de email inválido'
      });
    }
  }
  
  next();
};

// Middleware para sanitizar datos de entrada
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    // Remover espacios en blanco de strings
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  
  next();
};

// Middleware de validación de origen para OAuth (opcional)
const validateOAuthOrigin = (req, res, next) => {
  const allowedOrigins = [
    'https://restaurante1-beryl.vercel.app',
    process.env.FRONTEND_URL
  ].filter(Boolean);

  const origin = req.headers.origin || req.headers.referer;
  
  // En desarrollo, permitir localhost
  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3000');
  }
  
  if (!origin || !allowedOrigins.some(allowed => origin.startsWith(allowed))) {
    return res.status(403).json({
      error: 'Origen no autorizado'
    });
  }
  
  next();
};

module.exports = {
  authRateLimit,
  registerRateLimit,
  validateEmailFormat,
  sanitizeInput,
  validateOAuthOrigin
};