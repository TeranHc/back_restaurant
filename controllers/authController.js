const supabase = require('../services/supabaseClient');
const bcrypt = require('bcrypt');

const login = async (req, res) => {
  try {
    console.log('=== INICIANDO LOGIN ===');
    console.log('Body recibido:', req.body);
    
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('❌ Faltan campos requeridos');
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    console.log('Buscando usuario con email:', email);

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    console.log('Resultado búsqueda usuario:');
    console.log('- Error:', error);
    console.log('- Usuario encontrado:', user ? 'SÍ' : 'NO');

    if (error || !user) {
      console.log('❌ Usuario no encontrado o error');
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    console.log('Usuario encontrado - ID:', user.id, 'Email:', user.email);
    console.log('Verificando contraseña...');
    console.log('- Contraseña ingresada:', password);
    console.log('- Contraseña en BD:', user.password);

    if (user.password !== password) {
      console.log('❌ Contraseña incorrecta');
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    console.log('✅ Contraseña correcta');

    const token = `${user.id}-${Date.now()}`;
    console.log('Token generado:', token);

    const responseData = {
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    };

    console.log('✅ Login exitoso, enviando respuesta:', responseData);
    res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ Error inesperado en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const register = async (req, res) => {
  try {
    console.log('=== INICIANDO REGISTRO ===');
    console.log('Body recibido:', req.body);

    const { email, password, firstName, lastName, role = 'USER' } = req.body;

    if (!email || !password || !firstName) {
      console.log('❌ Faltan campos requeridos');
      return res.status(400).json({ message: 'Email, contraseña y nombre son requeridos' });
    }

    console.log('Verificando si usuario existe:', email);

    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    console.log('Usuario existente:', existingUser ? 'SÍ' : 'NO');
    console.log('Error verificación:', checkError?.message || 'Ninguno');

    if (existingUser) {
      console.log('❌ Usuario ya existe');
      return res.status(409).json({ message: 'El usuario ya existe' });
    }

    console.log('Creando nuevo usuario...');

    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        role,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    console.log('Resultado creación:');
    console.log('- Error:', error?.message || 'Ninguno');
    console.log('- Usuario creado:', newUser ? 'SÍ' : 'NO');

    if (error) {
      console.error('❌ Error al crear usuario:', error);
      return res.status(500).json({ message: 'Error al crear el usuario' });
    }

    console.log('✅ Usuario creado exitosamente:', newUser.id);

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('❌ Error inesperado en register:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const verifyToken = async (req, res) => {
  try {
    console.log('=== VERIFICANDO TOKEN ===');
    console.log('Headers authorization:', req.headers.authorization);

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Token no encontrado o formato incorrecto');
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extraído:', token);

    const [userId, timestamp] = token.split('-');
    console.log('User ID extraído:', userId);
    console.log('Timestamp extraído:', timestamp);

    if (!userId || !timestamp) {
      console.log('❌ Token no tiene el formato correcto');
      return res.status(401).json({ message: 'Token inválido - formato incorrecto' });
    }

    console.log('Buscando usuario con ID:', userId);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role')
      .eq('id', userId)
      .single();

    console.log('Resultado búsqueda:');
    console.log('- Error:', error?.message || 'Ninguno');
    console.log('- Usuario encontrado:', user ? 'SÍ' : 'NO');

    if (error || !user) {
      console.log('❌ Usuario no encontrado o error');
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    console.log('✅ Usuario verificado:', user.email);

    res.status(200).json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role
    });

  } catch (error) {
    console.error('❌ Error inesperado verificando token:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { login, register, verifyToken };
