import { supabaseAdmin } from '../server/src/config/supabase.js';

async function check() {
  const { data, count, error } = await supabaseAdmin
    .from('threads')
    .select('id, title, category_id', { count: 'exact' })
    .limit(5);
  
  console.log('Threads count:', count);
  console.log('Sample threads:', JSON.stringify(data, null, 2));
  if (error) console.log('Error:', error);
}

check();
