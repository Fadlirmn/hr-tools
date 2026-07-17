import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

function getAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
}

let cached: SupabaseClient | null = null

export function createClient() {
  if (cached) return cached
  cached = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getAnonKey()
  )
  return cached
}
