import { createClient } from '@supabase/supabase-js';

/**
 * Iisang Supabase client instance para sa buong web app — ini-import
 * ito ng APIservices.js (para sa auth actions at access token retrieval)
 * at ng authcontext.jsx (para sa session state tracking).
 *
 * Ang VITE_SUPABASE_URL at VITE_SUPABASE_ANON_KEY ay kailangang naka-set
 * sa .env file (root ng project) — Vite lang ang tumutukoy sa mga env
 * var na may VITE_ prefix, kaya kailangan itong eksaktong pangalan.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Check your .env file.'
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;