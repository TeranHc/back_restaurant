// controllers/orderItemOptionsController.js
const supabase = require('../services/supabaseClient');

const obtenerOpcionesItemPedido = async (req, res) => {
  try {
    const { data, error } = await supabase.from('order_item_options').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const crearOpcionItemPedido = async (req, res) => {
  try {
    const { data, error } = await supabase.from('order_item_options').insert([req.body]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const actualizarOpcionItemPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('order_item_options')
      .update(req.body)
      .eq('id', id)
      .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const eliminarOpcionItemPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('order_item_options').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Opción de item de pedido eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { obtenerOpcionesItemPedido, crearOpcionItemPedido, actualizarOpcionItemPedido, eliminarOpcionItemPedido };