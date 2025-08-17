// controllers/usersController.js
const { supabase, supabaseAdmin } = require('../services/supabaseClient');

const obtenerUsuarios = async (req, res) => {
  try {
    console.log('=== OBTENIENDO USUARIOS ===');
    
    // Verificar que el usuario sea ADMIN
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      return res.status(401).json({ message: 'Token inválido' });
    }

    // Verificar rol de admin
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    if (profile?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador' });
    }

    // Obtener todos los usuarios con sus perfiles
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('Error obteniendo usuarios de auth:', authError);
      return res.status(500).json({ error: authError.message });
    }

    // Obtener perfiles de usuarios
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*');

    if (profileError) {
      console.error('Error obteniendo perfiles:', profileError);
    }

    // Combinar datos de auth.users y user_profiles
    const usuariosCompletos = authUsers.users.map(authUser => {
      const profile = profiles?.find(p => p.id === authUser.id) || {};
      return {
        id: authUser.id,
        email: authUser.email,
        email_confirmed_at: authUser.email_confirmed_at,
        last_sign_in_at: authUser.last_sign_in_at,
        created_at: authUser.created_at,
        updated_at: authUser.updated_at,
        // Datos del perfil
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        role: profile.role || 'CLIENT',
        is_active: profile.is_active !== undefined ? profile.is_active : true
      };
    });

    console.log(`✅ Se obtuvieron ${usuariosCompletos.length} usuarios`);
    res.json(usuariosCompletos);

  } catch (error) {
    console.error('Error inesperado obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const obtenerUsuarioPorId = async (req, res) => {
  try {
    console.log('=== OBTENIENDO USUARIO POR ID ===');
    
    const { id } = req.params;
    
    // Verificar autenticación
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      return res.status(401).json({ message: 'Token inválido' });
    }

    // Verificar si es el mismo usuario o es admin
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    const isAdmin = profile?.role === 'ADMIN';
    const isSameUser = userData.user.id === id;

    if (!isAdmin && !isSameUser) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    // Obtener usuario de auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(id);

    if (authError || !authUser.user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Obtener perfil
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (profileError) {
      console.log('⚠️ Error obteniendo perfil:', profileError.message);
    }

    const usuarioCompleto = {
      id: authUser.user.id,
      email: authUser.user.email,
      email_confirmed_at: authUser.user.email_confirmed_at,
      last_sign_in_at: authUser.user.last_sign_in_at,
      created_at: authUser.user.created_at,
      updated_at: authUser.user.updated_at,
      // Datos del perfil
      first_name: userProfile?.first_name || '',
      last_name: userProfile?.last_name || '',
      phone: userProfile?.phone || '',
      role: userProfile?.role || 'CLIENT',
      is_active: userProfile?.is_active !== undefined ? userProfile.is_active : true
    };

    console.log('✅ Usuario obtenido correctamente');
    res.json(usuarioCompleto);

  } catch (error) {
    console.error('Error obteniendo usuario por ID:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const actualizarPerfil = async (req, res) => {
  try {
    console.log('=== ACTUALIZANDO PERFIL ===');
    
    const { id } = req.params;
    const { first_name, last_name, phone } = req.body;
    
    // Verificar autenticación
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      return res.status(401).json({ message: 'Token inválido' });
    }

    // Verificar si es el mismo usuario o es admin
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    const isAdmin = profile?.role === 'ADMIN';
    const isSameUser = userData.user.id === id;

    if (!isAdmin && !isSameUser) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    // Actualizar perfil
    const updateData = {};
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (phone !== undefined) updateData.phone = phone;
    updateData.updated_at = new Date().toISOString();

    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error actualizando perfil:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    console.log('✅ Perfil actualizado correctamente');
    res.json({
      message: 'Perfil actualizado exitosamente',
      profile: updatedProfile
    });

  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const cambiarRol = async (req, res) => {
  try {
    console.log('=== CAMBIANDO ROL DE USUARIO ===');
    
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['CLIENT', 'ADMIN'].includes(role)) {
      return res.status(400).json({ message: 'Rol inválido. Debe ser CLIENT o ADMIN' });
    }

    // Verificar autenticación y rol de admin
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      return res.status(401).json({ message: 'Token inválido' });
    }

    // Verificar que sea admin
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    if (profile?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador' });
    }

    // Cambiar rol
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({ 
        role: role,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error cambiando rol:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    console.log('✅ Rol cambiado correctamente');
    res.json({
      message: 'Rol actualizado exitosamente',
      profile: updatedProfile
    });

  } catch (error) {
    console.error('Error cambiando rol:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const desactivarUsuario = async (req, res) => {
  try {
    console.log('=== DESACTIVANDO USUARIO ===');
    
    const { id } = req.params;
    
    // Verificar autenticación y rol de admin
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      return res.status(401).json({ message: 'Token inválido' });
    }

    // Verificar que sea admin
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    if (profile?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador' });
    }

    // Desactivar usuario en user_profiles
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error desactivando usuario:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    console.log('✅ Usuario desactivado correctamente');
    res.json({
      message: 'Usuario desactivado exitosamente',
      profile: updatedProfile
    });

  } catch (error) {
    console.error('Error desactivando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { 
  obtenerUsuarios,
  obtenerUsuarioPorId,
  actualizarPerfil,
  cambiarRol,
  desactivarUsuario
};