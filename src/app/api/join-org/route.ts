// POST /api/join-org — bruger indtaster invite_code under signup eller første login
// Body: { invite_code: string }
// Auth: bruger-token i Authorization header
// Returnerer: { org_id, org_name, role, status }

export async function POST(request: Request) {
  try {
    const userToken = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!userToken) return Response.json({ error: 'Ingen session' }, { status: 401 })

    const { invite_code } = await request.json()
    if (!invite_code) return Response.json({ error: 'Manglende organisationskode' }, { status: 400 })

    const base    = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anon    = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? anon

    const svcH = {
      'Content-Type': 'application/json',
      'apikey': service,
      'Authorization': `Bearer ${service}`,
    }

    // Verificér bruger
    const userRes = await fetch(`${base}/auth/v1/user`, {
      headers: { 'apikey': anon, 'Authorization': `Bearer ${userToken}` },
    })
    if (!userRes.ok) return Response.json({ error: 'Ugyldig session' }, { status: 401 })
    const user = await userRes.json()
    if (!user?.id) return Response.json({ error: 'Ingen bruger fundet' }, { status: 401 })

    // Tjek om brugeren allerede har et medlemskab
    const existRes = await fetch(
      `${base}/rest/v1/org_members?user_id=eq.${user.id}&limit=1`,
      { headers: svcH }
    )
    const existing = await existRes.json()
    if (Array.isArray(existing) && existing.length > 0) {
      return Response.json({ error: 'Du er allerede medlem af en organisation' }, { status: 409 })
    }

    // Find org via kode
    const code = invite_code.toString().toUpperCase().trim()
    const orgRes = await fetch(
      `${base}/rest/v1/organizations?invite_code=eq.${encodeURIComponent(code)}&select=id,name&limit=1`,
      { headers: svcH }
    )
    const orgs = await orgRes.json()
    if (!Array.isArray(orgs) || orgs.length === 0) {
      return Response.json({ error: 'Ugyldig organisationskode' }, { status: 404 })
    }
    const org = orgs[0]

    // Findes der allerede en aktiv owner?
    const ownerRes = await fetch(
      `${base}/rest/v1/org_members?org_id=eq.${org.id}&role=eq.owner&status=eq.active&limit=1`,
      { headers: svcH }
    )
    const owners = await ownerRes.json()
    const isFirstUser = !Array.isArray(owners) || owners.length === 0

    const role   = isFirstUser ? 'owner' : 'member'
    const status = isFirstUser ? 'active' : 'pending'

    const insRes = await fetch(`${base}/rest/v1/org_members`, {
      method: 'POST',
      headers: svcH,
      body: JSON.stringify({
        org_id: org.id,
        user_id: user.id,
        role,
        status,
        email: user.email,
      }),
    })

    if (!insRes.ok) {
      const err = await insRes.json().catch(() => ({}))
      console.error('[join-org] insert failed:', err)
      return Response.json({ error: err?.message ?? 'Kunne ikke tilmelde dig' }, { status: 500 })
    }

    // Hvis det er en pending member, send notifikation til org-owner
    if (status === 'pending' && process.env.RESEND_API_KEY) {
      try {
        // Find owner-email
        const ownerLookup = await fetch(
          `${base}/rest/v1/org_members?org_id=eq.${org.id}&role=eq.owner&status=eq.active&select=email&limit=1`,
          { headers: svcH }
        )
        const ownerRows = await ownerLookup.json()
        const ownerEmail = Array.isArray(ownerRows) && ownerRows[0]?.email

        if (ownerEmail) {
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: process.env.RESEND_FROM ?? 'TypeSystems <onboarding@resend.dev>',
              to: ownerEmail,
              subject: `Ny anmodning om at tilslutte sig ${org.name}`,
              html: `
                <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #1a1916;">
                  <h2 style="font-family: Georgia, serif; font-size: 20px; margin: 0 0 12px;">Ny anmodning</h2>
                  <p style="font-size: 14px; line-height: 1.7; color: #7a7570;">
                    <strong style="color: #1a1916;">${user.email}</strong> har anmodet om at tilslutte sig <strong style="color: #1a1916;">${org.name}</strong> på TypeSystems.
                  </p>
                  <p style="font-size: 14px; line-height: 1.7; color: #7a7570;">
                    Log ind og åbn "Medlemmer" for at godkende eller afvise anmodningen.
                  </p>
                  <a href="${siteUrl}" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #1a1916; color: #f0ede6; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 500;">
                    Åbn TypeSystems →
                  </a>
                  <p style="font-size: 11px; color: #9a9590; margin-top: 32px; padding-top: 16px; border-top: 1px solid #ccc8bc;">
                    TypeSystems — People Decision Intelligence
                  </p>
                </div>
              `,
            }),
          })
        }
      } catch (mailEx) {
        console.error('[join-org] mail failed:', mailEx)
        // Lad join-flowet lykkes selvom mail fejler
      }
    }

    return Response.json({ org_id: org.id, org_name: org.name, role, status })
  } catch (ex) {
    console.error('[join-org]', ex)
    return Response.json({ error: String(ex) }, { status: 500 })
  }
}
