// controllers/cartController.js
const supabase = require('../services/supabaseClient');

const obtenerCarrito = async (req, res) => {
  try {
    const { data, error } = await supabase.from('cart').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const agregarAlCarrito = async (req, res) => {
  try {
    const { data, error } = await supabase.from('cart').insert([req.body]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const actualizarCarrito = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('cart')
      .update(req.body)
      .eq('id', id)
      .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const eliminarDelCarrito = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('cart').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Item eliminado del carrito' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { obtenerCarrito, agregarAlCarrito, actualizarCarrito, eliminarDelCarrito };