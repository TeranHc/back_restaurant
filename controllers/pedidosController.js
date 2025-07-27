// controllers/pedidosController.js
const supabase = require('../services/supabaseClient');

const obtenerPedidos = async (req, res) => {
  try {
    const { data, error } = await supabase.from('pedidos').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const crearPedido = async (req, res) => {
  try {
    const { data, error } = await supabase.from('pedidos').insert([req.body]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const actualizarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('pedidos')
      .update(req.body)
      .eq('id', id)
      .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const eliminarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('pedidos').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Pedido eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { obtenerPedidos, crearPedido, actualizarPedido, eliminarPedido };