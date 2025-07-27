// controllers/availableSlotsController.js
const supabase = require('../services/supabaseClient');

const obtenerHorariosDisponibles = async (req, res) => {
  try {
    const { data, error } = await supabase.from('available_slots').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const crearHorarioDisponible = async (req, res) => {
  try {
    const { data, error } = await supabase.from('available_slots').insert([req.body]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const actualizarHorarioDisponible = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('available_slots')
      .update(req.body)
      .eq('id', id)
      .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const eliminarHorarioDisponible = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('available_slots').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Horario disponible eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { obtenerHorariosDisponibles, crearHorarioDisponible, actualizarHorarioDisponible, eliminarHorarioDisponible };