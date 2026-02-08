import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Get all unique category_ids from threads
const { data: threadCats } = await supabase
  .from('threads')
  .select('category_id');

const uniqueCatIds = [...new Set(threadCats.map(t => t.category_id))];

// Check which ones exist in categories
const { data: categories } = await supabase
  .from('categories')
  .select('id, slug, name')
  .in('id', uniqueCatIds);

console.log('Thread category_ids that exist in categories table:');
categories.forEach(c => console.log(`  ${c.slug}: ${c.id}`));

// Count threads per matching category
for (const cat of categories.slice(0, 5)) {
  const { count } = await supabase
    .from('threads')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', cat.id);
  console.log(`\n${cat.slug} (${cat.id}): ${count} threads`);
}
