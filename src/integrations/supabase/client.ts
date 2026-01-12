import { createClient } from '@supabase/supabase-js';

// Intentamos obtener las variables de entorno
const ENV_URL = import.meta.env.VITE_SUPABASE_URL;
const ENV_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Valores directos del proyecto (Respaldo para evitar reinicios constantes)
// Project ID: bodewljamlznjxyoruvw
const FALLBACK_URL = "https://bodewljamlznjxyoruvw.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvZGV3bGphbWx6bmp4eW9ydXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjMxMjQsImV4cCI6MjA4Mzc5OTEyNH0.xKprVCKBQ62VnVX0QlCjq9S2Z5dRDwgbWnjSSC8zFjA";

const SUPABASE_URL = ENV_URL || FALLBACK_URL;
const SUPABASE_ANON_KEY = ENV_KEY || FALLBACK_KEY;

if (!SUPABASE_URL) {
  console.error("Supabase URL is missing!");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);