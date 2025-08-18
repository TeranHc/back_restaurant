// controllers/restaurantsController.js
const { supabase, supabaseAdmin } = require('../services/supabaseClient');

// Helper para verificar autenticación y rol
const verifyAuth = async (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, profile: null };
  }

  const token = authHeader.split(' ')[1];
  try {
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) return { user: null, profile: null };

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();

    return { user: userData.user, profile: profileError ? null : profile };
  } catch (error) {
    console.error('Error verificando auth:', error);
    return { user: null, profile: null };
  }
};

// Convertir string/valor a boolean
const parseBoolean = (value) => value === true || value === 'true' || value === 'on' || value === '1';

// ============================
// OBTENER RESTAURANTES
// ============================

// Mostrar todos los restaurantes (disponibles e indisponibles) - público
const obtenerRestaurantes = async (req, res) => {
  try {
    console.log('🔍 Obteniendo todos los restaurantes...');
    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error obteniendo restaurantes:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Se obtuvieron ${data?.length || 0} restaurantes`);
    res.json(data || []);
  } catch (error) {
    console.error('❌ Error interno obteniendo restaurantes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener restaurante por ID (cualquier estado)
const obtenerRestaurantePorId = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Obteniendo restaurante ID: ${id}`);

    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('❌ Restaurante no encontrado o error:', error);
      return res.status(404).json({ error: 'Restaurante no encontrado' });
    }

    console.log('✅ Restaurante obtenido correctamente');
    res.json(data);
  } catch (error) {
    console.error('❌ Error interno obteniendo restaurante:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ============================
// CREAR / ACTUALIZAR / ELIMINAR (SOLO ADMIN)
// ============================

const crearRestaurante = async (req, res) => {
  try {
    console.log('📥 Creando restaurante...');
    const { user, profile } = await verifyAuth(req.headers.authorization);

    if (!user || profile?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador' });
    }

    const { name, address, capacity, opening_time, closing_time, phone, email, is_active } = req.body;

    if (!name || !address || !capacity || !opening_time || !closing_time) {
      return res.status(400).json({ error: 'Campos requeridos: name, address, capacity, opening_time, closing_time' });
    }

    const restauranteData = {
      name: name.trim(),
      address: address.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      capacity: Number(capacity),
      opening_time: opening_time.trim(),
      closing_time: closing_time.trim(),
      is_active: parseBoolean(is_active ?? true),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .insert([restauranteData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creando restaurante:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Restaurante creado:', data.name);
    res.status(201).json(data);
  } catch (error) {
    console.error('❌ Error interno creando restaurante:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};

const actualizarRestaurante = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📝 Actualizando restaurante ID:', id);

    const { user, profile } = await verifyAuth(req.headers.authorization);
    if (!user || profile?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador' });
    }

    const updateData = { updated_at: new Date().toISOString() };
    const campos = ['name','address','phone','email','capacity','opening_time','closing_time','is_active'];
    campos.forEach(campo => {
      if (req.body[campo] !== undefined) {
        updateData[campo] = campo === 'is_active' ? parseBoolean(req.body[campo]) : req.body[campo];
      }
    });

    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error actualizando restaurante:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Restaurante actualizado:', data.name);
    res.json(data);
  } catch (error) {
    console.error('❌ Error interno actualizando restaurante:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};

const eliminarRestaurante = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Eliminando restaurante ID:', id);

    const { user, profile } = await verifyAuth(req.headers.authorization);
    if (!user || profile?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador' });
    }

    // Comprobar existencia
    const { data: existingRestaurant, error: checkError } = await supabaseAdmin
      .from('restaurants')
      .select('id,name')
      .eq('id', id)
      .single();

    if (checkError || !existingRestaurant) {
      return res.status(404).json({ error: 'Restaurante no encontrado' });
    }

    const { error } = await supabaseAdmin
      .from('restaurants')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error eliminando restaurante:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Restaurante eliminado:', existingRestaurant.name);
    res.json({ message: 'Restaurante eliminado correctamente', deletedRestaurant: existingRestaurant });
  } catch (error) {
    console.error('❌ Error interno eliminando restaurante:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Activar / desactivar restaurante
const toggleEstadoRestaurante = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const { user, profile } = await verifyAuth(req.headers.authorization);
    if (!user || profile?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador' });
    }

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active debe ser un booleano' });
    }

    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error cambiando estado restaurante:', error);
      return res.status(500).json({ error: error.message });
    }

    const estado = is_active ? 'activado' : 'desactivado';
    console.log(`✅ Restaurante ${estado}:`, data.name);
    res.json({ message: `Restaurante ${estado} correctamente`, restaurant: data });
  } catch (error) {
    console.error('❌ Error interno cambiando estado restaurante:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  obtenerRestaurantes,
  obtenerRestaurantePorId,
  crearRestaurante,
  actualizarRestaurante,
  eliminarRestaurante,
  toggleEstadoRestaurante
};
