// Uses Supabase REST API directly via fetch — no SDK needed

// Forlænget timeout — AI-analysen kan tage 20-30 sek
export const maxDuration = 60

import { buildAnalysisPrompt } from '@/lib/buildAnalysisPrompt'

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
  const overall = rnd(50, 88)
  return {
    headline: 'Solid profil med relevant baggrund',
    type: 'INFJ 459',
    confidence: 'lav' as const,
    confidence_reason: 'Mock-data — AI-analyse kræver ANTHROPIC_API_KEY.',
    overall_score: overall,
    overall_reason: 'Mock-score uden reel vurdering.',
    bottom_line: `${name} fremstår som en kompetent profil baseret på det indsendte materiale. Dette er mock-data.`,
    role_fit_score: rnd(45, 85),
    role_needs: ['Relevant erfaring', 'Faglige kompetencer'],
    candidate_brings: ['ikke dokumenteret i CV', 'ikke dokumenteret i CV'],
    role_fit_summary: 'Mock rolle-fit — AI-analyse kræver ANTHROPIC_API_KEY.',
    flags: [{ severity: 'ok' as const, text: 'Profil oprettet via invitationslink (mock)', action: 'Ingen handling nødvendig' }],
    interview_questions: [
      { question: 'Beskriv din stærkeste faglige kompetence med et konkret eksempel.', probes: 'Mock-spørgsmål' },
    ],
    team_contributions: ['Bidrager med dybde', 'Stærk indre kompas'],
    team_risks: ['Kan trække sig under pres'],
    personality_plain: 'CV-mønstre tyder på en INFJ 459-profil — reflekteret og analytisk med fokus på dybde og mening. Dette er mock-data.',
    behavior_bars: {
      'Analytisk tænkning': rnd(50, 85),
      'Beslutningsevne': rnd(40, 75),
      'Struktur': rnd(55, 85),
      'Initiativ': rnd(40, 75),
      'Samarbejde': rnd(55, 85),
      'Tilpasningsevne': rnd(40, 75),
    },
  }
}

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

    let result = mockResult(name.trim())

    // Fetch role context for job invites
    let roleContext = ''
    let teamContext = ''

    try {
      if (invite.type === 'job') {
        // Fetch job description and team members in parallel
        const [jobRes, teamRes] = await Promise.all([
          fetch(sbUrl(`jobs?id=eq.${invite.target_id}&select=title,description,hard_skills,success_criteria,experience_level,team_id`), { headers: sbHeaders() }),
          // We'll fetch team members after we know team_id
          Promise.resolve(null),
        ])

        const jobRows = await jobRes.json()
        if (Array.isArray(jobRows) && jobRows[0]) {
          const job = jobRows[0]
          roleContext = [
            job.title            && `Stilling: ${job.title}`,
            job.experience_level && `Erfaringsniveau: ${job.experience_level}`,
            job.description      && `Beskrivelse: ${job.description}`,
            job.hard_skills      && `Hard skills: ${job.hard_skills}`,
            job.success_criteria && `Succeskriterier: ${job.success_criteria}`,
          ].filter(Boolean).join('\n')

          if (job.team_id) {
            const r = await fetch(sbUrl(`employees?team_id=eq.${job.team_id}&select=name,mbti,enneagram`), { headers: sbHeaders() })
            const rows = await r.json()
            if (Array.isArray(rows) && rows.length > 0) {
              teamContext = rows
                .filter((x: { mbti?: string }) => x.mbti)
                .map((x: { name: string; mbti?: string; enneagram?: string }) =>
                  `- ${x.name}: ${x.mbti}${x.enneagram ? ` ${x.enneagram}` : ''}`
                ).join('\n')
            }
          }
        }
        void teamRes
      } else if (invite.type === 'team') {
        const r = await fetch(sbUrl(`employees?team_id=eq.${invite.target_id}&select=name,mbti,enneagram`), { headers: sbHeaders() })
        const rows = await r.json()
        if (Array.isArray(rows) && rows.length > 0) {
          teamContext = rows
            .filter((x: { mbti?: string }) => x.mbti)
            .map((x: { name: string; mbti?: string; enneagram?: string }) =>
              `- ${x.name}: ${x.mbti}${x.enneagram ? ` ${x.enneagram}` : ''}`
            ).join('\n')
        }
      }
    } catch { /* context fetch failure is non-fatal */ }

    if (process.env.ANTHROPIC_API_KEY) {
      const { system, temperature, maxTokens } = buildAnalysisPrompt({
        roleContext: roleContext || undefined,
        teamContext: teamContext || undefined,
        includeCvExtract: !!cv_pdf_base64,
      })

      const textParts: string[] = [`Kandidat: ${name.trim()}`]
      if (linkedin_url?.trim())      textParts.push(`LinkedIn: ${linkedin_url.trim()}`)
      if (cv_text?.trim())           textParts.push(`CV/Baggrund:\n${cv_text.trim()}`)
      if (application_text?.trim())  textParts.push(`Ansøgning/motivation:\n${application_text.trim()}`)
      if (teamContext)               textParts.push(`EKSISTERENDE TEAMMEDLEMMER:\n${teamContext}`)
      if (roleContext)               textParts.push(`ROLLE-KONTEKST:\n${roleContext}`)
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
            max_tokens: cv_pdf_base64 ? 2500 : maxTokens,
            temperature,
            system,
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

    // Ny schema-mapping
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resultAny = result as any
    const typeStr: string = resultAny.type ?? ''
    const typeParts = typeStr.trim().split(/\s+/)
    const mbti: string = typeParts[0] ?? resultAny.mbti ?? ''
    const enneagram: string = (typeParts.slice(1).join(' ') || resultAny.enneagram) ?? ''

    const score: number = resultAny.overall_score ?? resultAny.score ?? 65
    const verdict = score >= 80 ? 'Anbefalet' : score >= 60 ? 'Forsigtighed' : 'Frarådet'

    // behavior_bars (object) → bars (array)
    const bbRaw: Record<string, number> | undefined = resultAny.behavior_bars
    const aiBars: { l: string; v: number }[] = bbRaw && typeof bbRaw === 'object'
      ? Object.entries(bbRaw).map(([l, v]) => ({ l, v: v as number }))
      : Array.isArray(resultAny.bars)
        ? (resultAny.bars as { l: string; v: number }[]).slice(0, 5)
        : []

    const GRADS = [
      'linear-gradient(135deg,#3a8a5a,#5aaa7a)', 'linear-gradient(135deg,#5a3a8a,#8a5aaa)',
      'linear-gradient(135deg,#8a3a6a,#aa5a8a)', 'linear-gradient(135deg,#3a5a8a,#5a7aaa)',
      'linear-gradient(135deg,#6a3a3a,#8a5a5a)', 'linear-gradient(135deg,#3a6a8a,#5a8aaa)',
    ]
    const grad = GRADS[rnd(0, GRADS.length - 1)]

    const cvTextToSave = cv_text?.trim() || resultAny.cv_extracted || ''

    // DB-insert: mapper nye AI-felter til eksisterende kolonner
    // Felterne confidence, overall_reason, role_needs, candidate_brings kræver DB-migration
    const record = {
      name: name.trim(), score, grad, bars: aiBars, verdict,
      headline:              resultAny.headline ?? '',
      summary:               resultAny.bottom_line ?? resultAny.summary ?? '',
      personal_bio:          '',
      mbti, enneagram,
      typology_summary:      resultAny.personality_plain ?? resultAny.typology_summary ?? '',
      detailed_explanation:  resultAny.detailed_explanation ?? '',
      typology_strengths:    resultAny.typology_strengths ?? [],
      typology_weaknesses:   resultAny.typology_weaknesses ?? [],
      collab_strengths:      resultAny.team_contributions ?? resultAny.collab_strengths ?? [],
      collab_risks:          resultAny.team_risks ?? resultAny.collab_risks ?? [],
      flags:                 resultAny.flags ?? [],
      strengths:             [],
      risks:                 [],
      interview_questions:   resultAny.interview_questions ?? [],
      role_fit_score:        typeof resultAny.role_fit_score === 'number' ? resultAny.role_fit_score : null,
      role_fit_reasoning:    resultAny.role_fit_summary ?? resultAny.role_fit_reasoning ?? '',
      cv_text:               cvTextToSave,
      application_text:      application_text?.trim() ?? '',
      linkedin_url:          linkedin_url?.trim() ?? '',
      cv_was_pdf:            !!cv_pdf_base64,
    }

    const table = invite.type === 'job' ? 'candidates' : 'employees'
    const fk    = invite.type === 'job' ? 'job_id'    : 'team_id'
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
