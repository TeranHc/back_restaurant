// controllers/reservationsController.js
const supabase = require('../services/supabaseClient');

const obtenerReservaciones = async (req, res) => {
  try {
    const { data, error } = await supabase.from('reservations').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const crearReservacion = async (req, res) => {
  try {
    const { data, error } = await supabase.from('reservations').insert([req.body]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const actualizarReservacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('reservations')
      .update(req.body)
      .eq('id', id)
      .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const eliminarReservacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('reservations').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Reservación eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { obtenerReservaciones, crearReservacion, actualizarReservacion, eliminarReservacion };