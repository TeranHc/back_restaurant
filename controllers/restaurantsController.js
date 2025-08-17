// controllers/restaurantsController.js
const { supabase, supabaseAdmin } = require('../services/supabaseClient');

// Utilidad para convertir string a booleano real
const parseBoolean = (value) => {
  return value === true || value === 'true' || value === 'on' || value === '1';
};

// Middleware para verificar si el usuario es ADMIN
const verificarAdmin = async (token) => {
  try {
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !userData.user) {
      return { isAdmin: false, error: 'Token inválido' };
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    if (profileError) {
      return { isAdmin: false, error: 'Error obteniendo perfil de usuario' };
    }

    return { 
      isAdmin: profile?.role === 'ADMIN', 
      userId: userData.user.id,
      userRole: profile?.role 
    };
  } catch (error) {
    return { isAdmin: false, error: 'Error verificando permisos' };
  }
};

const obtenerRestaurantes = async (req, res) => {
  try {
    console.log('=== OBTENIENDO RESTAURANTES ===');
    
    // Para obtener restaurantes usamos supabase normal ya que las políticas RLS 
    // permiten acceso público (anon, authenticated) para lectura
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true) // Solo restaurantes activos
      .order('name');
    
    if (error) {
      console.error('Error obteniendo restaurantes:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Se obtuvieron ${data.length} restaurantes activos`);
    res.json(data);
  } catch (error) {
    console.error('Error inesperado obteniendo restaurantes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const obtenerTodosRestaurantes = async (req, res) => {
  try {
    console.log('=== OBTENIENDO TODOS LOS RESTAURANTES (ADMIN) ===');
    
    // Verificar autenticación y permisos de admin
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    const { isAdmin, error: authError } = await verificarAdmin(token);

    if (authError) {
      return res.status(401).json({ message: authError });
    }

    if (!isAdmin) {
      return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador' });
    }

    // Admin puede ver todos los restaurantes (activos e inactivos)
    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error obteniendo todos los restaurantes:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Admin obtuvo ${data.length} restaurantes (todos)`);
    res.json(data);
  } catch (error) {
    console.error('Error inesperado obteniendo todos los restaurantes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const obtenerRestaurantePorId = async (req, res) => {
  try {
    console.log('=== OBTENIENDO RESTAURANTE POR ID ===');
    
    const { id } = req.params;

    // Usar supabase normal para acceso público
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Restaurante no encontrado' });
      }
      console.error('Error obteniendo restaurante por ID:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Restaurante obtenido: ${data.name}`);
    res.json(data);
  } catch (error) {
    console.error('Error inesperado obteniendo restaurante por ID:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const crearRestaurante = async (req, res) => {
  try {
    console.log('=== CREANDO RESTAURANTE ===');
    
    // Verificar autenticación y permisos de admin
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    const { isAdmin, error: authError } = await verificarAdmin(token);

    if (authError) {
      return res.status(401).json({ message: authError });
    }

    if (!isAdmin) {
      return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador' });
    }

    // Validar campos requeridos
    const { name, address, capacity, opening_time, closing_time } = req.body;
    
    if (!name || !address || !capacity || !opening_time || !closing_time) {
      return res.status(400).json({ 
        error: 'Campos requeridos: name, address, capacity, opening_time, closing_time' 
      });
    }

    const restauranteData = {
      name: name.trim(),
      address: address.trim(),
      phone: req.body.phone?.trim() || null,
      email: req.body.email?.trim() || null,
      capacity: Number(capacity),
      opening_time: opening_time.trim(),
      closing_time: closing_time.trim(),
      is_active: parseBoolean(req.body.is_active ?? true),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Usar el cliente autenticado con el token del admin para que pase las políticas RLS
    const { data: authData } = await supabaseAdmin.auth.getUser(token);
    const supabaseWithAuth = supabase.auth.setSession({
      access_token: token,
      refresh_token: '' // No necesario para esta operación
    });

    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .insert([restauranteData])
      .select()
      .single();

    if (error) {
      console.error('Error creando restaurante:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Restaurante creado:', data.name);
    res.status(201).json(data);
  } catch (error) {
    console.error('❌ Error creando restaurante:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};

const actualizarRestaurante = async (req, res) => {
  try {
    console.log('=== ACTUALIZANDO RESTAURANTE ===');
    
    const { id } = req.params;

    // Verificar autenticación y permisos de admin
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    const { isAdmin, error: authError } = await verificarAdmin(token);

    if (authError) {
      return res.status(401).json({ message: authError });
    }

    if (!isAdmin) {
      return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador' });
    }

    // Preparar datos de actualización
    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Solo actualizar campos que se proporcionaron
    if (req.body.name !== undefined) updateData.name = req.body.name.trim();
    if (req.body.address !== undefined) updateData.address = req.body.address.trim();
    if (req.body.phone !== undefined) updateData.phone = req.body.phone?.trim() || null;
    if (req.body.email !== undefined) updateData.email = req.body.email?.trim() || null;
    if (req.body.capacity !== undefined) updateData.capacity = Number(req.body.capacity);
    if (req.body.opening_time !== undefined) updateData.opening_time = req.body.opening_time.trim();
    if (req.body.closing_time !== undefined) updateData.closing_time = req.body.closing_time.trim();
    if (req.body.is_active !== undefined) updateData.is_active = parseBoolean(req.body.is_active);

    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Restaurante no encontrado' });
      }
      console.error('Error actualizando restaurante:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Restaurante actualizado:', data.name);
    res.json(data);
  } catch (error) {
    console.error('❌ Error actualizando restaurante:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};

const eliminarRestaurante = async (req, res) => {
  try {
    console.log('=== ELIMINANDO RESTAURANTE ===');
    
    const { id } = req.params;
    
    // Verificar autenticación y permisos de admin
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    const { isAdmin, error: authError } = await verificarAdmin(token);

    if (authError) {
      return res.status(401).json({ message: authError });
    }

    if (!isAdmin) {
      return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador' });
    }

    // Verificar si el restaurante existe antes de eliminarlo
    const { data: existingRestaurant, error: checkError } = await supabaseAdmin
      .from('restaurants')
      .select('id, name')
      .eq('id', id)
      .single();

    if (checkError || !existingRestaurant) {
      return res.status(404).json({ error: 'Restaurante no encontrado' });
    }
    
    // Eliminar restaurante (esto eliminará en cascada productos, pedidos, etc.)
    const { error } = await supabaseAdmin
      .from('restaurants')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error eliminando restaurante:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Restaurante eliminado:', existingRestaurant.name);
    res.json({ 
      message: 'Restaurante eliminado correctamente',
      deletedRestaurant: existingRestaurant
    });
  } catch (error) {
    console.error('Error inesperado eliminando restaurante:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Función para activar/desactivar restaurante (soft delete)
const toggleEstadoRestaurante = async (req, res) => {
  try {
    console.log('=== CAMBIANDO ESTADO RESTAURANTE ===');
    
    const { id } = req.params;
    const { is_active } = req.body;

    // Verificar autenticación y permisos de admin
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    const { isAdmin, error: authError } = await verificarAdmin(token);

    if (authError) {
      return res.status(401).json({ message: authError });
    }

    if (!isAdmin) {
      return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador' });
    }

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active debe ser un booleano' });
    }

    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .update({ 
        is_active: is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Restaurante no encontrado' });
      }
      console.error('Error cambiando estado restaurante:', error);
      return res.status(500).json({ error: error.message });
    }

    const estado = is_active ? 'activado' : 'desactivado';
    console.log(`✅ Restaurante ${estado}:`, data.name);
    res.json({
      message: `Restaurante ${estado} correctamente`,
      restaurant: data
    });
  } catch (error) {
    console.error('Error cambiando estado restaurante:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  obtenerRestaurantes,
  obtenerTodosRestaurantes,
  obtenerRestaurantePorId,
  crearRestaurante,
  actualizarRestaurante,
  eliminarRestaurante,
  toggleEstadoRestaurante
};