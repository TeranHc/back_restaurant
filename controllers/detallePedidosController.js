// controllers/detallePedidosController.js
const supabase = require('../services/supabaseClient');

const obtenerDetallePedidos = async (req, res) => {
  try {
    const { data, error } = await supabase.from('detalle_pedidos').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const crearDetallePedido = async (req, res) => {
  try {
    const { data, error } = await supabase.from('detalle_pedidos').insert([req.body]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const actualizarDetallePedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('detalle_pedidos')
      .update(req.body)
      .eq('id', id)
      .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const eliminarDetallePedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('detalle_pedidos').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Detalle de pedido eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { obtenerDetallePedidos, crearDetallePedido, actualizarDetallePedido, eliminarDetallePedido };