// controllers/cartController.js - VERSIÓN ACTUALIZADA CON OPCIONES
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

// Helper para calcular precio total de un item del carrito (producto + opciones)
const calcularPrecioItemCarrito = async (cartId) => {
  try {
    const { data: cartItem, error: cartError } = await supabaseAdmin
      .from('cart')
      .select(`
        id,
        quantity,
        productos!inner (
          precio
        )
      `)
      .eq('id', cartId)
      .single();

    if (cartError || !cartItem) {
      return { precioBase: 0, precioOpciones: 0, precioTotal: 0 };
    }

    // Obtener opciones seleccionadas
    const { data: opciones, error: opcionesError } = await supabaseAdmin
      .from('cart_item_options')
      .select(`
        product_options!inner (
          extra_price
        )
      `)
      .eq('cart_id', cartId);

    const precioBase = parseFloat(cartItem.productos.precio);
    const precioOpciones = (opciones || []).reduce((sum, opcion) => {
      return sum + parseFloat(opcion.product_options.extra_price || 0);
    }, 0);

    return {
      precioBase,
      precioOpciones,
      precioTotal: (precioBase + precioOpciones) * cartItem.quantity
    };

  } catch (error) {
    console.error('Error calculando precio:', error);
    return { precioBase: 0, precioOpciones: 0, precioTotal: 0 };
  }
};

// Obtener carrito del usuario autenticado CON OPCIONES Y PRECIOS CALCULADOS
const obtenerCarrito = async (req, res) => {
  try {
    console.log('🛒 Obteniendo carrito con opciones...');

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    // Obtener carrito con información completa del producto Y OPCIONES
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
        ),
        cart_item_options (
          id,
          product_options!inner (
            id,
            option_type,
            option_value,
            extra_price
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error obteniendo carrito:', error);
      return res.status(500).json({ error: error.message });
    }

    // Calcular precios totales para cada item
    const carritoConPrecios = await Promise.all((data || []).map(async (item) => {
      const precios = await calcularPrecioItemCarrito(item.id);
      
      return {
        ...item,
        calculated_prices: {
          precio_base: precios.precioBase,
          precio_opciones: precios.precioOpciones,
          precio_unitario_total: precios.precioBase + precios.precioOpciones,
          precio_total_item: precios.precioTotal
        }
      };
    }));

    // Calcular total general del carrito
    const totalCarrito = carritoConPrecios.reduce((sum, item) => {
      return sum + item.calculated_prices.precio_total_item;
    }, 0);

    console.log(`✅ Se obtuvieron ${data?.length || 0} items del carrito`);
    console.log(`💰 Total del carrito: $${totalCarrito.toFixed(2)}`);
    
    res.json({
      items: carritoConPrecios,
      resumen: {
        total_items: carritoConPrecios.length,
        total_productos: carritoConPrecios.reduce((sum, item) => sum + item.quantity, 0),
        total_carrito: totalCarrito
      }
    });

  } catch (error) {
    console.error('❌ Error interno obteniendo carrito:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Agregar producto al carrito CON OPCIONES
// Reemplaza la función agregarAlCarrito completa con esta versión:

const agregarAlCarrito = async (req, res) => {
  try {
    console.log('📦 Agregando al carrito CON OPCIONES:', req.body);

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    // Validación de campos requeridos
    const { product_id, quantity, selected_options = [] } = req.body;

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
      .select('id, nombre, precio, disponible')
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

    // PROCESAR OPCIONES - Soportar ambos formatos
    let opcionesValidadas = [];
    if (selected_options.length > 0) {
      console.log('🔍 Procesando opciones:', selected_options);
      
      // Verificar si es formato nuevo [{option_id: 47, quantity: 3}] o viejo [47, 47, 47]
      const esFormatoNuevo = selected_options.every(opt => 
        typeof opt === 'object' && opt.option_id && opt.quantity
      );

      if (esFormatoNuevo) {
        // Formato nuevo: [{option_id: 47, quantity: 3}]
        opcionesValidadas = selected_options;
        console.log('✅ Formato nuevo detectado:', opcionesValidadas);
      } else {
        // Formato viejo: [47, 47, 47] - convertir a formato nuevo
        const conteoOpciones = {};
        selected_options.forEach(optId => {
          conteoOpciones[optId] = (conteoOpciones[optId] || 0) + 1;
        });
        
        opcionesValidadas = Object.entries(conteoOpciones).map(([optId, qty]) => ({
          option_id: parseInt(optId),
          quantity: qty
        }));
        
        console.log('🔄 Formato viejo convertido:', opcionesValidadas);
      }

      // Obtener IDs únicos para validar
      const idsUnicos = [...new Set(opcionesValidadas.map(opt => opt.option_id))];

      // Validar que las opciones existen y son válidas
      const { data: opcionesValidas, error: opcionesError } = await supabaseAdmin
        .from('product_options')
        .select('id, option_type, option_value, extra_price')
        .eq('product_id', product_id)
        .eq('is_active', true)
        .in('id', idsUnicos);

      if (opcionesError) {
        console.error('❌ Error validando opciones:', opcionesError);
        return res.status(500).json({ error: opcionesError.message });
      }

      if (opcionesValidas.length !== idsUnicos.length) {
        console.log('❌ Opciones inválidas detectadas:');
        console.log('- Opciones enviadas:', idsUnicos);
        console.log('- Opciones válidas encontradas:', opcionesValidas.map(o => o.id));
        
        return res.status(400).json({ 
          error: 'Una o más opciones seleccionadas no son válidas para este producto' 
        });
      }

      console.log(`✅ Validación exitosa: ${opcionesValidadas.length} tipos de opciones`);
    }

    // IMPORTANTE: Para productos CON OPCIONES, siempre crear un nuevo item
    let debeCrearNuevo = opcionesValidadas.length > 0;

    let data, error;

    if (!debeCrearNuevo) {
      // Verificar si el producto ya está en el carrito SIN OPCIONES
      const { data: itemExistente, error: checkError } = await supabaseAdmin
        .from('cart')
        .select(`
          *,
          cart_item_options (id)
        `)
        .eq('user_id', user.id)
        .eq('product_id', product_id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Error verificando item existente:', checkError);
        return res.status(500).json({ error: checkError.message });
      }

      if (itemExistente && (!itemExistente.cart_item_options || itemExistente.cart_item_options.length === 0)) {
        // Actualizar cantidad si ya existe Y no tiene opciones
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
              id, nombre, descripcion, precio, imagen,
              categories (name), restaurants (name)
            ),
            cart_item_options (
              id,
              product_options (id, option_type, option_value, extra_price)
            )
          `)
          .single();

        data = updateResult.data;
        error = updateResult.error;

        console.log('✅ Cantidad actualizada en carrito existente (sin opciones)');
      } else {
        // Crear nuevo item (porque tiene opciones o no existe)
        debeCrearNuevo = true;
      }
    }

    if (debeCrearNuevo) {
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
        .select('*')
        .single();

      if (insertResult.error) {
        console.error('❌ Error creando item en carrito:', insertResult.error);
        return res.status(500).json({ error: insertResult.error.message });
      }

      const cartId = insertResult.data.id;

      // Agregar opciones con sus cantidades
      if (opcionesValidadas.length > 0) {
        const opcionesData = [];
        
        // Para cada tipo de opción, crear múltiples registros según la cantidad
        opcionesValidadas.forEach(opcion => {
          console.log(`📝 Agregando ${opcion.quantity}x opción ${opcion.option_id}`);
          for (let i = 0; i < opcion.quantity; i++) {
            opcionesData.push({
              cart_id: cartId,
              product_option_id: opcion.option_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        });

        console.log(`🔢 Total de registros de opciones a insertar: ${opcionesData.length}`);

        const { error: opcionesInsertError } = await supabaseAdmin
          .from('cart_item_options')
          .insert(opcionesData);

        if (opcionesInsertError) {
          console.error('❌ Error agregando opciones al carrito:', opcionesInsertError);
          // Limpiar el item del carrito si falló agregar opciones
          await supabaseAdmin.from('cart').delete().eq('id', cartId);
          return res.status(500).json({ error: opcionesInsertError.message });
        }

        console.log(`✅ Se agregaron ${opcionesData.length} opciones al item del carrito`);
      }

      // Obtener el item completo con opciones
      const { data: itemCompleto, error: fetchError } = await supabaseAdmin
        .from('cart')
        .select(`
          *,
          productos (
            id, nombre, descripcion, precio, imagen,
            categories (name), restaurants (name)
          ),
          cart_item_options (
            id,
            product_options (id, option_type, option_value, extra_price)
          )
        `)
        .eq('id', cartId)
        .single();

      data = itemCompleto;
      error = fetchError;

      console.log('✅ Nuevo item agregado al carrito CON OPCIONES');
    }

    if (error) {
      console.error('❌ Error final agregando al carrito:', error);
      return res.status(500).json({ error: error.message });
    }

    // Calcular precios para el item agregado
    const precios = await calcularPrecioItemCarrito(data.id);
    
    const itemConPrecios = {
      ...data,
      calculated_prices: {
        precio_base: precios.precioBase,
        precio_opciones: precios.precioOpciones,
        precio_unitario_total: precios.precioBase + precios.precioOpciones,
        precio_total_item: precios.precioTotal
      }
    };

    res.status(201).json(itemConPrecios);

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
          id, nombre, descripcion, precio, imagen,
          categories (name), restaurants (name)
        ),
        cart_item_options (
          id,
          product_options (id, option_type, option_value, extra_price)
        )
      `)
      .single();

    if (error) {
      console.error('❌ Error actualizando carrito:', error);
      return res.status(500).json({ error: error.message });
    }

    // Calcular precios actualizados
    const precios = await calcularPrecioItemCarrito(data.id);
    
    const itemActualizado = {
      ...data,
      calculated_prices: {
        precio_base: precios.precioBase,
        precio_opciones: precios.precioOpciones,
        precio_unitario_total: precios.precioBase + precios.precioOpciones,
        precio_total_item: precios.precioTotal
      }
    };

    console.log('✅ Carrito actualizado correctamente');
    res.json(itemActualizado);

  } catch (error) {
    console.error('❌ Error actualizando carrito:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar producto del carrito (automáticamente elimina opciones por CASCADE)
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

    // Eliminar item del carrito (las opciones se eliminan automáticamente por CASCADE)
    const { error } = await supabaseAdmin
      .from('cart')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('❌ Error eliminando del carrito:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Item eliminado del carrito correctamente (con opciones)');
    res.json({ message: 'Item eliminado del carrito correctamente' });

  } catch (error) {
    console.error('❌ Error eliminando del carrito:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Limpiar todo el carrito del usuario (automáticamente elimina opciones por CASCADE)
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

    // Eliminar todos los items del carrito del usuario (las opciones se eliminan por CASCADE)
    const { error } = await supabaseAdmin
      .from('cart')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('❌ Error limpiando carrito:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Carrito limpiado correctamente (con todas las opciones)');
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