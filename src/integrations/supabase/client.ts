import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Provide a safe mock to avoid crashing the app if envs are missing
const mockSupabase: any = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: (_event: any, _cb: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signUp: async () => ({ data: { user: null }, error: new Error('Supabase not configured') }),
    signInWithPassword: async () => ({ data: null, error: new Error('Supabase not configured') }),
    signOut: async () => ({ error: null }),
  },
  from: () => ({
    select: () => ({ eq: () => ({ single: async () => ({ data: null, error: new Error('Supabase not configured') }), maybeSingle: async () => ({ data: null, error: new Error('Supabase not configured') }) }) }),
    insert: async () => ({ data: null, error: new Error('Supabase not configured') }),
    update: async () => ({ data: null, error: new Error('Supabase not configured') }),
    delete: async () => ({ data: null, error: new Error('Supabase not configured') }),
  }),
};

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    })
  : (mockSupabase as any);

