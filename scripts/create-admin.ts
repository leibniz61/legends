import '../server/src/env.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function createAdmin() {
  const email = 'trustbrendan@gmail.com';
  const password = 't1DEL1ndboo!!';
  const username = 'brendan';

  console.log('Creating user...');

  // Create auth user - the trigger will auto-create a profile
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });

  if (error) {
    console.error('Failed to create user:', error);

    // Check if user already exists
    const { data: users } = await supabase.auth.admin.listUsers();
    const existing = users?.users?.find(u => u.email === email);

    if (existing) {
      console.log('\nUser already exists! ID:', existing.id);
      console.log('Updating to admin role...');

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', existing.id);

      if (updateErr) {
        console.error('Failed to update role:', updateErr.message);
      } else {
        console.log('Admin role set!');
      }
    }
    return;
  }

  console.log('User created:', data.user.id);

  // Update profile to admin role
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', data.user.id);

  if (updateErr) {
    console.error('Failed to set admin role:', updateErr.message);
    return;
  }

  console.log('\nAdmin account created successfully!');
  console.log('Email:', email);
  console.log('Username:', username);
}

createAdmin();
