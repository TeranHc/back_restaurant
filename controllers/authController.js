// controllers/authController.js
const { supabase, supabaseAdmin } = require('../services/supabaseClient');

const login = async (req, res) => {
  try {
    console.log('=== INICIANDO LOGIN CON SUPABASE AUTH ===');
    console.log('Body recibido:', req.body);
    
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('❌ Faltan campos requeridos');
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    console.log('Autenticando con Supabase Auth:', email);

    // Usar Supabase Auth para login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('Resultado autenticación:');
    console.log('- Error:', authError?.message || 'Ninguno');
    console.log('- Usuario autenticado:', authData.user ? 'SÍ' : 'NO');

    if (authError || !authData.user) {
      console.log('❌ Credenciales inválidas');
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    console.log('Usuario autenticado - ID:', authData.user.id, 'Email:', authData.user.email);

    // Obtener perfil del usuario de user_profiles
    console.log('Obteniendo perfil del usuario...');
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    console.log('Perfil obtenido:', profile ? 'SÍ' : 'NO');
    console.log('Error perfil:', profileError?.message || 'Ninguno');

    if (profileError) {
      console.log('⚠️ Error obteniendo perfil, usando datos básicos');
    }

    console.log('✅ Login exitoso');

    const responseData = {
      message: 'Login exitoso',
      token: authData.session.access_token, // Token real de Supabase
      refresh_token: authData.session.refresh_token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
        phone: profile?.phone || '',
        role: profile?.role || 'CLIENT'
      }
    };

    console.log('✅ Login exitoso, enviando respuesta');
    res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ Error inesperado en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const register = async (req, res) => {
  try {
    console.log('=== INICIANDO REGISTRO CON SUPABASE AUTH ===');
    console.log('Body recibido:', req.body);

    const { email, password, firstName, lastName, phone, role = 'CLIENT' } = req.body;

    if (!email || !password || !firstName) {
      console.log('❌ Faltan campos requeridos');
      return res.status(400).json({ message: 'Email, contraseña y nombre son requeridos' });
    }

    console.log('Creando usuario con Supabase Auth:', email);

    // Crear usuario con Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmar email en desarrollo
    });

    console.log('Resultado creación usuario:');
    console.log('- Error:', authError?.message || 'Ninguno');
    console.log('- Usuario creado:', authData.user ? 'SÍ' : 'NO');

    if (authError || !authData.user) {
      console.log('❌ Error creando usuario');
      if (authError?.message.includes('already registered')) {
        return res.status(409).json({ message: 'El usuario ya existe' });
      }
      return res.status(500).json({ message: 'Error al crear el usuario' });
    }

    console.log('Usuario creado en auth.users - ID:', authData.user.id);

    // Crear/actualizar perfil en user_profiles
    console.log('Creando perfil en user_profiles...');
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        role: role,
      })
      .select()
      .single();

    console.log('Perfil creado:', profile ? 'SÍ' : 'NO');
    console.log('Error perfil:', profileError?.message || 'Ninguno');

    if (profileError) {
      console.log('⚠️ Error creando perfil, pero usuario auth creado');
    }

    console.log('✅ Usuario y perfil creados exitosamente');

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        firstName: profile?.first_name || firstName,
        lastName: profile?.last_name || lastName,
        phone: profile?.phone || phone,
        role: profile?.role || role
      }
    });

  } catch (error) {
    console.error('❌ Error inesperado en register:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const verifyToken = async (req, res) => {
  try {
    console.log('=== VERIFICANDO TOKEN SUPABASE ===');
    console.log('Headers authorization:', req.headers.authorization);

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Token no encontrado o formato incorrecto');
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extraído (primeros 20 chars):', token.substring(0, 20) + '...');

    // Verificar token con Supabase
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

    console.log('✅ Token verificado correctamente');

    res.status(200).json({
      id: userData.user.id,
      email: userData.user.email,
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
      phone: profile?.phone || '',
      role: profile?.role || 'CLIENT'
    });

  } catch (error) {
    console.error('❌ Error inesperado verificando token:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const logout = async (req, res) => {
  try {
    console.log('=== CERRANDO SESIÓN ===');
    
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      // Cerrar sesión en Supabase
      const { error } = await supabaseAdmin.auth.admin.signOut(token);
      
      if (error) {
        console.log('⚠️ Error cerrando sesión en Supabase:', error.message);
      } else {
        console.log('✅ Sesión cerrada en Supabase');
      }
    }

    res.status(200).json({ message: 'Logout exitoso' });

  } catch (error) {
    console.error('❌ Error en logout:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const refreshToken = async (req, res) => {
  try {
    console.log('=== RENOVANDO TOKEN ===');
    
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ message: 'Refresh token requerido' });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error || !data.session) {
      console.log('❌ Error renovando token:', error?.message);
      return res.status(401).json({ message: 'Refresh token inválido' });
    }

    console.log('✅ Token renovado exitosamente');

    res.status(200).json({
      token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });

  } catch (error) {
    console.error('❌ Error renovando token:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { 
  login, 
  register, 
  verifyToken, 
  logout, 
  refreshToken 
};