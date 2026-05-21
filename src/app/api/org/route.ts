// Server-side org lookup/creation using service role key — bypasses RLS entirely

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

    // 1. Verify the user token
    const userRes = await fetch(`${base}/auth/v1/user`, {
      headers: { 'apikey': anon, 'Authorization': `Bearer ${userToken}` },
    })
    if (!userRes.ok) return Response.json({ error: 'Invalid session' }, { status: 401 })
    const user = await userRes.json()
    if (!user?.id) return Response.json({ error: 'No user id' }, { status: 401 })

    // 2. Check for existing org membership
    const memRes = await fetch(
      `${base}/rest/v1/org_members?user_id=eq.${user.id}&select=org_id&limit=1`,
      { headers: svcH }
    )
    const members = await memRes.json()
    if (Array.isArray(members) && members.length > 0) {
      return Response.json({ org_id: members[0].org_id })
    }

    // 3. First login — create org
    const orgName = (user.email as string | undefined)?.split('@')[0] ?? 'Organisation'
    const orgRes = await fetch(`${base}/rest/v1/organizations?select=id`, {
      method: 'POST',
      headers: { ...svcH, 'Prefer': 'return=representation' },
      body: JSON.stringify({ name: orgName }),
    })
    const orgs = await orgRes.json()
    const org = Array.isArray(orgs) ? orgs[0] : orgs
    if (!org?.id) {
      console.error('[api/org] create org failed', orgs)
      return Response.json({ error: 'Failed to create org' }, { status: 500 })
    }

    // 4. Add user as owner
    await fetch(`${base}/rest/v1/org_members`, {
      method: 'POST',
      headers: svcH,
      body: JSON.stringify({ org_id: org.id, user_id: user.id, role: 'owner' }),
    })

    return Response.json({ org_id: org.id })
  } catch (ex) {
    console.error('[api/org]', ex)
    return Response.json({ error: String(ex) }, { status: 500 })
  }
}
