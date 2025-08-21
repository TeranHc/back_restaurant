// utils/syncGoogleUsers.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncGoogleUsers() {
  try {
    console.log('🚀 Iniciando sincronización de usuarios de Google...');
    console.log('📍 Supabase URL:', supabaseUrl);
    console.log('🔑 Service Key disponible:', supabaseServiceKey ? 'SÍ' : 'NO');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
      return;
    }
    
    // 1. Obtener todos los usuarios de auth.users
    console.log('📋 Obteniendo usuarios de auth...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error obteniendo usuarios de auth:', authError);
      return;
    }

    console.log(`📊 Encontrados ${authUsers.users.length} usuarios en auth.users`);

    // 2. Obtener todos los perfiles existentes
    console.log('📋 Obteniendo perfiles existentes...');
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*');
    
    if (profilesError) {
      console.error('❌ Error obteniendo perfiles:', profilesError);
      return;
    }

    console.log(`📊 Encontrados ${profiles.length} perfiles existentes`);

    let updated = 0;
    let created = 0;
    let skipped = 0;
    let errors = 0;

    // 3. Procesar cada usuario
    console.log('\n🔄 Procesando usuarios...\n');
    
    for (const user of authUsers.users) {
      try {
        const existingProfile = profiles.find(p => p.id === user.id);
        const userMetadata = user.user_metadata || {};
        
        // Solo procesar usuarios que tienen metadata (provienen de OAuth)
        const hasMetadata = Object.keys(userMetadata).length > 0;
        
        if (!hasMetadata) {
          console.log(`⏩ SKIP: ${user.email} (sin metadata - registro manual)`);
          skipped++;
          continue;
        }
        
        // Extraer datos de Google
        const fullName = userMetadata.full_name || userMetadata.name || user.email;
        const firstName = userMetadata.first_name || userMetadata.given_name || fullName.split(' ')[0] || '';
        const lastName = userMetadata.last_name || userMetadata.family_name || fullName.split(' ').slice(1).join(' ') || '';
        
        if (existingProfile) {
          // Verificar si necesita actualización
          const needsUpdate = (!existingProfile.first_name && firstName.trim()) || 
                              (!existingProfile.last_name && lastName.trim()) ||
                              (!existingProfile.phone && userMetadata.phone);
                              
          if (needsUpdate) {
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({
                first_name: firstName.trim() || existingProfile.first_name,
                last_name: lastName.trim() || existingProfile.last_name,
                phone: userMetadata.phone || existingProfile.phone,
                updated_at: new Date().toISOString()
              })
              .eq('id', user.id);
            
            if (updateError) {
              console.log(`❌ ERROR: ${user.email} - ${updateError.message}`);
              errors++;
            } else {
              console.log(`✅ ACTUALIZADO: ${user.email} -> "${firstName} ${lastName}"`);
              updated++;
            }
          } else {
            console.log(`⏩ SKIP: ${user.email} (datos completos)`);
            skipped++;
          }
        } else {
          // Crear nuevo perfil
          const { error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: user.id,
              first_name: firstName.trim() || null,
              last_name: lastName.trim() || null,
              phone: userMetadata.phone || null,
              role: 'CLIENT'
            });
          
          if (createError) {
            console.log(`❌ ERROR: ${user.email} - ${createError.message}`);
            errors++;
          } else {
            console.log(`✅ CREADO: ${user.email} -> "${firstName} ${lastName}"`);
            created++;
          }
        }
        
        // Pequeña pausa para no saturar
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.log(`❌ ERROR: ${user.id} - ${err.message}`);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN DE SINCRONIZACIÓN');
    console.log('='.repeat(50));
    console.log(`✅ Perfiles actualizados: ${updated}`);
    console.log(`🆕 Perfiles creados: ${created}`);
    console.log(`⏩ Omitidos (sin cambios): ${skipped}`);
    console.log(`❌ Errores: ${errors}`);
    console.log('='.repeat(50));
    
    if (updated > 0 || created > 0) {
      console.log('🎉 ¡Sincronización completada exitosamente!');
      console.log('💡 Los usuarios ahora deberían ver sus nombres correctamente.');
    } else {
      console.log('ℹ️  No se encontraron usuarios para sincronizar.');
    }

  } catch (error) {
    console.error('❌ Error general en sincronización:', error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  syncGoogleUsers();
}

module.exports = { syncGoogleUsers };