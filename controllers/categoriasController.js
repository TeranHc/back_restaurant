// controllers/categoriasController.js
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

// Obtener todas las categorías (PÚBLICO - sin autenticación requerida)
const obtenerCategorias = async (req, res) => {
  try {
    console.log('🔍 Obteniendo categorías...');

    // Usar supabaseAdmin para bypass RLS ya que las categorías deben ser públicas
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Error obteniendo categorías:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Se obtuvieron ${data?.length || 0} categorías`);
    
    // Asegurar que siempre se devuelve un array
    res.json(data || []);

  } catch (error) {
    console.error('❌ Error interno obteniendo categorías:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener categoría por ID (PÚBLICO)
const obtenerCategoriaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Obteniendo categoría ID: ${id}`);

    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('❌ Error obteniendo categoría:', error);
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    console.log('✅ Categoría obtenida correctamente');
    res.json(data);

  } catch (error) {
    console.error('❌ Error interno obteniendo categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear nueva categoría (SOLO ADMIN)
const crearCategoria = async (req, res) => {
  try {
    console.log('📝 Creando categoría:', req.body);

    // Verificar que sea ADMIN
    const isAdmin = await verifyAdmin(req.headers.authorization);
    if (!isAdmin) {
      return res.status(403).json({ 
        error: 'Acceso denegado. Se requiere rol de administrador' 
      });
    }

    // Validación
    const { name, description } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ 
        error: 'El nombre de la categoría es requerido' 
      });
    }

    const categoriaData = {
      name: name.trim(),
      description: description?.trim() || '',
      is_active: req.body.is_active !== undefined ? req.body.is_active : true,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert([categoriaData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creando categoría:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Categoría creada correctamente');
    res.status(201).json(data);

  } catch (error) {
    console.error('❌ Error creando categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar categoría (SOLO ADMIN)
const actualizarCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📝 Actualizando categoría ID: ${id}`);

    // Verificar que sea ADMIN
    const isAdmin = await verifyAdmin(req.headers.authorization);
    if (!isAdmin) {
      return res.status(403).json({ 
        error: 'Acceso denegado. Se requiere rol de administrador' 
      });
    }

    const updateData = { ...req.body };

    // Limpiar y validar datos
    if (updateData.name) {
      updateData.name = updateData.name.trim();
      if (updateData.name.length === 0) {
        return res.status(400).json({ error: 'El nombre no puede estar vacío' });
      }
    }

    if (updateData.description) {
      updateData.description = updateData.description.trim();
    }

    // Actualizar sin enviar updated_at
    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error actualizando categoría:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    console.log('✅ Categoría actualizada correctamente');
    res.json(data);

  } catch (error) {
    console.error('❌ Error actualizando categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};


// Eliminar categoría (SOLO ADMIN)
const eliminarCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Eliminando categoría ID: ${id}`);

    // Verificar que sea ADMIN
    const isAdmin = await verifyAdmin(req.headers.authorization);
    if (!isAdmin) {
      return res.status(403).json({ 
        error: 'Acceso denegado. Se requiere rol de administrador' 
      });
    }

    // Verificar si hay productos asociados a esta categoría
    const { data: productosAsociados, error: checkError } = await supabaseAdmin
      .from('productos')
      .select('id')
      .eq('category_id', id)
      .limit(1);

    if (checkError) {
      console.error('❌ Error verificando productos asociados:', checkError);
      return res.status(500).json({ error: 'Error verificando productos asociados' });
    }

    if (productosAsociados && productosAsociados.length > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar la categoría porque tiene productos asociados' 
      });
    }

    // Eliminar categoría
    const { error } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error eliminando categoría:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Categoría eliminada correctamente');
    res.json({ message: 'Categoría eliminada correctamente' });

  } catch (error) {
    console.error('❌ Error eliminando categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { 
  obtenerCategorias, 
  obtenerCategoriaPorId,
  crearCategoria, 
  actualizarCategoria, 
  eliminarCategoria 
};