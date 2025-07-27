// controllers/restaurantsController.js
const supabase = require('../services/supabaseClient');

const obtenerRestaurantes = async (req, res) => {
  try {
    const { data, error } = await supabase.from('restaurants').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const crearRestaurante = async (req, res) => {
  try {
    const { data, error } = await supabase.from('restaurants').insert([req.body]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
  } catch (error) {
  console.error('❌ Error actualizando restaurante:', error);
  res.status(500).json({ error: error.message || 'Error interno del servidor' });
}

};

const actualizarRestaurante = async (req, res) => {
    console.log('🔧 [PUT] Body recibido:', req.body)
    console.log('🔧 [PUT] ID del restaurante:', req.params.id)

    try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('restaurants')
      .update(req.body)
      .eq('id', id)
      .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  } catch (error) {
  console.error('❌ Error actualizando restaurante:', error)
  res.status(500).json({ error: error.message || 'Error interno del servidor' })
}


};

const eliminarRestaurante = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('restaurants').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Restaurante eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { obtenerRestaurantes, crearRestaurante, actualizarRestaurante, eliminarRestaurante };