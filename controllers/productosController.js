const supabase = require('../services/supabaseClient');
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

// Obtener todos los productos con relaciones
const obtenerProductos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('productos')
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
      `);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear un nuevo producto
const crearProducto = async (req, res) => {
  try {
    console.log('📥 Body recibido:', req.body);
    console.log('📥 Archivo recibido:', req.file);

    // Validación
    if (!req.body.nombre) {
      return res.status(400).json({ 
        error: 'El campo "nombre" es requerido' 
      });
    }

    // Construir objeto del producto (nombres de columnas corregidos)
    const productoData = {
      nombre: req.body.nombre,
      descripcion: req.body.descripcion || '',
      precio: parseFloat(req.body.precio),
      disponible: req.body.disponible === 'true',
      category_id: parseInt(req.body.categoryId),  // ← Cambiado a category_id
      restaurant_id: parseInt(req.body.restaurantId), // ← Cambiado a restaurant_id
    }

    // Si hay imagen, agregar la ruta
    if (req.file) {
      productoData.imagen = `/uploads/${req.file.filename}`
    }

    console.log('📦 Datos a insertar:', productoData);

    const { data, error } = await supabase
      .from('productos')
      .insert([productoData])
      .select();

    if (error) {
      console.error('❌ Error de Supabase:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('✅ Producto creado:', data[0]);
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('❌ Error creando producto:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};

// Actualizar un producto
const actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📝 Actualizando producto:', id);
    console.log('📥 Body recibido:', req.body);
    console.log('📥 Archivo recibido:', req.file);

    const productoData = {
      nombre: req.body.nombre,
      descripcion: req.body.descripcion || '',
      precio: parseFloat(req.body.precio),
      disponible: req.body.disponible === 'true',
      category_id: parseInt(req.body.categoryId),  // ← Cambiado a category_id
      restaurant_id: parseInt(req.body.restaurantId), // ← Cambiado a restaurant_id
    }

    // Si hay nueva imagen
    if (req.file) {
      productoData.imagen = `/uploads/${req.file.filename}`
    }

    // Si se marcó eliminar imagen
    if (req.body.eliminarImagen === 'true') {
      productoData.imagen = null
    }

    const { data, error } = await supabase
      .from('productos')
      .update(productoData)
      .eq('id', id)
      .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  } catch (error) {
    console.error('❌ Error actualizando producto:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};

// Eliminar un producto
const eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Aplicar middleware a las funciones que lo necesitan
const crearProductoConMiddleware = [uploadMiddleware, crearProducto];
const actualizarProductoConMiddleware = [uploadMiddleware, actualizarProducto];

module.exports = {
  obtenerProductos,
  crearProducto: crearProductoConMiddleware,
  actualizarProducto: actualizarProductoConMiddleware,
  eliminarProducto,
};