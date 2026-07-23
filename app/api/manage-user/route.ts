import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/** Helper: verify caller is a dev */
async function verifyDev() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll() {},
    },
  })

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  if (session.user.user_metadata?.role !== 'dev') return null
  return session
}

function adminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// GET /api/manage-user — list all auth users
export async function GET() {
  const session = await verifyDev()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = adminClient()
  const { data, error } = await admin.auth.admin.listUsers()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return only the fields the UI needs
  const users = data.users.map(u => ({
    id: u.id,
    email: u.email,
    role: u.user_metadata?.role ?? '',
    nama: u.user_metadata?.nama ?? '',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
  }))

  return NextResponse.json({ users })
}

// POST /api/manage-user — update role (and optionally nama) for a user
export async function POST(req: Request) {
  const session = await verifyDev()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { userId, role, nama } = body as { userId: string; role: string; nama?: string }

  if (!userId || !role) {
    return NextResponse.json({ error: 'userId and role are required' }, { status: 400 })
  }

  const allowed = ['hr', 'dev', 'candidate']
  if (!allowed.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const admin = adminClient()
  const { data: existing } = await admin.auth.admin.getUserById(userId)
  const currentMeta = existing?.user?.user_metadata ?? {}

  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...currentMeta,
      role,
      ...(nama !== undefined ? { nama } : {}),
    },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/manage-user — delete a user (hard delete from auth)
export async function DELETE(req: Request) {
  const session = await verifyDev()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  // Prevent self-deletion
  if (userId === session.user.id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
  }

  const admin = adminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
