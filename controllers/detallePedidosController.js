// controllers/detallePedidosController.js
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

// Helper para verificar si el usuario puede acceder al pedido
const verificarAccesoPedido = async (pedidoId, userId, isAdmin = false) => {
  try {
    const { data: pedido, error } = await supabaseAdmin
      .from('pedidos')
      .select('user_id')
      .eq('id', pedidoId)
      .single();

    if (error || !pedido) {
      return false;
    }

    // Admin puede acceder a cualquier pedido, usuario solo a los suyos
    return isAdmin || pedido.user_id === userId;
  } catch (error) {
    console.error('Error verificando acceso a pedido:', error);
    return false;
  }
};

// Obtener detalles de pedidos (USUARIO: sus pedidos, ADMIN: todos)
const obtenerDetallePedidos = async (req, res) => {
  try {
    const { pedido_id } = req.query;
    console.log('📋 Obteniendo detalles de pedidos...');

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    let query = supabaseAdmin
      .from('detalle_pedidos')
      .select(`
        *,
        productos!inner (
          id,
          nombre,
          descripcion,
          precio,
          imagen,
          categories (
            id,
            name
          )
        ),
        pedidos!inner (
          id,
          order_number,
          fecha,
          estado,
          user_id
        ),
        order_item_options (
          id,
          product_options!inner (
            id,
            option_type,
            option_value
          )
        )
      `);

    // Si se especifica un pedido específico
    if (pedido_id) {
      console.log(`🔍 Obteniendo detalles del pedido: ${pedido_id}`);
      
      // Verificar que el usuario puede acceder a este pedido
      const puedeAcceder = await verificarAccesoPedido(
        pedido_id, 
        user.id, 
        profile?.role === 'ADMIN'
      );

      if (!puedeAcceder) {
        return res.status(403).json({ 
          error: 'No tienes acceso a este pedido' 
        });
      }

      query = query.eq('pedido_id', pedido_id);
    } else {
      // Si no es admin, solo puede ver sus propios pedidos
      if (profile?.role !== 'ADMIN') {
        query = query.eq('pedidos.user_id', user.id);
      }
    }

    const { data, error } = await query.order('id', { ascending: true });

    if (error) {
      console.error('❌ Error obteniendo detalles de pedidos:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Se obtuvieron ${data?.length || 0} detalles de pedidos`);
    res.json(data || []);

  } catch (error) {
    console.error('❌ Error interno obteniendo detalles de pedidos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener detalle de pedido por ID
const obtenerDetallePorId = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Obteniendo detalle de pedido ID: ${id}`);

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    const { data, error } = await supabaseAdmin
      .from('detalle_pedidos')
      .select(`
        *,
        productos!inner (
          id,
          nombre,
          descripcion,
          precio,
          imagen,
          categories (
            id,
            name
          )
        ),
        pedidos!inner (
          id,
          order_number,
          fecha,
          estado,
          user_id
        ),
        order_item_options (
          id,
          product_options!inner (
            id,
            option_type,
            option_value
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Error obteniendo detalle:', error);
      return res.status(404).json({ error: 'Detalle de pedido no encontrado' });
    }

    // Verificar acceso
    const puedeAcceder = await verificarAccesoPedido(
      data.pedido_id, 
      user.id, 
      profile?.role === 'ADMIN'
    );

    if (!puedeAcceder) {
      return res.status(403).json({ 
        error: 'No tienes acceso a este detalle de pedido' 
      });
    }

    console.log('✅ Detalle obtenido correctamente');
    res.json(data);

  } catch (error) {
    console.error('❌ Error interno obteniendo detalle:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear detalle de pedido (INTERNO - usado por pedidosController)
const crearDetallePedido = async (req, res) => {
  try {
    console.log('📝 Creando detalle de pedido:', req.body);

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    // Validación de campos requeridos
    const { pedido_id, producto_id, cantidad, unit_price } = req.body;

    if (!pedido_id || !producto_id || !cantidad || !unit_price) {
      return res.status(400).json({ 
        error: 'pedido_id, producto_id, cantidad y unit_price son requeridos' 
      });
    }

    if (cantidad <= 0) {
      return res.status(400).json({ 
        error: 'La cantidad debe ser mayor a 0' 
      });
    }

    // Verificar acceso al pedido
    const puedeAcceder = await verificarAccesoPedido(
      pedido_id, 
      user.id, 
      profile?.role === 'ADMIN'
    );

    if (!puedeAcceder) {
      return res.status(403).json({ 
        error: 'No tienes acceso a este pedido' 
      });
    }

    // Verificar que el producto existe
    const { data: producto, error: productoError } = await supabaseAdmin
      .from('productos')
      .select('id, nombre, precio, disponible')
      .eq('id', producto_id)
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

    // Calcular subtotal
    const subtotal = parseFloat(unit_price) * parseInt(cantidad);

    const detalleData = {
      pedido_id: parseInt(pedido_id),
      producto_id: parseInt(producto_id),
      cantidad: parseInt(cantidad),
      unit_price: parseFloat(unit_price),
      subtotal: subtotal,
      special_instructions: req.body.special_instructions || null
    };

    const { data, error } = await supabaseAdmin
      .from('detalle_pedidos')
      .insert([detalleData])
      .select(`
        *,
        productos (
          id,
          nombre,
          precio,
          imagen
        )
      `)
      .single();

    if (error) {
      console.error('❌ Error creando detalle de pedido:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Detalle de pedido creado correctamente');
    res.status(201).json(data);

  } catch (error) {
    console.error('❌ Error creando detalle de pedido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar detalle de pedido (SOLO ADMIN o propietario del pedido)
const actualizarDetallePedido = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📝 Actualizando detalle de pedido ID: ${id}`);

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    // Obtener el detalle actual
    const { data: detalleActual, error: getError } = await supabaseAdmin
      .from('detalle_pedidos')
      .select(`
        *,
        pedidos!inner (
          user_id,
          estado
        )
      `)
      .eq('id', id)
      .single();

    if (getError || !detalleActual) {
      return res.status(404).json({ 
        error: 'Detalle de pedido no encontrado' 
      });
    }

    // Verificar acceso
    const puedeAcceder = await verificarAccesoPedido(
      detalleActual.pedido_id, 
      user.id, 
      profile?.role === 'ADMIN'
    );

    if (!puedeAcceder) {
      return res.status(403).json({ 
        error: 'No tienes acceso a este detalle de pedido' 
      });
    }

    // No permitir modificar pedidos ya procesados (excepto admin)
    if (detalleActual.pedidos.estado !== 'pendiente' && profile?.role !== 'ADMIN') {
      return res.status(400).json({ 
        error: 'No se puede modificar un pedido que ya está siendo procesado' 
      });
    }

    const updateData = { ...req.body };

    // Recalcular subtotal si se cambia cantidad o precio
    if (updateData.cantidad || updateData.unit_price) {
      const cantidad = updateData.cantidad || detalleActual.cantidad;
      const unitPrice = updateData.unit_price || detalleActual.unit_price;
      updateData.subtotal = parseFloat(unitPrice) * parseInt(cantidad);
    }

    const { data, error } = await supabaseAdmin
      .from('detalle_pedidos')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        productos (
          id,
          nombre,
          precio,
          imagen
        )
      `)
      .single();

    if (error) {
      console.error('❌ Error actualizando detalle de pedido:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Detalle de pedido actualizado correctamente');
    res.json(data);

  } catch (error) {
    console.error('❌ Error actualizando detalle de pedido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar detalle de pedido (SOLO ADMIN o propietario del pedido en estado pendiente)
const eliminarDetallePedido = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Eliminando detalle de pedido ID: ${id}`);

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    // Obtener el detalle actual
    const { data: detalleActual, error: getError } = await supabaseAdmin
      .from('detalle_pedidos')
      .select(`
        *,
        pedidos!inner (
          user_id,
          estado
        )
      `)
      .eq('id', id)
      .single();

    if (getError || !detalleActual) {
      return res.status(404).json({ 
        error: 'Detalle de pedido no encontrado' 
      });
    }

    // Verificar acceso
    const puedeAcceder = await verificarAccesoPedido(
      detalleActual.pedido_id, 
      user.id, 
      profile?.role === 'ADMIN'
    );

    if (!puedeAcceder) {
      return res.status(403).json({ 
        error: 'No tienes acceso a este detalle de pedido' 
      });
    }

    // No permitir eliminar items de pedidos ya procesados (excepto admin)
    if (detalleActual.pedidos.estado !== 'pendiente' && profile?.role !== 'ADMIN') {
      return res.status(400).json({ 
        error: 'No se puede eliminar items de un pedido que ya está siendo procesado' 
      });
    }

    const { error } = await supabaseAdmin
      .from('detalle_pedidos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error eliminando detalle de pedido:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Detalle de pedido eliminado correctamente');
    res.json({ message: 'Detalle de pedido eliminado correctamente' });

  } catch (error) {
    console.error('❌ Error eliminando detalle de pedido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { 
  obtenerDetallePedidos, 
  obtenerDetallePorId,
  crearDetallePedido, 
  actualizarDetallePedido, 
  eliminarDetallePedido 
};