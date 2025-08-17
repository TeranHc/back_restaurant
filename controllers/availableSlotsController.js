// controllers/availableSlotsController.js
const { supabase, supabaseAdmin } = require('../services/supabaseClient'); // ← CAMBIO AQUÍ

const obtenerHorariosDisponibles = async (req, res) => {
  try {
    // ← CAMBIO: usar supabaseAdmin para obtener todos los slots (bypassa RLS)
    const { data, error } = await supabaseAdmin.from('available_slots').select('*');
    
    if (error) {
      console.error('Error obteniendo horarios disponibles:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Se obtuvieron ${data.length} slots disponibles`);
    res.json(data);
  } catch (error) {
    console.error('Error inesperado obteniendo horarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const crearHorarioDisponible = async (req, res) => {
  try {
    // ← CAMBIO: usar supabaseAdmin para crear slots (bypassa RLS)
    const { data, error } = await supabaseAdmin
      .from('available_slots')
      .insert([req.body])
      .select();
    
    if (error) {
      console.error('Error creando horario disponible:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Horario disponible creado:', data[0]);
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error inesperado creando horario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const actualizarHorarioDisponible = async (req, res) => {
  try {
    const { id } = req.params;
    
    // ← CAMBIO: usar supabaseAdmin para actualizar slots (bypassa RLS)
    const { data, error } = await supabaseAdmin
      .from('available_slots')
      .update(req.body)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Error actualizando horario disponible:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }

    console.log('✅ Horario disponible actualizado:', data[0]);
    res.json(data[0]);
  } catch (error) {
    console.error('Error inesperado actualizando horario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const eliminarHorarioDisponible = async (req, res) => {
  try {
    const { id } = req.params;
    
    // ← CAMBIO: usar supabaseAdmin para eliminar slots (bypassa RLS)
    const { error } = await supabaseAdmin
      .from('available_slots')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error eliminando horario disponible:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Horario disponible eliminado:', id);
    res.json({ message: 'Horario disponible eliminado correctamente' });
  } catch (error) {
    console.error('Error inesperado eliminando horario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { 
  obtenerHorariosDisponibles, 
  crearHorarioDisponible, 
  actualizarHorarioDisponible, 
  eliminarHorarioDisponible 
};