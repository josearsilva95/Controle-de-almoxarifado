import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

export function criarSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: true },
  })
}

export async function autenticarAdmin(supabase) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  })
  if (error) throw new Error(`Falha ao autenticar (${process.env.ADMIN_EMAIL}): ${error.message}`)
  return data.user.id
}
