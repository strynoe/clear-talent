import { createClient } from '@supabase/supabase-js'

function db() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error(`Supabase env vars missing: url=${!!url} key=${!!key}`)
  return createClient(url, key)
}

// GET /api/invite?token=<uuid>  — fetch invite info for the apply page
export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get('token')
    if (!token) return Response.json({ error: 'Missing token' }, { status: 400 })

    const { data, error } = await db()
      .from('invite_links')
      .select('id, type, label, used_at, expires_at')
      .eq('id', token)
      .single()

    if (error || !data) return Response.json({ error: 'Not found' }, { status: 404 })
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return Response.json({ error: 'Expired' }, { status: 410 })
    }
    return Response.json({ type: data.type, label: data.label, used: !!data.used_at })
  } catch (ex) {
    console.error('[invite GET]', ex)
    return Response.json({ error: String(ex) }, { status: 500 })
  }
}

// POST /api/invite  — create a new invite link
export async function POST(request: Request) {
  try {
    const { type, target_id, label } = await request.json()

    const { data, error } = await db()
      .from('invite_links')
      .insert({ type, target_id, label })
      .select('id')
      .single()

    if (error || !data) {
      console.error('[invite POST] supabase error:', error)
      return Response.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
    }

    const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin
    return Response.json({ token: data.id, url: `${base}/apply/${data.id}` })
  } catch (ex) {
    console.error('[invite POST] exception:', ex)
    return Response.json({ error: String(ex) }, { status: 500 })
  }
}
