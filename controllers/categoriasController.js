// controllers/categoriasController.js
const supabase = require('../services/supabaseClient');

const obtenerCategorias = async (req, res) => {
  try {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const crearCategoria = async (req, res) => {
  try {
    const { data, error } = await supabase.from('categories').insert([req.body]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const actualizarCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('categories')
      .update(req.body)
      .eq('id', id)
      .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const eliminarCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Categoría eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { obtenerCategorias, crearCategoria, actualizarCategoria, eliminarCategoria };