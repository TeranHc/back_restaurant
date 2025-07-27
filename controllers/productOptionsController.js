// controllers/productOptionsController.js
const supabase = require('../services/supabaseClient');

const obtenerOpcionesProducto = async (req, res) => {
  try {
    const { product_id } = req.query

    let query = supabase.from('product_options').select('*')

    if (product_id) {
      query = query.eq('product_id', product_id)
    }

    query = query.eq('is_active', true)

    const { data, error } = await query

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const crearOpcionProducto = async (req, res) => {
  try {
    const { data, error } = await supabase.from('product_options').insert([req.body]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const actualizarOpcionProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('product_options')
      .update(req.body)
      .eq('id', id)
      .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const eliminarOpcionProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('product_options')
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Opción de producto desactivada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { obtenerOpcionesProducto, crearOpcionProducto, actualizarOpcionProducto, eliminarOpcionProducto };