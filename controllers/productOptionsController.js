// controllers/productOptionsController.js
const { supabase, supabaseAdmin } = require('../services/supabaseClient');

// Helper para verificar autenticación y rol ADMIN
const verifyAdmin = async (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !userData.user) {
      return false;
    }

    // Verificar rol ADMIN
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    return profile?.role === 'ADMIN';
  } catch (error) {
    console.error('Error verificando admin:', error);
    return false;
  }
};

// Obtener opciones de producto (PÚBLICO)
const obtenerOpcionesProducto = async (req, res) => {
  try {
    console.log('🔍 Obteniendo opciones de producto...');
    
    const { product_id } = req.query;

    let query = supabaseAdmin // Usar supabaseAdmin para bypass RLS
      .from('product_options')
      .select('*')
      .eq('is_active', true)
      .order('option_type', { ascending: true });

    if (product_id) {
      const productIdNumber = parseInt(product_id, 10);
      if (isNaN(productIdNumber)) {
        return res.status(400).json({ error: 'product_id debe ser un número válido' });
      }
      query = query.eq('product_id', productIdNumber);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error obteniendo opciones:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Se obtuvieron ${data?.length || 0} opciones`);
    res.json(data || []);

  } catch (error) {
    console.error('❌ Error interno obteniendo opciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear opción de producto (SOLO ADMIN)
const crearOpcionProducto = async (req, res) => {
  try {
    console.log('📝 Creando opción de producto:', req.body);

    // Verificar que sea ADMIN
    const isAdmin = await verifyAdmin(req.headers.authorization);
    if (!isAdmin) {
      return res.status(403).json({ 
        error: 'Acceso denegado. Se requiere rol de administrador' 
      });
    }

    // Validación
    const { product_id, option_type, option_value } = req.body;

    if (!product_id || !option_type || !option_value) {
      return res.status(400).json({ 
        error: 'product_id, option_type y option_value son requeridos' 
      });
    }

    const opcionData = {
      product_id: parseInt(product_id, 10),
      option_type: option_type.trim(),
      option_value: option_value.trim(),
      is_active: req.body.is_active !== undefined ? req.body.is_active : true
    };

    if (isNaN(opcionData.product_id)) {
      return res.status(400).json({ error: 'product_id debe ser un número válido' });
    }
    
    const { data, error } = await supabaseAdmin
      .from('product_options')
      .insert([opcionData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creando opción:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Opción creada correctamente');
    res.status(201).json(data);

  } catch (error) {
    console.error('❌ Error creando opción:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar opción de producto (SOLO ADMIN)
const actualizarOpcionProducto = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📝 Actualizando opción ID: ${id}`);

    // Verificar que sea ADMIN
    const isAdmin = await verifyAdmin(req.headers.authorization);
    if (!isAdmin) {
      return res.status(403).json({ 
        error: 'Acceso denegado. Se requiere rol de administrador' 
      });
    }

    const updateData = { ...req.body };
    
    // Si se proporciona product_id, convertir a número
    if (updateData.product_id) {
      updateData.product_id = parseInt(updateData.product_id, 10);
      if (isNaN(updateData.product_id)) {
        return res.status(400).json({ error: 'product_id debe ser un número válido' });
      }
    }

    // Agregar timestamp de actualización
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('product_options')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error actualizando opción:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Opción no encontrada' });
    }

    console.log('✅ Opción actualizada correctamente');
    res.json(data);

  } catch (error) {
    console.error('❌ Error actualizando opción:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar opción de producto (SOLO ADMIN)
const eliminarOpcionProducto = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Eliminando opción ID: ${id}`);

    // Verificar que sea ADMIN
    const isAdmin = await verifyAdmin(req.headers.authorization);
    if (!isAdmin) {
      return res.status(403).json({ 
        error: 'Acceso denegado. Se requiere rol de administrador' 
      });
    }

    const { error } = await supabaseAdmin
      .from('product_options')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error eliminando opción:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Opción eliminada correctamente');
    res.json({ message: 'Opción de producto eliminada correctamente' });

  } catch (error) {
    console.error('❌ Error eliminando opción:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { 
  obtenerOpcionesProducto, 
  crearOpcionProducto, 
  actualizarOpcionProducto, 
  eliminarOpcionProducto 
};