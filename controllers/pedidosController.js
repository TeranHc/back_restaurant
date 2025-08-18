// controllers/pedidosController.js
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

// Generar número de orden único
const generarNumeroOrden = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}-${random}`;
};

// Obtener pedidos (USUARIO: sus pedidos, ADMIN: todos)
const obtenerPedidos = async (req, res) => {
  try {
    console.log('📋 Obteniendo pedidos...');

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    let query = supabaseAdmin
      .from('pedidos')
      .select(`
        *,
        user_profiles!inner (
          id,
          first_name,
          last_name,
          phone
        ),
        detalle_pedidos (
          id,
          cantidad,
          unit_price,
          subtotal,
          productos (
            id,
            nombre,
            imagen
          )
        )
      `);

    // Si no es admin, solo mostrar sus propios pedidos
    if (profile?.role !== 'ADMIN') {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error obteniendo pedidos:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Se obtuvieron ${data?.length || 0} pedidos`);
    res.json(data || []);

  } catch (error) {
    console.error('❌ Error interno obteniendo pedidos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};


// Crear pedido desde carrito SIN limpiar carrito
const crearPedidoManteniendoCarrito = async (req, res) => {
  try {
    console.log('📝 Creando pedido desde carrito (sin limpiar)...');

    // 1️⃣ Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    // 2️⃣ Obtener carrito del usuario con productos
    const { data: cartItems, error: cartError } = await supabaseAdmin
      .from('cart')
      .select(`
        id,
        user_id,
        product_id,
        quantity,
        productos!inner (
          id,
          nombre,
          descripcion,
          precio,
          imagen,
          disponible
        )
      `)
      .eq('user_id', user.id);

    if (cartError) {
      console.error('❌ Error obteniendo carrito:', cartError);
      return res.status(500).json({ error: cartError.message });
    }

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío.' });
    }

    // 3️⃣ Validar disponibilidad
    const productosNoDisponibles = cartItems.filter(item => !item.productos?.disponible);
    if (productosNoDisponibles.length > 0) {
      const nombres = productosNoDisponibles.map(item => item.productos?.nombre).join(', ');
      return res.status(400).json({ error: `Productos no disponibles: ${nombres}` });
    }

    // 4️⃣ Calcular total
    const totalCalculado = cartItems.reduce((sum, item) => {
      return sum + (parseFloat(item.productos.precio) * parseInt(item.quantity));
    }, 0);

    // 5️⃣ Crear pedido principal
    const pedidoData = {
      user_id: user.id,
      restaurant_id: 1,
      order_number: generarNumeroOrden(),
      total: totalCalculado,
      estado: 'pendiente',
      fecha: new Date().toISOString(),
      order_type: req.body.tipo_entrega === 'pickup' ? 'PICKUP' : 'DELIVERY',
      delivery_address: req.body.direccion_entrega || null,
      special_instructions: `Teléfono: ${req.body.telefono_contacto || 'No proporcionado'}\nMétodo de pago: ${req.body.metodo_pago || 'No especificado'}\nNotas: ${req.body.notas || 'Ninguna'}`
    };

    const { data: pedido, error: pedidoError } = await supabaseAdmin
      .from('pedidos')
      .insert([pedidoData])
      .select()
      .single();

    if (pedidoError) {
      console.error('❌ Error creando pedido:', pedidoError);
      return res.status(500).json({ error: pedidoError.message });
    }

    // 6️⃣ Crear detalles del pedido
    const detallesData = cartItems.map(item => ({
      pedido_id: pedido.id,
      producto_id: item.product_id,
      cantidad: parseInt(item.quantity),
      unit_price: parseFloat(item.productos.precio),
      subtotal: parseFloat(item.productos.precio) * parseInt(item.quantity)
    }));

    const { data: detalles, error: detallesError } = await supabaseAdmin
      .from('detalle_pedidos')
      .insert(detallesData)
      .select(`
        *,
        productos (
          id,
          nombre,
          precio,
          imagen
        )
      `);

    if (detallesError) {
      console.error('❌ Error creando detalles del pedido:', detallesError);
      // Rollback: eliminar pedido creado
      await supabaseAdmin.from('pedidos').delete().eq('id', pedido.id);
      return res.status(500).json({ error: detallesError.message });
    }

    // 7️⃣ Retornar pedido completo SIN tocar el carrito
    const pedidoCompleto = {
      ...pedido,
      detalle_pedidos: detalles,
      carrito_mantenido: cartItems // Devuelve el carrito tal cual
    };

    console.log(`✅ Pedido creado exitosamente: ${pedido.order_number}`);
    res.status(201).json(pedidoCompleto);

  } catch (error) {
    console.error('❌ ERROR creando pedido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};


// Obtener pedido por ID
const obtenerPedido = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    let query = supabaseAdmin
      .from('pedidos')
      .select(`
        *,
        user_profiles!inner (
          id,
          first_name,
          last_name,
          phone
        ),
        detalle_pedidos (
          id,
          cantidad,
          unit_price,
          subtotal,
          special_instructions,
          productos (
            id,
            nombre,
            descripcion,
            precio,
            imagen,
            categories (name)
          ),
          order_item_options (
            id,
            product_options (
              option_type,
              option_value
            )
          )
        )
      `)
      .eq('id', id);

    // Si no es admin, solo puede ver sus propios pedidos
    if (profile?.role !== 'ADMIN') {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('❌ Error obteniendo pedido:', error);
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    console.log('✅ Pedido obtenido correctamente');
    res.json(data);

  } catch (error) {
    console.error('❌ Error interno obteniendo pedido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear pedido desde carrito (MANTIENE CARRITO INTACTO)
const crearPedido = async (req, res) => {
  try {
    console.log('📝 Creando pedido desde carrito:', req.body);
    console.log('Items en el carrito:', cartItems);

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    // 1. Obtener carrito del usuario CON TODOS LOS CAMPOS NECESARIOS
    const { data: cartItems, error: cartError } = await supabaseAdmin
      .from('cart')
      .select(`
        id,
        user_id,
        product_id,
        quantity,
        created_at,
        productos!inner (
          id,
          nombre,
          descripcion,
          precio,
          imagen,
          disponible
        )
      `)
      .eq('user_id', user.id);

    if (cartError) {
      console.error('❌ Error obteniendo carrito:', cartError);
      return res.status(500).json({ error: cartError.message });
    }

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ 
        error: 'El carrito está vacío. Agrega productos antes de hacer un pedido.' 
      });
    }

    // 2. Validar que todos los productos estén disponibles
    const productosNoDisponibles = cartItems.filter(item => !item.productos.disponible);
    if (productosNoDisponibles.length > 0) {
      const nombres = productosNoDisponibles.map(item => item.productos.nombre).join(', ');
      return res.status(400).json({ 
        error: `Los siguientes productos no están disponibles: ${nombres}` 
      });
    }

    // 3. Calcular total
    const totalCalculado = cartItems.reduce((sum, item) => {
      return sum + (item.productos.precio * item.quantity);
    }, 0);

    // 4. Crear pedido principal
    const pedidoData = {
      user_id: user.id,
      restaurant_id: 1,
      order_number: generarNumeroOrden(),
      total: totalCalculado,
      estado: 'pendiente',
      fecha: new Date().toISOString(),
      order_type: req.body.tipo_entrega === 'pickup' ? 'PICKUP' : 'DELIVERY',
      delivery_address: req.body.direccion_entrega,
      special_instructions: `Teléfono: ${req.body.telefono_contacto}\nMétodo de pago: ${req.body.metodo_pago}\nNotas: ${req.body.notas || 'N/A'}`
    };

    const { data: pedido, error: pedidoError } = await supabaseAdmin
      .from('pedidos')
      .insert([pedidoData])
      .select()
      .single();

    if (pedidoError) {
      console.error('❌ Error creando pedido:', pedidoError);
      return res.status(500).json({ error: pedidoError.message });
    }

    // 5. Crear detalles del pedido
    const detallesData = cartItems.map(item => ({
      pedido_id: pedido.id,
      producto_id: item.product_id,
      cantidad: item.quantity,
      unit_price: item.productos.precio,
      subtotal: item.productos.precio * item.quantity
    }));

    const { data: detalles, error: detallesError } = await supabaseAdmin
      .from('detalle_pedidos')
      .insert(detallesData)
      .select(`
        *,
        productos (
          id,
          nombre,
          precio,
          imagen
        )
      `);

    if (detallesError) {
      console.error('❌ Error creando detalles del pedido:', detallesError);
      // Rollback: eliminar pedido creado
      await supabaseAdmin.from('pedidos').delete().eq('id', pedido.id);
      return res.status(500).json({ error: detallesError.message });
    }

    // 6. MANTENER CARRITO INTACTO - NO ELIMINAMOS NADA
    console.log('✅ Carrito mantenido para futuras compras');

    // 7. Obtener carrito actualizado para devolver al frontend
    const { data: carritoActualizado, error: carritoError } = await supabaseAdmin
      .from('cart')
      .select(`
        id,
        user_id,
        product_id,
        quantity,
        created_at,
        productos!inner (
          id,
          nombre,
          descripcion,
          precio,
          imagen,
          disponible
        )
      `)
      .eq('user_id', user.id);

    // 8. Retornar pedido completo CON carrito actualizado
    const pedidoCompleto = {
      ...pedido,
      detalle_pedidos: detalles,
      carrito_mantenido: carritoActualizado || [] // Para que el frontend sepa que el carrito sigue ahí
    };

    console.log(`✅ Pedido creado exitosamente: ${pedido.order_number}`);
    console.log(`✅ Carrito mantenido con ${carritoActualizado?.length || 0} items`);
    
    res.status(201).json(pedidoCompleto);

  } catch (error) {
    console.error('❌ Error creando pedido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// FUNCIÓN ACTUALIZADA para reemplazar en pedidosController.js

// Crear pedido Y limpiar carrito (función principal)
const crearPedidoYLimpiarCarrito = async (req, res) => {
  try {
    console.log('📝 Creando pedido y limpiando carrito:', req.body);

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    console.log(`👤 Usuario autenticado: ${user.id}`);

    // 1. Obtener carrito del usuario CON DEBUG
    console.log('🔍 Consultando carrito en Supabase...');
    
    const { data: cartItems, error: cartError } = await supabaseAdmin
      .from('cart')
      .select(`
        id,
        user_id,
        product_id,
        quantity,
        created_at,
        productos!inner (
          id,
          nombre,
          descripcion,
          precio,
          imagen,
          disponible
        )
      `)
      .eq('user_id', user.id);

    console.log('📊 Resultado consulta carrito:', {
      error: cartError,
      itemsCount: cartItems?.length || 0,
      items: cartItems?.map(item => ({
        id: item.id,
        product: item.productos?.nombre,
        quantity: item.quantity,
        precio: item.productos?.precio
      })) || []
    });

    if (cartError) {
      console.error('❌ Error obteniendo carrito:', cartError);
      return res.status(500).json({ error: cartError.message });
    }

    if (!cartItems || cartItems.length === 0) {
      console.log('⚠️ CARRITO VACÍO - No se puede crear pedido');
      return res.status(400).json({ 
        error: 'El carrito está vacío. Agrega productos antes de hacer un pedido.' 
      });
    }

    console.log(`✅ Carrito encontrado con ${cartItems.length} items`);

    // 2. Validar disponibilidad de productos
    const productosNoDisponibles = cartItems.filter(item => !item.productos?.disponible);
    if (productosNoDisponibles.length > 0) {
      const nombres = productosNoDisponibles.map(item => item.productos?.nombre || 'Producto desconocido').join(', ');
      console.log(`❌ Productos no disponibles: ${nombres}`);
      return res.status(400).json({ 
        error: `Los siguientes productos no están disponibles: ${nombres}` 
      });
    }

    // 3. Calcular total del pedido
    const totalCalculado = cartItems.reduce((sum, item) => {
      const precio = parseFloat(item.productos?.precio || 0);
      const cantidad = parseInt(item.quantity || 0);
      return sum + (precio * cantidad);
    }, 0);

    console.log(`💰 Total calculado: $${totalCalculado.toFixed(2)}`);

    // 4. Crear pedido principal
    const pedidoData = {
      user_id: user.id,
      restaurant_id: 1,
      order_number: generarNumeroOrden(),
      total: totalCalculado,
      estado: 'pendiente',
      fecha: new Date().toISOString(),
      order_type: req.body.tipo_entrega === 'pickup' ? 'PICKUP' : 'DELIVERY',
      delivery_address: req.body.direccion_entrega || null,
      special_instructions: `Teléfono: ${req.body.telefono_contacto || 'No proporcionado'}\nMétodo de pago: ${req.body.metodo_pago || 'No especificado'}\nNotas: ${req.body.notas || 'Ninguna'}`
    };

    console.log('📋 Creando pedido principal:', pedidoData);

    const { data: pedido, error: pedidoError } = await supabaseAdmin
      .from('pedidos')
      .insert([pedidoData])
      .select()
      .single();

    if (pedidoError) {
      console.error('❌ Error creando pedido:', pedidoError);
      return res.status(500).json({ error: pedidoError.message });
    }

    console.log(`✅ Pedido creado exitosamente: ${pedido.order_number} (ID: ${pedido.id})`);

    // 5. Crear detalles del pedido
    const detallesData = cartItems.map(item => ({
      pedido_id: pedido.id,
      producto_id: item.product_id,
      cantidad: parseInt(item.quantity),
      unit_price: parseFloat(item.productos.precio),
      subtotal: parseFloat(item.productos.precio) * parseInt(item.quantity)
    }));

    console.log('📄 Creando detalles del pedido:', detallesData);

    const { data: detalles, error: detallesError } = await supabaseAdmin
      .from('detalle_pedidos')
      .insert(detallesData)
      .select(`
        *,
        productos (
          id,
          nombre,
          precio,
          imagen
        )
      `);

    if (detallesError) {
      console.error('❌ Error creando detalles del pedido:', detallesError);
      // Rollback: eliminar pedido creado
      console.log('🔄 Ejecutando rollback - eliminando pedido...');
      await supabaseAdmin.from('pedidos').delete().eq('id', pedido.id);
      return res.status(500).json({ error: detallesError.message });
    }

    console.log(`✅ Detalles del pedido creados: ${detalles.length} items`);

    // 6. LIMPIAR CARRITO - PASO CRÍTICO
    console.log('🧹 INICIANDO LIMPIEZA DEL CARRITO...');
    console.log(`🎯 Eliminando todos los items del usuario: ${user.id}`);
    
    const { error: clearCartError, count } = await supabaseAdmin
      .from('cart')
      .delete({ count: 'exact' })
      .eq('user_id', user.id);

    if (clearCartError) {
      console.error('⚠️ ERROR limpiando carrito (pero pedido fue creado):', clearCartError);
    } else {
      console.log(`✅ CARRITO LIMPIADO EXITOSAMENTE: ${count} items eliminados`);
    }

    // 7. Verificar que el carrito esté realmente vacío
    console.log('🔍 Verificando que carrito esté vacío...');
    const { data: carritoVerificacion, error: verifyError } = await supabaseAdmin
      .from('cart')
      .select('id')
      .eq('user_id', user.id);

    console.log('📊 Verificación carrito:', {
      error: verifyError,
      itemsRestantes: carritoVerificacion?.length || 0
    });

    // 8. Preparar respuesta completa
    const pedidoCompleto = {
      ...pedido,
      detalle_pedidos: detalles,
      carrito_limpiado: !clearCartError,
      items_eliminados_carrito: count || 0,
      carrito_verificado_vacio: (carritoVerificacion?.length || 0) === 0
    };

    console.log(`🎉 PROCESO COMPLETADO EXITOSAMENTE:`);
    console.log(`   📦 Pedido: ${pedido.order_number}`);
    console.log(`   💰 Total: $${pedido.total}`);
    console.log(`   🧹 Carrito limpiado: ${!clearCartError ? 'SÍ' : 'NO'}`);
    console.log(`   📊 Items eliminados: ${count || 0}`);
    
    res.status(201).json(pedidoCompleto);

  } catch (error) {
    console.error('❌ ERROR CRÍTICO creando pedido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar pedido (SOLO ADMIN)
const actualizarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📝 Actualizando pedido ID: ${id}`);

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    // Solo admins pueden actualizar pedidos
    if (profile?.role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Solo los administradores pueden actualizar pedidos' 
      });
    }

    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('pedidos')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        user_profiles (
          first_name,
          last_name,
          phone
        ),
        detalle_pedidos (
          id,
          cantidad,
          unit_price,
          subtotal,
          productos (
            nombre,
            imagen
          )
        )
      `)
      .single();

    if (error) {
      console.error('❌ Error actualizando pedido:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Pedido actualizado correctamente');
    res.json(data);

  } catch (error) {
    console.error('❌ Error actualizando pedido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Cancelar pedido (USUARIO: sus pedidos pendientes, ADMIN: cualquier pedido)
const cancelarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`❌ Cancelando pedido ID: ${id}`);

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    // Obtener el pedido actual
    const { data: pedidoActual, error: getError } = await supabaseAdmin
      .from('pedidos')
      .select('*')
      .eq('id', id)
      .single();

    if (getError || !pedidoActual) {
      return res.status(404).json({ 
        error: 'Pedido no encontrado' 
      });
    }

    // Verificar permisos
    if (profile?.role !== 'ADMIN' && pedidoActual.user_id !== user.id) {
      return res.status(403).json({ 
        error: 'No tienes permiso para cancelar este pedido' 
      });
    }

    // Solo se pueden cancelar pedidos pendientes o en preparación
    if (!['pendiente', 'en_preparacion'].includes(pedidoActual.estado)) {
      return res.status(400).json({ 
        error: 'Solo se pueden cancelar pedidos pendientes o en preparación' 
      });
    }

    // Actualizar estado a cancelado
    const { data, error } = await supabaseAdmin
      .from('pedidos')
      .update({ 
        estado: 'cancelado',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error cancelando pedido:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Pedido cancelado correctamente');
    res.json(data);

  } catch (error) {
    console.error('❌ Error cancelando pedido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar pedido (SOLO ADMIN)
const eliminarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Eliminando pedido ID: ${id}`);

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    // Solo admins pueden eliminar pedidos
    if (profile?.role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Solo los administradores pueden eliminar pedidos' 
      });
    }

    // Verificar que el pedido existe
    const { data: pedidoExistente, error: checkError } = await supabaseAdmin
      .from('pedidos')
      .select('id, estado')
      .eq('id', id)
      .single();

    if (checkError || !pedidoExistente) {
      return res.status(404).json({ 
        error: 'Pedido no encontrado' 
      });
    }

    // Eliminar pedido (los detalles se eliminarán automáticamente por CASCADE)
    const { error } = await supabaseAdmin
      .from('pedidos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error eliminando pedido:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Pedido eliminado correctamente');
    res.json({ message: 'Pedido eliminado correctamente' });

  } catch (error) {
    console.error('❌ Error eliminando pedido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { 
  obtenerPedidos, 
  obtenerPedido,
  crearPedido,                    // Mantiene carrito (caso especial)
  crearPedidoYLimpiarCarrito,     // Limpia carrito (función principal)
  actualizarPedido, 
  cancelarPedido,
  crearPedidoManteniendoCarrito,
  eliminarPedido 
};