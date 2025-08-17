// controllers/reservationsController.js
const { supabase, supabaseAdmin } = require('../services/supabaseClient');

// Función auxiliar para convertir tiempo a minutos
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Función auxiliar para convertir minutos a tiempo
const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Función para validar horarios de reserva
const validateReservationTime = async (restaurantId, reservationTime, reservationDate) => {
  try {
    // CAMBIO: Usar supabaseAdmin si necesitas bypasear RLS
    const { data: restaurant, error } = await supabaseAdmin  // Cambiar aquí
      .from('restaurants')
      .select('opening_time, closing_time, name, is_active')
      .eq('id', restaurantId)
      .single();

    if (error || !restaurant) {
      throw new Error('Restaurante no encontrado');
    }

    if (!restaurant.is_active) {
      throw new Error('El restaurante no está activo');
    }

    const { opening_time, closing_time, name } = restaurant;
    
    const reservationMinutes = timeToMinutes(reservationTime);
    const openingMinutes = timeToMinutes(opening_time);
    const closingMinutes = timeToMinutes(closing_time);
    const lastReservationMinutes = closingMinutes - 60;
    
    if (reservationMinutes < openingMinutes || reservationMinutes > lastReservationMinutes) {
      const lastReservationTime = minutesToTime(lastReservationMinutes);
      throw new Error(
        `La hora de reserva debe estar entre ${opening_time} y ${lastReservationTime} para ${name}`
      );
    }

    // Validar que no sea una fecha/hora pasada
    const today = new Date().toISOString().split('T')[0];
    if (reservationDate === today) {
      const now = new Date();
      const reservationDateTime = new Date(`${reservationDate}T${reservationTime}`);
      
      if (reservationDateTime <= now) {
        throw new Error('No se pueden hacer reservas para horarios que ya pasaron');
      }
    }

    return true;
  } catch (error) {
    throw error;
  }
};

// Función auxiliar para verificar autenticación y obtener usuario
const verificarUsuarioAutenticado = async (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Token no proporcionado');
    }

    const token = authHeader.split(' ')[1];
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      throw new Error('Token inválido');
    }

    return userData.user;
  } catch (error) {
    throw error;
  }
};

const obtenerReservaciones = async (req, res) => {
  try {
    console.log('=== OBTENIENDO TODAS LAS RESERVACIONES ===');
    
    // Usar supabaseAdmin para obtener todas las reservaciones (bypassa RLS)
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .select(`
        *,
        restaurants (
          id,
          name,
          address,
          phone,
          capacity
        )
      `)
      .order('reservation_date', { ascending: false })
      .order('reservation_time', { ascending: false });
    
    if (error) {
      console.error('Error obteniendo reservaciones:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Se obtuvieron ${data.length} reservaciones`);
    res.json(data);
  } catch (error) {
    console.error('Error inesperado obteniendo reservaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const crearReservacion = async (req, res) => {
  try {
    console.log('=== CREANDO RESERVACIÓN ===');
    
    const { 
      user_id, 
      restaurant_id, 
      reservation_date, 
      reservation_time, 
      party_size, 
      status, 
      special_requests 
    } = req.body;

    // Verificar autenticación
    const authUser = await verificarUsuarioAutenticado(req);
    console.log('Usuario autenticado:', authUser.id);

    // ============= VALIDACIONES BÁSICAS =============
    if (!user_id || !restaurant_id || !reservation_date || !reservation_time || !party_size) {
      return res.status(400).json({
        message: 'Todos los campos requeridos deben ser proporcionados',
        required: ['user_id', 'restaurant_id', 'reservation_date', 'reservation_time', 'party_size']
      });
    }

    // Verificar que user_id coincida con el usuario autenticado (o sea admin)
    const { data: currentUserProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', authUser.id)
      .single();

    const isAdmin = currentUserProfile?.role === 'ADMIN';
    
    if (!isAdmin && user_id !== authUser.id) {
      return res.status(403).json({
        message: 'No puedes crear reservas para otros usuarios'
      });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(reservation_date)) {
      return res.status(400).json({
        message: 'Formato de fecha inválido. Use YYYY-MM-DD'
      });
    }

    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(reservation_time)) {
      return res.status(400).json({
        message: 'Formato de hora inválido. Use HH:MM'
      });
    }

    const today = new Date().toISOString().split('T')[0];
    if (reservation_date < today) {
      return res.status(400).json({
        message: 'No se pueden hacer reservas para fechas pasadas'
      });
    }

    const partySizeNum = Number(party_size);
    if (partySizeNum < 1) {
      return res.status(400).json({
        message: 'El número de personas debe ser mayor a 0'
      });
    } else if (partySizeNum > 20) {
      return res.status(400).json({
        message: 'El número de personas no puede superar 20'
      });
    }

    // ============= VALIDACIÓN DE USUARIO EN auth.users =============
    const { data: userExists, error: userError } = await supabaseAdmin.auth.admin.getUserById(user_id);

    if (userError || !userExists.user) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    // ============= VALIDACIÓN DE RESTAURANTE Y HORARIOS =============
    await validateReservationTime(restaurant_id, reservation_time, reservation_date);

    // ============= VALIDAR CAPACIDAD DEL RESTAURANTE =============
    const { data: restaurantData, error: restaurantError } = await supabaseAdmin  // Cambiar aquí
      .from('restaurants')
      .select('capacity, name')
      .eq('id', restaurant_id)
      .single();
    if (!restaurantError && restaurantData) {
      const { capacity, name } = restaurantData;
      if (partySizeNum > capacity) {
        return res.status(400).json({
          message: `El número de personas (${partySizeNum}) excede la capacidad del restaurante ${name} (${capacity})`
        });
      }
    }

// ============= VERIFICAR DISPONIBILIDAD =============
// CAMBIO: Usar supabaseAdmin para verificar disponibilidad (bypassa RLS)
const { data: existingReservation, error: checkError } = await supabaseAdmin
  .from('reservations')
  .select('id')
  .eq('restaurant_id', restaurant_id)
  .eq('reservation_date', reservation_date)
  .eq('reservation_time', reservation_time)
  .in('status', ['PENDING', 'CONFIRMED']);

if (checkError) {
  console.error('Error verificando disponibilidad:', checkError);
  return res.status(500).json({
    message: 'Error verificando disponibilidad'
  });
}

if (existingReservation && existingReservation.length > 0) {
  return res.status(409).json({
    message: 'Ya existe una reserva para esa fecha y hora en este restaurante'
  });
}

    // ============= CREAR LA RESERVA USANDO ADMIN =============
    const reservationData = {
      user_id: user_id, // Mantener como string UUID
      restaurant_id: Number(restaurant_id),
      reservation_date,
      reservation_time,
      party_size: Number(party_size),
      status: status || 'PENDING',
      special_requests: special_requests || null
    };

    console.log('Datos de reserva a crear:', reservationData);

    const { data, error } = await supabaseAdmin
      .from('reservations')
      .insert([reservationData])
      .select(`
        *,
        restaurants (
          id,
          name,
          address,
          phone,
          capacity
        )
      `);

    if (error) {
      console.error('Error creando reserva:', error);
      return res.status(500).json({ 
        message: 'Error al crear la reserva',
        error: error.message 
      });
    }

    console.log('✅ Reserva creada exitosamente');

    res.status(201).json({
      message: 'Reserva creada exitosamente',
      reservation: data[0]
    });

  } catch (error) {
    console.error('Error en crearReservacion:', error);
    
    if (error.message.includes('hora de reserva debe estar') || 
        error.message.includes('horarios que ya pasaron') ||
        error.message.includes('Restaurante no encontrado') ||
        error.message.includes('no está activo')) {
      return res.status(400).json({
        message: error.message
      });
    }
    
    res.status(500).json({
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

const actualizarReservacion = async (req, res) => {
  try {
    console.log('=== ACTUALIZANDO RESERVACIÓN ===');
    
    const { id } = req.params;
    const { 
      user_id, 
      restaurant_id, 
      reservation_date, 
      reservation_time, 
      party_size, 
      status, 
      special_requests 
    } = req.body;

    // Verificar autenticación
    const authUser = await verificarUsuarioAutenticado(req);
    console.log('Usuario autenticado:', authUser.id);

    // Verificar que la reserva existe
    const { data: existingReservation, error: findError } = await supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existingReservation) {
      return res.status(404).json({
        message: 'Reserva no encontrada'
      });
    }

    // Verificar permisos
    const { data: currentUserProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', authUser.id)
      .single();

    const isAdmin = currentUserProfile?.role === 'ADMIN';
    const isOwner = existingReservation.user_id === authUser.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        message: 'No tienes permisos para modificar esta reserva'
      });
    }

    // Si es CLIENT, solo puede cambiar el status a CANCELLED
    if (!isAdmin && isOwner) {
      const allowedUpdates = ['status'];
      const requestedUpdates = Object.keys(req.body);
      const invalidUpdates = requestedUpdates.filter(key => !allowedUpdates.includes(key));
      
      if (invalidUpdates.length > 0) {
        return res.status(403).json({
          message: 'Los clientes solo pueden cancelar reservas'
        });
      }
      
      if (status && status !== 'CANCELLED') {
        return res.status(403).json({
          message: 'Los clientes solo pueden cambiar el estado a CANCELLED'
        });
      }
    }

    // Validaciones adicionales para cambios de fecha/hora/restaurante
    if (reservation_date || reservation_time || restaurant_id) {
      const finalRestaurantId = restaurant_id || existingReservation.restaurant_id;
      const finalDate = reservation_date || existingReservation.reservation_date;
      const finalTime = reservation_time || existingReservation.reservation_time;

      await validateReservationTime(finalRestaurantId, finalTime, finalDate);

      const { data: conflictReservation, error: conflictError } = await supabaseAdmin  // Cambiar aquí
        .from('reservations')
        .select('id')
        .eq('restaurant_id', finalRestaurantId)
        .eq('reservation_date', finalDate)
        .eq('reservation_time', finalTime)
        .neq('id', id)
        .in('status', ['PENDING', 'CONFIRMED']);
      if (!conflictError && conflictReservation && conflictReservation.length > 0) {
        return res.status(409).json({
          message: 'Ya existe otra reserva para esa fecha y hora en este restaurante'
        });
      }
    }

    const updateData = {};
    if (user_id !== undefined) updateData.user_id = user_id;
    if (restaurant_id !== undefined) updateData.restaurant_id = Number(restaurant_id);
    if (reservation_date !== undefined) updateData.reservation_date = reservation_date;
    if (reservation_time !== undefined) updateData.reservation_time = reservation_time;
    if (party_size !== undefined) updateData.party_size = Number(party_size);
    if (status !== undefined) updateData.status = status;
    if (special_requests !== undefined) updateData.special_requests = special_requests;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('reservations')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        restaurants (
          id,
          name,
          address,
          phone,
          capacity
        )
      `);

    if (error) {
      console.error('Error actualizando reserva:', error);
      return res.status(500).json({ 
        message: 'Error al actualizar la reserva',
        error: error.message 
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        message: 'No se pudo actualizar la reserva'
      });
    }

    console.log('✅ Reserva actualizada exitosamente');

    res.json({
      message: 'Reserva actualizada exitosamente',
      reservation: data[0]
    });

  } catch (error) {
    console.error('Error en actualizarReservacion:', error);
    
    if (error.message.includes('hora de reserva debe estar') || 
        error.message.includes('horarios que ya pasaron') ||
        error.message.includes('Restaurante no encontrado') ||
        error.message.includes('Token') ||
        error.message.includes('permisos')) {
      return res.status(400).json({
        message: error.message
      });
    }
    
    res.status(500).json({
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

const eliminarReservacion = async (req, res) => {
  try {
    console.log('=== ELIMINANDO RESERVACIÓN ===');
    
    const { id } = req.params;

    // Verificar autenticación
    const authUser = await verificarUsuarioAutenticado(req);

    // Verificar que la reserva existe
    const { data: existingReservation, error: findError } = await supabaseAdmin
      .from('reservations')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (findError || !existingReservation) {
      return res.status(404).json({
        message: 'Reserva no encontrada'
      });
    }

    // Verificar permisos
    const { data: currentUserProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', authUser.id)
      .single();

    const isAdmin = currentUserProfile?.role === 'ADMIN';
    const isOwner = existingReservation.user_id === authUser.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        message: 'No tienes permisos para eliminar esta reserva'
      });
    }

    // Usar supabaseAdmin para eliminar
    const { error } = await supabaseAdmin
      .from('reservations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error eliminando reserva:', error);
      return res.status(500).json({ 
        message: 'Error al eliminar la reserva',
        error: error.message 
      });
    }

    console.log('✅ Reserva eliminada exitosamente');

    res.json({ 
      message: 'Reservación eliminada correctamente' 
    });

  } catch (error) {
    console.error('Error en eliminarReservacion:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

const cancelarReserva = async (req, res) => {
  try {
    console.log('=== CANCELANDO RESERVA ===');
    console.log('Request params:', req.params);
    
    const { reservationId } = req.params;
    console.log('Reservation ID a cancelar:', reservationId);

    if (!reservationId) {
      console.log('❌ ID de reserva faltante');
      return res.status(400).json({ 
        message: 'ID de reserva es requerido' 
      });
    }

    // Verificar autenticación
    const authUser = await verificarUsuarioAutenticado(req);
    console.log('Usuario autenticado:', authUser.id);

    // Verificar que la reserva existe
    console.log('🔍 Buscando reserva en la base de datos...');
    const { data: reservation, error: findError } = await supabaseAdmin
      .from('reservations')
      .select('id, user_id, status, reservation_date, reservation_time')
      .eq('id', reservationId)
      .single();

    console.log('Resultado de búsqueda:', { reservation, findError });

    if (findError || !reservation) {
      console.log('❌ Reserva no encontrada');
      return res.status(404).json({
        message: 'Reserva no encontrada',
        reservationId: reservationId
      });
    }

    console.log('✅ Reserva encontrada:', reservation);

    // Verificar permisos
    const { data: currentUserProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', authUser.id)
      .single();

    const isAdmin = currentUserProfile?.role === 'ADMIN';
    const isOwner = reservation.user_id === authUser.id;

    if (!isAdmin && !isOwner) {
      console.log('❌ Sin permisos para cancelar');
      return res.status(403).json({
        message: 'No tienes permisos para cancelar esta reserva'
      });
    }

    if (reservation.status === 'CANCELLED') {
      console.log('❌ Reserva ya cancelada');
      return res.status(400).json({
        message: 'La reserva ya está cancelada'
      });
    }

    const today = new Date().toISOString().split('T')[0];
    if (reservation.reservation_date < today) {
      console.log('❌ Reserva de fecha pasada');
      return res.status(400).json({
        message: 'No se pueden cancelar reservas de fechas pasadas'
      });
    }

    // Usar supabaseAdmin para actualizar
    console.log('🔄 Actualizando estado de la reserva...');
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .update({ 
        status: 'CANCELLED',
        updated_at: new Date().toISOString()
      })
      .eq('id', reservationId)
      .select(`
        *,
        restaurants (
          id,
          name,
          address,
          phone,
          capacity
        )
      `);

    if (error) {
      console.error('❌ Error cancelando reserva:', error);
      return res.status(500).json({ 
        message: 'Error al cancelar la reserva',
        error: error.message 
      });
    }

    console.log('✅ Reserva cancelada exitosamente:', data);

    res.status(200).json({
      message: 'Reserva cancelada exitosamente',
      reservation: data[0]
    });

  } catch (error) {
    console.error('❌ Error inesperado cancelando reserva:', error);
    
    if (error.message.includes('Token')) {
      return res.status(401).json({ 
        message: error.message
      });
    }
    
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

// NUEVA FUNCIÓN: Obtener reservas de un usuario específico
const obtenerReservasUsuario = async (req, res) => {
  try {
    console.log('=== OBTENIENDO RESERVAS DEL USUARIO ===');
    
    const { userId } = req.params;
    console.log('User ID solicitado:', userId);

    if (!userId) {
      return res.status(400).json({ 
        message: 'ID de usuario es requerido' 
      });
    }

    // Verificar autenticación
    const authUser = await verificarUsuarioAutenticado(req);
    console.log('Usuario autenticado:', authUser.id);

    // Verificar permisos: solo admin o el mismo usuario
    const { data: currentUserProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', authUser.id)
      .single();

    const isAdmin = currentUserProfile?.role === 'ADMIN';
    const isSameUser = authUser.id === userId;

    if (!isAdmin && !isSameUser) {
      console.log('❌ Sin permisos para ver reservas de otro usuario');
      return res.status(403).json({ 
        message: 'No tienes permisos para ver las reservas de otro usuario' 
      });
    }

    // Verificar que el usuario existe en auth.users
    const { data: userExists, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !userExists.user) {
      console.log('❌ Usuario no encontrado en auth.users');
      return res.status(404).json({ 
        message: 'Usuario no encontrado' 
      });
    }

    // Obtener perfil del usuario
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('✅ Usuario encontrado:', userExists.user.email);

    // Obtener reservas del usuario con información del restaurante
    const { data: reservations, error } = await supabaseAdmin
      .from('reservations')
      .select(`
        id,
        reservation_date,
        reservation_time,
        party_size,
        status,
        special_requests,
        created_at,
        updated_at,
        restaurants (
          id,
          name,
          address,
          phone,
          capacity
        )
      `)
      .eq('user_id', userId)
      .order('reservation_date', { ascending: false })
      .order('reservation_time', { ascending: false });

    if (error) {
      console.error('❌ Error obteniendo reservas:', error);
      return res.status(500).json({ 
        message: 'Error al obtener las reservas',
        error: error.message 
      });
    }

    console.log(`✅ Se encontraron ${reservations.length} reservas para el usuario`);

    // Formatear las reservas para el frontend
    const formattedReservations = reservations.map(reservation => ({
      id: reservation.id,
      date: reservation.reservation_date,
      time: reservation.reservation_time,
      partySize: reservation.party_size,
      status: reservation.status,
      specialRequests: reservation.special_requests,
      createdAt: reservation.created_at,
      updatedAt: reservation.updated_at,
      restaurant: reservation.restaurants ? {
        id: reservation.restaurants.id,
        name: reservation.restaurants.name,
        address: reservation.restaurants.address,
        phone: reservation.restaurants.phone,
        capacity: reservation.restaurants.capacity
      } : {
        name: 'Restaurante no disponible',
        address: 'Dirección no disponible',
        phone: null
      }
    }));

    res.status(200).json({
      user: {
        id: userExists.user.id,
        firstName: userProfile?.first_name || '',
        lastName: userProfile?.last_name || '',
        email: userExists.user.email,
        phone: userProfile?.phone || '',
        role: userProfile?.role || 'CLIENT'
      },
      reservations: formattedReservations,
      totalReservations: formattedReservations.length
    });

  } catch (error) {
    console.error('❌ Error inesperado obteniendo reservas:', error);
    
    if (error.message.includes('Token')) {
      return res.status(401).json({ 
        message: error.message
      });
    }
    
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

const cancelarReservaUsuario = async (req, res) => {
  try {
    console.log('=== CANCELANDO RESERVA DE USUARIO ===');
    
    const { userId, reservationId } = req.params;
    console.log('User ID:', userId, 'Reservation ID:', reservationId);

    // Verificar autenticación
    const authUser = await verificarUsuarioAutenticado(req);

    // Verificar permisos
    const { data: currentUserProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', authUser.id)
      .single();

    const isAdmin = currentUserProfile?.role === 'ADMIN';
    const isSameUser = authUser.id === userId;

    if (!isAdmin && !isSameUser) {
      return res.status(403).json({
        message: 'No tienes permisos para cancelar reservas de otro usuario'
      });
    }

    const { data: reservation, error: findError } = await supabaseAdmin
      .from('reservations')
      .select('id, user_id, status, reservation_date, reservation_time')
      .eq('id', reservationId)
      .eq('user_id', userId)
      .single();

    if (findError || !reservation) {
      console.log('❌ Reserva no encontrada o no pertenece al usuario');
      return res.status(404).json({
        message: 'Reserva no encontrada'
      });
    }

    if (reservation.status === 'CANCELLED') {
      return res.status(400).json({
        message: 'La reserva ya está cancelada'
      });
    }

    const today = new Date().toISOString().split('T')[0];
    if (reservation.reservation_date < today) {
      return res.status(400).json({
        message: 'No se pueden cancelar reservas de fechas pasadas'
      });
    }

    // Usar supabaseAdmin para cancelar
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .update({ 
        status: 'CANCELLED',
        updated_at: new Date().toISOString()
      })
      .eq('id', reservationId)
      .select(`
        *,
        restaurants (
          id,
          name,
          address,
          phone,
          capacity
        )
      `);

    if (error) {
      console.error('❌ Error cancelando reserva:', error);
      return res.status(500).json({ 
        message: 'Error al cancelar la reserva',
        error: error.message 
      });
    }

    console.log('✅ Reserva cancelada exitosamente');

    res.status(200).json({
      message: 'Reserva cancelada exitosamente',
      reservation: data[0]
    });

  } catch (error) {
    console.error('❌ Error inesperado cancelando reserva:', error);
    
    if (error.message.includes('Token')) {
      return res.status(401).json({ 
        message: error.message
      });
    }
    
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

module.exports = {
  obtenerReservaciones,
  crearReservacion,
  actualizarReservacion,
  eliminarReservacion,
  obtenerReservasUsuario,
  cancelarReservaUsuario,
  cancelarReserva
};