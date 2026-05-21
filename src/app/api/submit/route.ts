// Uses Supabase REST API directly via fetch — no SDK needed

function sbHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? process.env.SUPABASE_ANON_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return {
    'Content-Type': 'application/json',
    'apikey': key,
    'Authorization': `Bearer ${key}`,
  }
}
function sbUrl(path: string) {
  return `${process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!}/rest/v1/${path}`
}

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function mockResult(name: string) {
  const score = rnd(50, 88)
  return {
    headline: 'Solid profil med relevant baggrund',
    score,
    personal_bio: `${name} er en person med en tydelig retning og engagement i sit arbejdsliv. Baggrunden vidner om en person der sætter pris på faglig udvikling og meningsfulde arbejdsrelationer.`,
    summary: `${name} fremstår som en kompetent profil baseret på det indsendte materiale.`,
    flags: [{ severity: 'ok' as const, text: 'Profil oprettet via invitationslink' }],
    strengths: ['Faglig kompetence', 'Kommunikation', 'Samarbejdsevne'],
    risks: ['Begrænset erfaring på området'],
    interview_questions: [
      'Beskriv din stærkeste faglige kompetence med et konkret eksempel.',
      'Hvad motiverer dig mest i dit arbejde?',
      'Fortæl om en situation, hvor du navigerede en vanskelig beslutning.',
    ],
  }
}

const ALL_METRICS = ['Initiativ','Kommunikation','Samarbejde','Struktur','Analytisk tænkning','Fremdrift','Empati','Tilpasningsevne','Beslutningsevne','Stresshåndtering']
const GRADS = [
  'linear-gradient(135deg,#3a8a5a,#5aaa7a)', 'linear-gradient(135deg,#5a3a8a,#8a5aaa)',
  'linear-gradient(135deg,#8a3a6a,#aa5a8a)', 'linear-gradient(135deg,#3a5a8a,#5a7aaa)',
  'linear-gradient(135deg,#6a3a3a,#8a5a5a)', 'linear-gradient(135deg,#3a6a8a,#5a8aaa)',
]

export async function POST(request: Request) {
  try {
    const { token, name, cv_text } = await request.json()
    if (!token || !name?.trim()) {
      return Response.json({ error: 'Navn og token er påkrævet' }, { status: 400 })
    }

    // Validate invite token
    const invRes = await fetch(
      sbUrl(`invite_links?id=eq.${token}&limit=1`),
      { headers: sbHeaders() }
    )
    const invRows = await invRes.json()
    if (!Array.isArray(invRows) || invRows.length === 0) {
      return Response.json({ error: 'Ugyldigt invitationslink' }, { status: 400 })
    }
    const invite = invRows[0]
    if (invite.used_at) return Response.json({ error: 'Dette link er allerede brugt' }, { status: 409 })
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return Response.json({ error: 'Invitationslinket er udløbet' }, { status: 410 })
    }

    const content = cv_text?.trim()
      ? `CV / Baggrund:\n${cv_text.trim()}`
      : '(intet CV indsendt)'

    // AI analysis
    let result = mockResult(name.trim())

    if (process.env.ANTHROPIC_API_KEY) {
      const sys = `Du er ekspert i rekruttering for TypeSystems. Returnér KUN valid JSON uden markdown.
Analysér kandidaten ud fra det givne materiale og giv en faglig vurdering.

JSON format:
{
  "headline": "kort baggrund max 55 tegn",
  "score": tal mellem 30 og 97,
  "personal_bio": "2-3 sætninger der beskriver personen som menneske — hvem er de, hvad driver dem, hvad har formet dem. Skriv varmt og nysgerrigt, ikke korporativt.",
  "summary": "3-4 sætninger samlet professionel vurdering",
  "flags": [{"severity":"red|warn|ok","text":"observation"}],
  "strengths": ["styrke 1","styrke 2","styrke 3"],
  "risks": ["risiko 1","risiko 2"],
  "interview_questions": ["spørgsmål 1","spørgsmål 2","spørgsmål 3"]
}`
      try {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: sys,
            messages: [{ role: 'user', content: `Kandidat/medarbejder: ${name.trim()}\n\n${content}` }],
          }),
        })
        if (resp.ok) {
          const d = await resp.json()
          const raw: string = d.content?.[0]?.text ?? ''
          try { result = JSON.parse(raw) } catch {
            const m = raw.match(/\{[\s\S]*\}/)
            if (m) try { result = JSON.parse(m[0]) } catch { /* use mock */ }
          }
        }
      } catch { /* use mock */ }
    }

    // Build record
    const score = typeof result.score === 'number' ? result.score : 65
    const verdict = score >= 80 ? 'Anbefalet' : score >= 60 ? 'Forsigtighed' : 'Frarådet'
    const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - .5)
    const bars = shuffle(ALL_METRICS).slice(0, 3).map((l: string) => ({ l, v: rnd(30, 97) }))
    const grad = GRADS[rnd(0, GRADS.length - 1)]

    const record = {
      name: name.trim(), score, grad, bars, verdict,
      wolf: '', wolf_sec: '',
      headline: result.headline ?? '',
      summary: result.summary ?? '',
      wolf_reasoning: '',
      personal_bio: result.personal_bio ?? '',
      flags: result.flags ?? [],
      strengths: result.strengths ?? [],
      risks: result.risks ?? [],
      interview_questions: result.interview_questions ?? [],
    }

    const table = invite.type === 'job' ? 'candidates' : 'employees'
    const fk = invite.type === 'job' ? 'job_id' : 'team_id'
    const insRes = await fetch(sbUrl(table), {
      method: 'POST',
      headers: { ...sbHeaders(), 'Prefer': 'return=minimal' },
      body: JSON.stringify({ ...record, [fk]: invite.target_id }),
    })
    if (!insRes.ok) {
      const err = await insRes.json().catch(() => ({}))
      return Response.json({ error: err?.message ?? `Insert failed (${insRes.status})` }, { status: 500 })
    }

    await fetch(sbUrl(`invite_links?id=eq.${token}`), {
      method: 'PATCH',
      headers: sbHeaders(),
      body: JSON.stringify({ used_at: new Date().toISOString() }),
    })

    return Response.json({ success: true, type: invite.type })
  } catch (ex) {
    console.error('[submit POST]', ex)
    return Response.json({ error: String(ex) }, { status: 500 })
  }
}
