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
    personal_bio: `${name} er en person med en tydelig retning og engagement i sit arbejdsliv.`,
    summary: `${name} fremstår som en kompetent profil baseret på det indsendte materiale.`,
    mbti: 'INFJ',
    enneagram: '5w4',
    typology_summary: 'En reflekteret og analytisk profil med fokus på dybde og mening.',
    detailed_explanation: 'En typologisk vurdering er ikke mulig uden AI. Dette er en placeholder.',
    typology_strengths: ['Refleksion', 'Engagement', 'Faglig dybde'],
    typology_weaknesses: ['Kan virke distanceret'],
    collab_strengths: ['Bidrager med dybde', 'Stærk indre kompas'],
    collab_risks: ['Kan trække sig under pres'],
    flags: [{ severity: 'ok' as const, text: 'Profil oprettet via invitationslink' }],
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

    // Fetch team context (other members of same job's team or same team)
    let teamContext = ''
    try {
      if (invite.type === 'team') {
        const r = await fetch(sbUrl(`employees?team_id=eq.${invite.target_id}&select=name,mbti,enneagram`), { headers: sbHeaders() })
        const rows = await r.json()
        if (Array.isArray(rows) && rows.length > 0) {
          teamContext = rows.filter((x: { mbti?: string }) => x.mbti).map((x: { name: string; mbti?: string; enneagram?: string }) => `- ${x.name} (MBTI: ${x.mbti || '?'}, Enneagram: ${x.enneagram || '?'})`).join('\n')
        }
      } else if (invite.type === 'job') {
        const jobRes = await fetch(sbUrl(`jobs?id=eq.${invite.target_id}&select=team_id`), { headers: sbHeaders() })
        const jobRows = await jobRes.json()
        const teamId = Array.isArray(jobRows) && jobRows[0]?.team_id
        if (teamId) {
          const r = await fetch(sbUrl(`employees?team_id=eq.${teamId}&select=name,mbti,enneagram`), { headers: sbHeaders() })
          const rows = await r.json()
          if (Array.isArray(rows) && rows.length > 0) {
            teamContext = rows.filter((x: { mbti?: string }) => x.mbti).map((x: { name: string; mbti?: string; enneagram?: string }) => `- ${x.name} (MBTI: ${x.mbti || '?'}, Enneagram: ${x.enneagram || '?'})`).join('\n')
          }
        }
      }
    } catch { /* ignore team context failure */ }

    if (process.env.ANTHROPIC_API_KEY) {
      const sys = `Du er ekspert i MBTI og Enneagrammet og bruger dem til at vurdere kandidater til rekruttering.

VIGTIGT:
- Læseren har INGEN forhåndskendskab til MBTI eller Enneagram. Forklar ALT i hverdagssprog.
- Brug aldrig fagudtryk uden at forklare dem kort.
- Dine vurderinger er kvalificerede gæt baseret på CV — IKKE en officiel test.
- Hvis der er angivet eksisterende teammedlemmer, brug dem til konkret at vurdere kollaborationsrisici med de navngivne personer.

Returnér KUN valid JSON uden markdown:
{
  "headline": "kort baggrund max 55 tegn",
  "score": tal 30-97,
  "personal_bio": "2-3 sætninger om personen som menneske",
  "summary": "3-4 sætninger samlet professionel vurdering",
  "mbti": "fire bogstaver fx INTJ",
  "enneagram": "tal + vinge fx 5w4",
  "typology_summary": "1-2 sætninger på hverdagssprog uden fagudtryk",
  "detailed_explanation": "4-6 sætninger der forklarer MBTI og Enneagram i klart sprog. Forklar hvert bogstav/tal kort.",
  "typology_strengths": ["styrke 1","...2","...3","...4"],
  "typology_weaknesses": ["svaghed 1","...2","...3"],
  "collab_strengths": ["bidrag 1","...2","...3"],
  "collab_risks": ["udfordring 1 (specifik hvis team-kontekst)","...2"],
  "flags": [{"severity":"red|warn|ok","text":"observation"}],
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
            max_tokens: 1800,
            system: sys,
            messages: [{ role: 'user', content: `Kandidat/medarbejder: ${name.trim()}\n\n${content}${teamContext ? `\n\nEKSISTERENDE TEAMMEDLEMMER:\n${teamContext}` : ''}` }],
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
      headline: result.headline ?? '',
      summary: result.summary ?? '',
      personal_bio: result.personal_bio ?? '',
      mbti: result.mbti ?? '',
      enneagram: result.enneagram ?? '',
      typology_summary: result.typology_summary ?? '',
      detailed_explanation: result.detailed_explanation ?? '',
      typology_strengths: result.typology_strengths ?? [],
      typology_weaknesses: result.typology_weaknesses ?? [],
      collab_strengths: result.collab_strengths ?? [],
      collab_risks: result.collab_risks ?? [],
      flags: result.flags ?? [],
      strengths: result.typology_strengths ?? result.strengths ?? [],
      risks: result.typology_weaknesses ?? result.risks ?? [],
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
