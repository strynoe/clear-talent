// Uses Supabase REST API directly via fetch — no SDK needed

function sbUrl(path: string) {
  return `${process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!}/rest/v1/${path}`
}

// Anon key for public reads (invite_links has RLS disabled)
function anonHeaders() {
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return { 'Content-Type': 'application/json', 'apikey': key, 'Authorization': `Bearer ${key}` }
}

// Service role key bypasses RLS — used for writes from server
function serviceHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? process.env.SUPABASE_ANON_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return { 'Content-Type': 'application/json', 'apikey': key, 'Authorization': `Bearer ${key}` }
}

// GET /api/invite?token=<uuid>
export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get('token')
    if (!token) return Response.json({ error: 'Missing token' }, { status: 400 })

    const res = await fetch(
      sbUrl(`invite_links?id=eq.${token}&select=id,type,label,used_at,expires_at&limit=1`),
      { headers: anonHeaders() }
    )
    const rows = await res.json()
    if (!Array.isArray(rows) || rows.length === 0) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }
    const data = rows[0]
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return Response.json({ error: 'Expired' }, { status: 410 })
    }
    return Response.json({ type: data.type, label: data.label, used: !!data.used_at })
  } catch (ex) {
    console.error('[invite GET]', ex)
    return Response.json({ error: String(ex) }, { status: 500 })
  }
}

// POST /api/invite — create invite link (called from authenticated app)
export async function POST(request: Request) {
  try {
    const { type, target_id, label } = await request.json()

    const res = await fetch(sbUrl('invite_links?select=id'), {
      method: 'POST',
      headers: { ...serviceHeaders(), 'Prefer': 'return=representation' },
      body: JSON.stringify({ type, target_id, label }),
    })

    const data = await res.json()
    if (!res.ok) {
      const msg = data?.message ?? data?.error ?? `Supabase ${res.status}`
      console.error('[invite POST]', msg, data)
      return Response.json({ error: msg }, { status: 500 })
    }

    const row = Array.isArray(data) ? data[0] : data
    if (!row?.id) return Response.json({ error: 'No id returned' }, { status: 500 })

    const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin
    return Response.json({ token: row.id, url: `${base}/apply/${row.id}` })
  } catch (ex) {
    console.error('[invite POST]', ex)
    return Response.json({ error: String(ex) }, { status: 500 })
  }
}
