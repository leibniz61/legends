import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

// Service client -- bypasses RLS, use for admin operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Anon client -- respects RLS, use for user-scoped operations
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Create a client scoped to a specific user's JWT
export function createUserClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}
