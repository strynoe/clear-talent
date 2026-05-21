// GET /api/members → liste alle medlemmer af brugerens org
// POST /api/members → { action: 'approve' | 'deny' | 'remove', target_user_id: uuid }

const base    = () => process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon    = () => process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? anon()
const svcH    = () => ({
  'Content-Type': 'application/json',
  'apikey': service(),
  'Authorization': `Bearer ${service()}`,
})

async function getUser(userToken: string) {
  const userRes = await fetch(`${base()}/auth/v1/user`, {
    headers: { 'apikey': anon(), 'Authorization': `Bearer ${userToken}` },
  })
  if (!userRes.ok) return null
  return userRes.json()
}

async function getMembership(userId: string) {
  const r = await fetch(
    `${base()}/rest/v1/org_members?user_id=eq.${userId}&select=org_id,role,status&limit=1`,
    { headers: svcH() }
  )
  const rows = await r.json()
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

// ─── GET: list members of caller's org ─────────────────────
export async function GET(request: Request) {
  try {
    const userToken = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!userToken) return Response.json({ error: 'No token' }, { status: 401 })

    const user = await getUser(userToken)
    if (!user?.id) return Response.json({ error: 'Invalid session' }, { status: 401 })

    const membership = await getMembership(user.id)
    if (!membership?.org_id) return Response.json({ error: 'Ingen organisation' }, { status: 404 })
    if (membership.status !== 'active') return Response.json({ error: 'Du er ikke aktivt medlem' }, { status: 403 })

    const r = await fetch(
      `${base()}/rest/v1/org_members?org_id=eq.${membership.org_id}&select=user_id,email,role,status,created_at&order=created_at.asc`,
      { headers: svcH() }
    )
    const members = await r.json()

    return Response.json({
      members,
      currentUserId: user.id,
      currentRole: membership.role,
    })
  } catch (ex) {
    console.error('[members GET]', ex)
    return Response.json({ error: String(ex) }, { status: 500 })
  }
}

// ─── POST: approve / deny / remove ─────────────────────────
export async function POST(request: Request) {
  try {
    const userToken = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!userToken) return Response.json({ error: 'No token' }, { status: 401 })

    const { action, target_user_id } = await request.json()
    if (!action || !target_user_id) {
      return Response.json({ error: 'Manglende parametre' }, { status: 400 })
    }

    const user = await getUser(userToken)
    if (!user?.id) return Response.json({ error: 'Invalid session' }, { status: 401 })

    // Kun owner må handle på medlemskaber
    const myMembership = await getMembership(user.id)
    if (!myMembership || myMembership.role !== 'owner' || myMembership.status !== 'active') {
      return Response.json({ error: 'Kun owner kan administrere medlemmer' }, { status: 403 })
    }

    // Tjek at target er i samme org
    const targetMembership = await getMembership(target_user_id)
    if (!targetMembership || targetMembership.org_id !== myMembership.org_id) {
      return Response.json({ error: 'Medlemmet findes ikke i din organisation' }, { status: 404 })
    }

    // Man må ikke fjerne sig selv som owner
    if (target_user_id === user.id && action === 'remove') {
      return Response.json({ error: 'Du kan ikke fjerne dig selv' }, { status: 400 })
    }

    if (action === 'approve') {
      const r = await fetch(
        `${base()}/rest/v1/org_members?user_id=eq.${target_user_id}&org_id=eq.${myMembership.org_id}`,
        { method: 'PATCH', headers: svcH(), body: JSON.stringify({ status: 'active' }) }
      )
      if (!r.ok) return Response.json({ error: 'Kunne ikke godkende' }, { status: 500 })
    } else if (action === 'deny' || action === 'remove') {
      const r = await fetch(
        `${base()}/rest/v1/org_members?user_id=eq.${target_user_id}&org_id=eq.${myMembership.org_id}`,
        { method: 'DELETE', headers: svcH() }
      )
      if (!r.ok) return Response.json({ error: 'Kunne ikke fjerne' }, { status: 500 })
    } else {
      return Response.json({ error: 'Ukendt handling' }, { status: 400 })
    }

    return Response.json({ success: true })
  } catch (ex) {
    console.error('[members POST]', ex)
    return Response.json({ error: String(ex) }, { status: 500 })
  }
}
