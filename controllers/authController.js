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

const syncOAuthUser = async (req, res) => {
  try {
    console.log('=== SINCRONIZANDO USUARIO OAUTH ===');
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const { user: userData } = req.body;

    if (!userData || !userData.id || !userData.email) {
      return res.status(400).json({ message: 'Datos de usuario incompletos' });
    }

    console.log('Sincronizando usuario OAuth:', userData.email);

    // Verificar token con Supabase
    const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.getUser(token);
    
    if (tokenError || !tokenData.user) {
      console.log('❌ Token inválido');
      return res.status(401).json({ message: 'Token inválido' });
    }

    // Verificar que el token pertenece al usuario correcto
    if (tokenData.user.id !== userData.id) {
      console.log('❌ Token no corresponde al usuario');
      return res.status(403).json({ message: 'Token no válido para este usuario' });
    }

    // Buscar o crear perfil del usuario
    let { data: profile, error: selectError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userData.id)
      .single();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.log('❌ Error consultando perfil:', selectError);
      return res.status(500).json({ message: 'Error consultando perfil' });
    }

    if (!profile) {
      // Crear nuevo perfil para usuario OAuth
      console.log('Creando nuevo perfil para usuario OAuth...');
      
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: userData.id,
          first_name: userData.firstName || '',
          last_name: userData.lastName || '',
          role: 'CLIENT', // Por defecto CLIENT para usuarios OAuth
          avatar_url: userData.avatar || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.log('❌ Error creando perfil:', insertError);
        return res.status(500).json({ message: 'Error creando perfil de usuario' });
      }

      profile = newProfile;
      console.log('✅ Perfil creado para usuario OAuth');
    } else {
      // Actualizar perfil existente si es necesario
      const updates = {};
      let needsUpdate = false;

      if (userData.firstName && profile.first_name !== userData.firstName) {
        updates.first_name = userData.firstName;
        needsUpdate = true;
      }
      
      if (userData.lastName && profile.last_name !== userData.lastName) {
        updates.last_name = userData.lastName;
        needsUpdate = true;
      }

      if (userData.avatar && profile.avatar_url !== userData.avatar) {
        updates.avatar_url = userData.avatar;
        needsUpdate = true;
      }

      if (needsUpdate) {
        updates.updated_at = new Date().toISOString();
        
        const { data: updatedProfile, error: updateError } = await supabaseAdmin
          .from('user_profiles')
          .update(updates)
          .eq('id', userData.id)
          .select()
          .single();

        if (updateError) {
          console.log('⚠️ Error actualizando perfil:', updateError);
        } else {
          profile = updatedProfile;
          console.log('✅ Perfil actualizado');
        }
      }
    }

    console.log('✅ Usuario OAuth sincronizado exitosamente');

    res.status(200).json({
      message: 'Usuario OAuth sincronizado',
      user: {
        id: tokenData.user.id,
        email: tokenData.user.email,
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
        phone: profile?.phone || '',
        role: profile?.role || 'CLIENT',
        avatar: profile?.avatar_url || null
      }
    });

  } catch (error) {
    console.error('❌ Error sincronizando usuario OAuth:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// FUNCIÓN ACTUALIZADA PARA PRODUCCIÓN
const googleOAuth = async (req, res) => {
  try {
    console.log('=== INICIANDO GOOGLE OAUTH ===');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    // CAMBIO PRINCIPAL: Usar la URL de producción de Vercel
    const frontendUrl = process.env.FRONTEND_URL || 'https://restaurante1-beryl.vercel.app';
    const redirectTo = `${frontendUrl}/login/callback`;

    console.log('Frontend URL:', frontendUrl);
    console.log('Redirect URL:', redirectTo);
    console.log('Supabase URL:', supabaseUrl);

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL no está configurada');
    }

    // Construir la URL de OAuth manualmente
    const googleAuthUrl = `${supabaseUrl}/auth/v1/authorize?` +
      `provider=google&` +
      `redirect_to=${encodeURIComponent(redirectTo)}`;

    console.log('URL de Google OAuth generada:', googleAuthUrl);

    res.json({
      success: true,
      authUrl: googleAuthUrl,
      redirectUrl: redirectTo
    });

  } catch (error) {
    console.error('❌ Error en Google OAuth:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al generar URL de autenticación con Google',
      error: error.message 
    });
  }
};

const googleCallback = async (req, res) => {
  try {
    console.log('=== PROCESANDO GOOGLE CALLBACK ===');
    console.log('Query params:', req.query);
    
    const { access_token, refresh_token, error, error_description } = req.query;

    // CAMBIO: Usar la URL de producción
    const frontendUrl = process.env.FRONTEND_URL || 'https://restaurante1-beryl.vercel.app';

    if (error) {
      console.log('❌ Error en callback:', error_description);
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error_description || error)}`);
    }

    if (!access_token) {
      console.log('❌ No se recibió access_token');
      return res.redirect(`${frontendUrl}/login?error=no_token`);
    }

    // Verificar token con Supabase
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(access_token);

    if (userError || !userData.user) {
      console.log('❌ Error verificando usuario:', userError?.message);
      return res.redirect(`${frontendUrl}/login?error=invalid_user`);
    }

    console.log('✅ Usuario autenticado con Google:', userData.user.email);

    // Buscar o crear perfil del usuario
    let { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();

    if (profileError && profileError.code === 'PGRST116') {
      // Usuario no existe, crear perfil
      console.log('Creando perfil para usuario de Google...');
      
      const userMetadata = userData.user.user_metadata || {};
      
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: userData.user.id,
          first_name: userMetadata.full_name?.split(' ')[0] || userMetadata.name?.split(' ')[0] || '',
          last_name: userMetadata.full_name?.split(' ').slice(1).join(' ') || userMetadata.name?.split(' ').slice(1).join(' ') || '',
          role: 'CLIENT',
          avatar_url: userMetadata.picture || userMetadata.avatar_url || null,
        })
        .select()
        .single();

      if (insertError) {
        console.log('❌ Error creando perfil:', insertError);
      } else {
        profile = newProfile;
        console.log('✅ Perfil creado para usuario de Google');
      }
    }

    // Redirigir al frontend con los tokens
    const redirectUrl = `${frontendUrl}/login/callback?` +
      `access_token=${access_token}&` +
      `refresh_token=${refresh_token || ''}&` +
      `user_id=${userData.user.id}`;

    console.log('✅ Redirigiendo al frontend con tokens');
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('❌ Error en callback de Google:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'https://restaurante1-beryl.vercel.app';
    res.redirect(`${frontendUrl}/login?error=callback_error`);
  }
};

module.exports = { 
  login, 
  register, 
  verifyToken, 
  logout, 
  refreshToken,
  syncOAuthUser,
  googleOAuth,
  googleCallback
};