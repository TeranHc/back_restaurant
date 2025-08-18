// controllers/cartController.js
const { supabase, supabaseAdmin } = require('../services/supabaseClient');

// Helper para verificar autenticación
const verifyAuth = async (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, profile: null };
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !userData.user) {
      return { user: null, profile: null };
    }

    // Obtener perfil del usuario
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();

    return { 
      user: userData.user, 
      profile: profileError ? null : profile 
    };
  } catch (error) {
    console.error('Error verificando auth:', error);
    return { user: null, profile: null };
  }
};

// Obtener carrito del usuario autenticado
const obtenerCarrito = async (req, res) => {
  try {
    console.log('🛒 Obteniendo carrito...');

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    // Obtener carrito con información completa del producto
    const { data, error } = await supabaseAdmin
      .from('cart')
      .select(`
        *,
        productos!inner (
          id,
          nombre,
          descripcion,
          precio,
          imagen,
          disponible,
          categories (
            id,
            name
          ),
          restaurants (
            id,
            name
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error obteniendo carrito:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Se obtuvieron ${data?.length || 0} items del carrito`);
    res.json(data || []);

  } catch (error) {
    console.error('❌ Error interno obteniendo carrito:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Agregar producto al carrito
const agregarAlCarrito = async (req, res) => {
  try {
    console.log('📦 Agregando al carrito:', req.body);

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    // Validación de campos requeridos
    const { product_id, quantity } = req.body;

    if (!product_id || !quantity) {
      return res.status(400).json({ 
        error: 'product_id y quantity son requeridos' 
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({ 
        error: 'La cantidad debe ser mayor a 0' 
      });
    }

    // Verificar que el producto existe y está disponible
    const { data: producto, error: productoError } = await supabaseAdmin
      .from('productos')
      .select('id, nombre, disponible')
      .eq('id', product_id)
      .single();

    if (productoError || !producto) {
      return res.status(404).json({ 
        error: 'Producto no encontrado' 
      });
    }

    if (!producto.disponible) {
      return res.status(400).json({ 
        error: 'El producto no está disponible' 
      });
    }

    // Verificar si el producto ya está en el carrito
    const { data: itemExistente, error: checkError } = await supabaseAdmin
      .from('cart')
      .select('*')
      .eq('user_id', user.id)
      .eq('product_id', product_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error verificando item existente:', checkError);
      return res.status(500).json({ error: checkError.message });
    }

    let data, error;

    if (itemExistente) {
      // Actualizar cantidad si ya existe
      const nuevaCantidad = itemExistente.quantity + parseInt(quantity);
      
      const updateResult = await supabaseAdmin
        .from('cart')
        .update({ 
          quantity: nuevaCantidad,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemExistente.id)
        .select(`
          *,
          productos (
            id,
            nombre,
            descripcion,
            precio,
            imagen,
            categories (name),
            restaurants (name)
          )
        `)
        .single();

      data = updateResult.data;
      error = updateResult.error;

      console.log('✅ Cantidad actualizada en carrito existente');
    } else {
      // Crear nuevo item en carrito
      const cartData = {
        user_id: user.id,
        product_id: parseInt(product_id),
        quantity: parseInt(quantity),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const insertResult = await supabaseAdmin
        .from('cart')
        .insert([cartData])
        .select(`
          *,
          productos (
            id,
            nombre,
            descripcion,
            precio,
            imagen,
            categories (name),
            restaurants (name)
          )
        `)
        .single();

      data = insertResult.data;
      error = insertResult.error;

      console.log('✅ Nuevo item agregado al carrito');
    }

    if (error) {
      console.error('❌ Error agregando al carrito:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);

  } catch (error) {
    console.error('❌ Error agregando al carrito:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar cantidad de producto en carrito
const actualizarCarrito = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📝 Actualizando item carrito ID: ${id}`);

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    const { quantity } = req.body;

    // Validar cantidad
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ 
        error: 'La cantidad debe ser mayor a 0' 
      });
    }

    // Verificar que el item pertenece al usuario
    const { data: itemExistente, error: checkError } = await supabaseAdmin
      .from('cart')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (checkError || !itemExistente) {
      return res.status(404).json({ 
        error: 'Item no encontrado en tu carrito' 
      });
    }

    // Actualizar cantidad
    const { data, error } = await supabaseAdmin
      .from('cart')
      .update({ 
        quantity: parseInt(quantity),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        *,
        productos (
          id,
          nombre,
          descripcion,
          precio,
          imagen,
          categories (name),
          restaurants (name)
        )
      `)
      .single();

    if (error) {
      console.error('❌ Error actualizando carrito:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Carrito actualizado correctamente');
    res.json(data);

  } catch (error) {
    console.error('❌ Error actualizando carrito:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar producto del carrito
const eliminarDelCarrito = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Eliminando item carrito ID: ${id}`);

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    // Verificar que el item pertenece al usuario antes de eliminar
    const { data: itemExistente, error: checkError } = await supabaseAdmin
      .from('cart')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (checkError || !itemExistente) {
      return res.status(404).json({ 
        error: 'Item no encontrado en tu carrito' 
      });
    }

    // Eliminar item del carrito
    const { error } = await supabaseAdmin
      .from('cart')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('❌ Error eliminando del carrito:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Item eliminado del carrito correctamente');
    res.json({ message: 'Item eliminado del carrito correctamente' });

  } catch (error) {
    console.error('❌ Error eliminando del carrito:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Limpiar todo el carrito del usuario
const limpiarCarrito = async (req, res) => {
  try {
    console.log('🧹 Limpiando carrito completo...');

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    // Eliminar todos los items del carrito del usuario
    const { error } = await supabaseAdmin
      .from('cart')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('❌ Error limpiando carrito:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Carrito limpiado correctamente');
    res.json({ message: 'Carrito limpiado correctamente' });

  } catch (error) {
    console.error('❌ Error limpiando carrito:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { 
  obtenerCarrito, 
  agregarAlCarrito, 
  actualizarCarrito, 
  eliminarDelCarrito, 
  limpiarCarrito 
};