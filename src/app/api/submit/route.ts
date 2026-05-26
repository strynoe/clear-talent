// Uses Supabase REST API directly via fetch — no SDK needed

// Forlænget timeout — AI-analysen kan tage 20-30 sek
export const maxDuration = 60

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
    enneagram: '459',
    typology_summary: 'En INFJ 459 — en reflekteret og analytisk profil med fokus på dybde og mening.',
    detailed_explanation: 'En typologisk vurdering er ikke mulig uden AI. Dette er en placeholder med eksempelværdier.',
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
    const { token, name, cv_text, cv_pdf_base64, linkedin_url, application_text } = await request.json()
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

    // AI analysis
    let result = mockResult(name.trim())

    // Fetch team context (other members' MBTI for comparison)
    let teamContext = ''
    try {
      if (invite.type === 'team') {
        const r = await fetch(sbUrl(`employees?team_id=eq.${invite.target_id}&select=name,mbti,enneagram`), { headers: sbHeaders() })
        const rows = await r.json()
        if (Array.isArray(rows) && rows.length > 0) {
          teamContext = rows.filter((x: { mbti?: string }) => x.mbti).map((x: { name: string; mbti?: string; enneagram?: string }) => `- ${x.name}: ${x.mbti || '?'}${x.enneagram ? ` ${x.enneagram}` : ''}`).join('\n')
        }
      } else if (invite.type === 'job') {
        const jobRes = await fetch(sbUrl(`jobs?id=eq.${invite.target_id}&select=team_id`), { headers: sbHeaders() })
        const jobRows = await jobRes.json()
        const teamId = Array.isArray(jobRows) && jobRows[0]?.team_id
        if (teamId) {
          const r = await fetch(sbUrl(`employees?team_id=eq.${teamId}&select=name,mbti,enneagram`), { headers: sbHeaders() })
          const rows = await r.json()
          if (Array.isArray(rows) && rows.length > 0) {
            teamContext = rows.filter((x: { mbti?: string }) => x.mbti).map((x: { name: string; mbti?: string; enneagram?: string }) => `- ${x.name}: ${x.mbti || '?'}${x.enneagram ? ` ${x.enneagram}` : ''}`).join('\n')
          }
        }
      }
    } catch { /* ignore team context failure */ }

    if (process.env.ANTHROPIC_API_KEY) {
      const sys = `Du er ekspert i MBTI (Myers-Briggs) og Enneagrammet med tritype-teori. Din opgave er at analysere en kandidat og udlede deres sandsynlige typekombination.

Du vil modtage én eller flere af følgende informationstyper:
- Et PDF-dokument (CV/Resume) — læs det grundigt
- Rå CV-tekst
- LinkedIn URL (brug som kontekst for karrieremønster)
- Ansøgning/motivationsbrev — er særlig værdifuldt for typologisk analyse

━━━ TEORIGRUNDLAG ━━━━━━━━━━━━━━━━━━━━━━━━

MBTI — 4 dichotomier giver 16 typer:
- E/I: udadvendt vs. indadvendt (energikilde)
- S/N: konkret sansende vs. mønster-intuitiv
- T/F: logisk tænkende vs. værdi-følende
- J/P: struktureret vs. fleksibel

Hver type har 4 kognitive funktioner i prioriteret rækkefølge (dominant, auxiliary, tertiary, inferior).

ENNEAGRAM TRITYPE:
9 grundtyper fordelt i 3 centre:
- HOVED: 5 (Iagttager), 6 (Loyalist), 7 (Entusiast) — kerne: ANGST
- HJERTE: 2 (Hjælper), 3 (Præsterer), 4 (Individualist) — kerne: SKAM
- KROP: 8 (Udfordrer), 9 (Fredsmægler), 1 (Perfektionist) — kerne: VREDE

TRITYPE = én type fra hvert center, i orden af dominans (3 cifre, fx 387, 549, 729).

━━━ FORMAT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Kombinationen skrives ALTID som "MBTI Tritype", fx "ENTP 387" eller "INFJ 549".

Læseren har INGEN forhåndskendskab — forklar alt i hverdagssprog men reference TILBAGE til teorien gennemgående.

Hvis team_context er angivet, vurdér konkret hvordan kandidatens MBTI + Tritype vil interagere med de navngivne teammedlemmer.

━━━ OUTPUT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Returnér KUN valid JSON uden markdown:
{
  "headline": "kort baggrund max 55 tegn",
  "score": tal 30-97,
  "personal_bio": "2-3 sætninger om personen som menneske",
  "summary": "3-4 sætninger samlet professionel vurdering",
  "mbti": "fire bogstaver fx ENTP",
  "enneagram": "tritype som 3 cifre fx 387",
  "typology_summary": "1-2 sætninger med kombinationen tydeligt nævnt (fx 'En ENTP 387 — ...') i klart sprog",
  "detailed_explanation": "6-10 sætninger der gennemgår MBTI-bogstaverne, kognitive funktioner, hver af de 3 tritype-cifre og hvordan kombinationen kommer til udtryk. Reference TILBAGE til teorien hele tiden.",
  "typology_strengths": ["styrke 1 (med teori-reference)","...2","...3","...4"],
  "typology_weaknesses": ["svaghed 1 (med teori-reference)","...2","...3"],
  "collab_strengths": ["bidrag 1","...2","...3"],
  "collab_risks": ["udfordring 1 (specifik hvis team-kontekst)","...2"],
  "flags": [{"severity":"red|warn|ok","text":"observation"}],
  "interview_questions": ["spørgsmål 1 (designet til at teste typologi-hypotesen)","...2","...3"]
}`

      // Build user message — supports PDF document block or plain text
      const textParts: string[] = [`Kandidat/medarbejder: ${name.trim()}`]
      if (linkedin_url?.trim()) textParts.push(`LinkedIn: ${linkedin_url.trim()}`)
      if (cv_text?.trim()) textParts.push(`CV/Baggrund:\n${cv_text.trim()}`)
      if (application_text?.trim()) textParts.push(`Ansøgning/motivation:\n${application_text.trim()}`)
      if (teamContext) textParts.push(`EKSISTERENDE TEAMMEDLEMMER:\n${teamContext}`)
      const textContent = textParts.join('\n\n')

      type ContentBlock =
        | { type: 'document'; source: { type: 'base64'; media_type: string; data: string } }
        | { type: 'text'; text: string }

      const messageContent: string | ContentBlock[] = cv_pdf_base64
        ? [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: cv_pdf_base64 } },
            { type: 'text', text: textContent },
          ]
        : textContent

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
            max_tokens: 1600,
            system: sys,
            messages: [{ role: 'user', content: messageContent }],
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
      strengths: result.typology_strengths ?? [],
      risks: result.typology_weaknesses ?? [],
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
