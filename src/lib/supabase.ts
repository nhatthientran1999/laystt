import { createClient } from '@supabase/supabase-js'

// Kiểm tra cả chuẩn Vite (import.meta.env) và chuẩn Node.js (process.env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Check Vercel Environment Variables.')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
