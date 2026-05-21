// GET /api/org — returnerer brugerens nuværende org-status
// Returnerer: { org_id, org_name, role, status } eller { status: 'none' }
// Opretter IKKE længere org automatisk — det sker via /api/join-org med kode

export async function GET(request: Request) {
  try {
    const userToken = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!userToken) return Response.json({ error: 'No token' }, { status: 401 })

    const base    = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anon    = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? anon

    const svcH = {
      'Content-Type': 'application/json',
      'apikey': service,
      'Authorization': `Bearer ${service}`,
    }

    // 1. Verificér token
    const userRes = await fetch(`${base}/auth/v1/user`, {
      headers: { 'apikey': anon, 'Authorization': `Bearer ${userToken}` },
    })
    if (!userRes.ok) return Response.json({ error: 'Invalid session' }, { status: 401 })
    const user = await userRes.json()
    if (!user?.id) return Response.json({ error: 'No user id' }, { status: 401 })

    // 2. Find medlemskab
    const memRes = await fetch(
      `${base}/rest/v1/org_members?user_id=eq.${user.id}&select=org_id,role,status&limit=1`,
      { headers: svcH }
    )
    const members = await memRes.json()
    if (!Array.isArray(members) || members.length === 0) {
      return Response.json({ status: 'none' })
    }
    const m = members[0]

    // 3. Hent org-info
    const orgRes = await fetch(
      `${base}/rest/v1/organizations?id=eq.${m.org_id}&select=id,name,invite_code&limit=1`,
      { headers: svcH }
    )
    const orgs = await orgRes.json()
    const org = Array.isArray(orgs) ? orgs[0] : null

    return Response.json({
      org_id: m.org_id,
      org_name: org?.name ?? '',
      invite_code: org?.invite_code ?? '',
      role: m.role,
      status: m.status,
    })
  } catch (ex) {
    console.error('[api/org]', ex)
    return Response.json({ error: String(ex) }, { status: 500 })
  }
}
