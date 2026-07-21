import { createBrowserClient } from '@supabase/ssr'

function getAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
}

// Tidak menggunakan singleton global untuk menghindari session leak antar user/logout.
// @supabase/ssr browser client sudah mengelola auth state via cookies secara aman.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getAnonKey()
  )
}
