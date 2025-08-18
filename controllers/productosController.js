// controllers/productosController.js
const { supabase, supabaseAdmin } = require('../services/supabaseClient');
const multer = require('multer');
const path = require('path');

// Configurar multer para manejar archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ storage: storage })
const uploadMiddleware = upload.single('imagen')

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

// Obtener todos los productos - MODIFICADO para mostrar TODOS los productos
const obtenerProductos = async (req, res) => {
  try {
    console.log('🔍 Obteniendo productos...');

    // CAMBIO PRINCIPAL: Usamos LEFT JOIN en lugar de INNER JOIN
    // y removemos todos los filtros restrictivos para mostrar TODOS los productos
    const { data, error } = await supabaseAdmin
      .from('productos')
      .select(`
        *,
        categories (
          id,
          name,
          description,
          is_active
        ),
        restaurants (
          id,
          name,
          address,
          phone,
          is_active
        )
      `)
      // Removemos TODOS los filtros para obtener todos los productos
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error obteniendo productos:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Se obtuvieron ${data?.length || 0} productos (TODOS - disponibles y no disponibles)`);
    res.json(data || []);

  } catch (error) {
    console.error('❌ Error interno obteniendo productos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener producto por ID - MODIFICADO para mostrar cualquier producto
const obtenerProductoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Obteniendo producto ID: ${id}`);

    const { data, error } = await supabaseAdmin
      .from('productos')
      .select(`
        *,
        categories (
          id,
          name,
          description
        ),
        restaurants (
          id,
          name,
          address,
          phone
        ),
        product_options (
          id,
          option_type,
          option_value,
          is_active
        )
      `)
      .eq('id', id)
      // Removemos el filtro .eq('disponible', true)
      .single();

    if (error) {
      console.error('❌ Error obteniendo producto:', error);
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    console.log('✅ Producto obtenido correctamente');
    res.json(data);

  } catch (error) {
    console.error('❌ Error interno obteniendo producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear un nuevo producto (SOLO ADMIN)
const crearProducto = async (req, res) => {
  try {
    console.log('📥 Body recibido:', req.body);
    console.log('📥 Archivo recibido:', req.file);

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user || profile?.role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Acceso denegado. Se requiere rol de administrador' 
      });
    }

    // Validación
    if (!req.body.nombre) {
      return res.status(400).json({ 
        error: 'El campo "nombre" es requerido' 
      });
    }

    // Construir objeto del producto
    const productoData = {
      nombre: req.body.nombre,
      descripcion: req.body.descripcion || '',
      precio: parseFloat(req.body.precio),
      disponible: req.body.disponible === 'true' || req.body.disponible === true,
      category_id: parseInt(req.body.categoryId),
      restaurant_id: parseInt(req.body.restaurantId),
    }

    // Si hay imagen, agregar la ruta
    if (req.file) {
      productoData.imagen = `/uploads/${req.file.filename}`
    }

    console.log('📦 Datos a insertar:', productoData);

    // Usar supabaseAdmin para crear producto
    const { data, error } = await supabaseAdmin
      .from('productos')
      .insert([productoData])
      .select(`
        *,
        categories (
          id,
          name
        ),
        restaurants (
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('❌ Error de Supabase:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('✅ Producto creado:', data);
    res.status(201).json(data);

  } catch (error) {
    console.error('❌ Error creando producto:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};

// Actualizar un producto (SOLO ADMIN)
const actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📝 Actualizando producto:', id);

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user || profile?.role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Acceso denegado. Se requiere rol de administrador' 
      });
    }

    const productoData = {
      nombre: req.body.nombre,
      descripcion: req.body.descripcion || '',
      precio: parseFloat(req.body.precio),
      disponible: req.body.disponible === 'true' || req.body.disponible === true,
      category_id: parseInt(req.body.categoryId),
      restaurant_id: parseInt(req.body.restaurantId),
      updated_at: new Date().toISOString()
    }

    // Si hay nueva imagen
    if (req.file) {
      productoData.imagen = `/uploads/${req.file.filename}`
    }

    // Si se marcó eliminar imagen
    if (req.body.eliminarImagen === 'true') {
      productoData.imagen = null
    }

    // Usar supabaseAdmin para actualizar
    const { data, error } = await supabaseAdmin
      .from('productos')
      .update(productoData)
      .eq('id', id)
      .select(`
        *,
        categories (
          id,
          name
        ),
        restaurants (
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('❌ Error actualizando producto:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Producto actualizado correctamente');
    res.json(data);

  } catch (error) {
    console.error('❌ Error actualizando producto:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};

// Eliminar un producto (SOLO ADMIN)
const eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar autenticación
    const { user, profile } = await verifyAuth(req.headers.authorization);
    
    if (!user || profile?.role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Acceso denegado. Se requiere rol de administrador' 
      });
    }

    // Usar supabaseAdmin para eliminar
    const { error } = await supabaseAdmin
      .from('productos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error eliminando producto:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Producto eliminado correctamente');
    res.json({ message: 'Producto eliminado correctamente' });

  } catch (error) {
    console.error('❌ Error eliminando producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Aplicar middleware a las funciones que lo necesitan
const crearProductoConMiddleware = [uploadMiddleware, crearProducto];
const actualizarProductoConMiddleware = [uploadMiddleware, actualizarProducto];

module.exports = {
  obtenerProductos,
  obtenerProductoPorId,
  crearProducto: crearProductoConMiddleware,
  actualizarProducto: actualizarProductoConMiddleware,
  eliminarProducto,
};