// controllers/orderItemOptionsController.js
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

// Helper para verificar si el usuario puede acceder al detalle del pedido
const verificarAccesoDetallePedido = async (detallePedidoId, userId, isAdmin = false) => {
  try {
    const { data: detalle, error } = await supabaseAdmin
      .from('detalle_pedidos')
      .select(`
        id,
        pedidos!inner (
          user_id
        )
      `)
      .eq('id', detallePedidoId)
      .single();

    if (error || !detalle) {
      return false;
    }

    // Admin puede acceder a cualquier detalle, usuario solo a los suyos
    return isAdmin || detalle.pedidos.user_id === userId;
  } catch (error) {
    console.error('Error verificando acceso a detalle de pedido:', error);
    return false;
  }
};

// Obtener opciones de items de pedido (USUARIO: sus pedidos, ADMIN: todos)
const obtenerOpcionesItemPedido = async (req, res) => {
  try {
    const { detalle_pedido_id, pedido_id } = req.query;
    console.log('🔧 Obteniendo opciones de items de pedido...');

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    let query = supabaseAdmin
      .from('order_item_options')
      .select(`
        *,
        product_options!inner (
          id,
          option_type,
          option_value,
          is_active,
          productos!inner (
            id,
            nombre
          )
        ),
        detalle_pedidos!inner (
          id,
          pedido_id,
          producto_id,
          cantidad,
          pedidos!inner (
            id,
            order_number,
            user_id,
            estado
          )
        )
      `);

    // Si se especifica un detalle de pedido específico
    if (detalle_pedido_id) {
      console.log(`🔍 Filtrando por detalle de pedido: ${detalle_pedido_id}`);
      
      // Verificar acceso al detalle
      const puedeAcceder = await verificarAccesoDetallePedido(
        detalle_pedido_id, 
        user.id, 
        profile?.role === 'ADMIN'
      );

      if (!puedeAcceder) {
        return res.status(403).json({ 
          error: 'No tienes acceso a este detalle de pedido' 
        });
      }

      query = query.eq('detalle_pedido_id', detalle_pedido_id);
    } 
    // Si se especifica un pedido específico
    else if (pedido_id) {
      console.log(`🔍 Filtrando por pedido: ${pedido_id}`);
      query = query.eq('detalle_pedidos.pedido_id', pedido_id);
    }

    // Si no es admin, solo puede ver opciones de sus propios pedidos
    if (profile?.role !== 'ADMIN') {
      query = query.eq('detalle_pedidos.pedidos.user_id', user.id);
    }

    const { data, error } = await query.order('id', { ascending: true });

    if (error) {
      console.error('❌ Error obteniendo opciones de items:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Se obtuvieron ${data?.length || 0} opciones de items`);
    res.json(data || []);

  } catch (error) {
    console.error('❌ Error interno obteniendo opciones de items:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener opción de item por ID
const obtenerOpcionItemPorId = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Obteniendo opción de item ID: ${id}`);

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    const { data, error } = await supabaseAdmin
      .from('order_item_options')
      .select(`
        *,
        product_options!inner (
          id,
          option_type,
          option_value,
          is_active,
          productos!inner (
            id,
            nombre
          )
        ),
        detalle_pedidos!inner (
          id,
          pedido_id,
          producto_id,
          pedidos!inner (
            id,
            order_number,
            user_id,
            estado
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Error obteniendo opción de item:', error);
      return res.status(404).json({ error: 'Opción de item no encontrada' });
    }

    // Verificar acceso
    const puedeAcceder = await verificarAccesoDetallePedido(
      data.detalle_pedido_id, 
      user.id, 
      profile?.role === 'ADMIN'
    );

    if (!puedeAcceder) {
      return res.status(403).json({ 
        error: 'No tienes acceso a esta opción de item' 
      });
    }

    console.log('✅ Opción de item obtenida correctamente');
    res.json(data);

  } catch (error) {
    console.error('❌ Error interno obteniendo opción de item:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear opción de item de pedido (USUARIO: sus pedidos, ADMIN: todos)
const crearOpcionItemPedido = async (req, res) => {
  try {
    console.log('📝 Creando opción de item de pedido:', req.body);

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    // Validación de campos requeridos
    const { detalle_pedido_id, product_option_id } = req.body;

    if (!detalle_pedido_id || !product_option_id) {
      return res.status(400).json({ 
        error: 'detalle_pedido_id y product_option_id son requeridos' 
      });
    }

    // Verificar acceso al detalle del pedido
    const puedeAcceder = await verificarAccesoDetallePedido(
      detalle_pedido_id, 
      user.id, 
      profile?.role === 'ADMIN'
    );

    if (!puedeAcceder) {
      return res.status(403).json({ 
        error: 'No tienes acceso a este detalle de pedido' 
      });
    }

    // Verificar que la opción de producto existe y está activa
    const { data: productOption, error: optionError } = await supabaseAdmin
      .from('product_options')
      .select(`
        id,
        option_type,
        option_value,
        is_active,
        product_id
      `)
      .eq('id', product_option_id)
      .single();

    if (optionError || !productOption) {
      return res.status(404).json({ 
        error: 'Opción de producto no encontrada' 
      });
    }

    if (!productOption.is_active) {
      return res.status(400).json({ 
        error: 'La opción de producto no está activa' 
      });
    }

    // Verificar que el detalle del pedido corresponde al producto de la opción
    const { data: detallePedido, error: detalleError } = await supabaseAdmin
      .from('detalle_pedidos')
      .select(`
        id,
        producto_id,
        pedidos!inner (
          estado
        )
      `)
      .eq('id', detalle_pedido_id)
      .single();

    if (detalleError || !detallePedido) {
      return res.status(404).json({ 
        error: 'Detalle de pedido no encontrado' 
      });
    }

    if (detallePedido.producto_id !== productOption.product_id) {
      return res.status(400).json({ 
        error: 'La opción no corresponde al producto del detalle del pedido' 
      });
    }

    // No permitir modificar pedidos ya procesados (excepto admin)
    if (detallePedido.pedidos.estado !== 'pendiente' && profile?.role !== 'ADMIN') {
      return res.status(400).json({ 
        error: 'No se pueden agregar opciones a un pedido que ya está siendo procesado' 
      });
    }

    // Verificar si la opción ya existe para este detalle
    const { data: opcionExistente, error: checkError } = await supabaseAdmin
      .from('order_item_options')
      .select('id')
      .eq('detalle_pedido_id', detalle_pedido_id)
      .eq('product_option_id', product_option_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error verificando opción existente:', checkError);
      return res.status(500).json({ error: checkError.message });
    }

    if (opcionExistente) {
      return res.status(400).json({ 
        error: 'Esta opción ya está seleccionada para este item' 
      });
    }

    const opcionData = {
      detalle_pedido_id: parseInt(detalle_pedido_id),
      product_option_id: parseInt(product_option_id),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('order_item_options')
      .insert([opcionData])
      .select(`
        *,
        product_options (
          id,
          option_type,
          option_value
        )
      `)
      .single();

    if (error) {
      console.error('❌ Error creando opción de item:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Opción de item creada correctamente');
    res.status(201).json(data);

  } catch (error) {
    console.error('❌ Error creando opción de item:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar opción de item (SOLO ADMIN o propietario en pedidos pendientes)
const actualizarOpcionItemPedido = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📝 Actualizando opción de item ID: ${id}`);

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    // Obtener la opción actual
    const { data: opcionActual, error: getError } = await supabaseAdmin
      .from('order_item_options')
      .select(`
        *,
        detalle_pedidos!inner (
          pedidos!inner (
            user_id,
            estado
          )
        )
      `)
      .eq('id', id)
      .single();

    if (getError || !opcionActual) {
      return res.status(404).json({ 
        error: 'Opción de item no encontrada' 
      });
    }

    // Verificar acceso
    const puedeAcceder = await verificarAccesoDetallePedido(
      opcionActual.detalle_pedido_id, 
      user.id, 
      profile?.role === 'ADMIN'
    );

    if (!puedeAcceder) {
      return res.status(403).json({ 
        error: 'No tienes acceso a esta opción de item' 
      });
    }

    // No permitir modificar pedidos ya procesados (excepto admin)
    if (opcionActual.detalle_pedidos.pedidos.estado !== 'pendiente' && profile?.role !== 'ADMIN') {
      return res.status(400).json({ 
        error: 'No se pueden modificar opciones de un pedido que ya está siendo procesado' 
      });
    }

    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('order_item_options')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        product_options (
          id,
          option_type,
          option_value
        )
      `)
      .single();

    if (error) {
      console.error('❌ Error actualizando opción de item:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Opción de item actualizada correctamente');
    res.json(data);

  } catch (error) {
    console.error('❌ Error actualizando opción de item:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar opción de item (SOLO ADMIN o propietario en pedidos pendientes)
const eliminarOpcionItemPedido = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Eliminando opción de item ID: ${id}`);

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    // Obtener la opción actual
    const { data: opcionActual, error: getError } = await supabaseAdmin
      .from('order_item_options')
      .select(`
        *,
        detalle_pedidos!inner (
          pedidos!inner (
            user_id,
            estado
          )
        )
      `)
      .eq('id', id)
      .single();

    if (getError || !opcionActual) {
      return res.status(404).json({ 
        error: 'Opción de item no encontrada' 
      });
    }

    // Verificar acceso
    const puedeAcceder = await verificarAccesoDetallePedido(
      opcionActual.detalle_pedido_id, 
      user.id, 
      profile?.role === 'ADMIN'
    );

    if (!puedeAcceder) {
      return res.status(403).json({ 
        error: 'No tienes acceso a esta opción de item' 
      });
    }

    // No permitir eliminar opciones de pedidos ya procesados (excepto admin)
    if (opcionActual.detalle_pedidos.pedidos.estado !== 'pendiente' && profile?.role !== 'ADMIN') {
      return res.status(400).json({ 
        error: 'No se pueden eliminar opciones de un pedido que ya está siendo procesado' 
      });
    }

    const { error } = await supabaseAdmin
      .from('order_item_options')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error eliminando opción de item:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Opción de item eliminada correctamente');
    res.json({ message: 'Opción de item de pedido eliminada correctamente' });

  } catch (error) {
    console.error('❌ Error eliminando opción de item:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear múltiples opciones de item para un detalle (BULK)
const crearOpcionesMultiples = async (req, res) => {
  try {
    console.log('📝 Creando múltiples opciones de item:', req.body);

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    const { detalle_pedido_id, product_option_ids } = req.body;

    if (!detalle_pedido_id || !Array.isArray(product_option_ids) || product_option_ids.length === 0) {
      return res.status(400).json({ 
        error: 'detalle_pedido_id y product_option_ids (array) son requeridos' 
      });
    }

    // Verificar acceso al detalle del pedido
    const puedeAcceder = await verificarAccesoDetallePedido(
      detalle_pedido_id, 
      user.id, 
      profile?.role === 'ADMIN'
    );

    if (!puedeAcceder) {
      return res.status(403).json({ 
        error: 'No tienes acceso a este detalle de pedido' 
      });
    }

    // Preparar datos para inserción múltiple
    const opcionesData = product_option_ids.map(optionId => ({
      detalle_pedido_id: parseInt(detalle_pedido_id),
      product_option_id: parseInt(optionId),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabaseAdmin
      .from('order_item_options')
      .insert(opcionesData)
      .select(`
        *,
        product_options (
          id,
          option_type,
          option_value
        )
      `);

    if (error) {
      console.error('❌ Error creando opciones múltiples:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ ${data.length} opciones de item creadas correctamente`);
    res.status(201).json(data);

  } catch (error) {
    console.error('❌ Error creando opciones múltiples:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { 
  obtenerOpcionesItemPedido, 
  obtenerOpcionItemPorId,
  crearOpcionItemPedido, 
  actualizarOpcionItemPedido, 
  eliminarOpcionItemPedido,
  crearOpcionesMultiples
};