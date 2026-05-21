function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function mockResult(name: string) {
  const score = rnd(42, 94)
  const flags = score >= 80
    ? [{ severity: 'ok', text: 'Stærkt CV med dokumenterede resultater' }]
    : [{ severity: 'warn', text: 'Middelmådig match på kernekompetencer' }]
  return {
    headline: 'Erfaren professional med solid baggrund',
    score,
    personal_bio: `${name} fremstår som en engageret person med en tydelig retning i sit karrierevalg.`,
    summary: `${name} fremstår som en kompetent kandidat med relevant erfaring.`,
    mbti: 'INFJ',
    enneagram: '5w4',
    typology_summary: 'En dyb, idealistisk og analytisk profil der trives med komplekse opgaver og meningsfulde projekter.',
    detailed_explanation: 'MBTI-typen INFJ står for Introvert, Intuitiv, Følende, Vurderende — det betyder en person der orienterer sig indad, tænker i mønstre og helheder, lægger vægt på værdier og foretrækker struktur. Enneagram 5w4 (Iagttager med vinge mod Individualist) beskriver et menneske der søger viden og uafhængighed, samtidig med en kunstnerisk og introspektiv side. Tilsammen giver det en eftertænksom, principfast og kreativ tilgang til arbejdslivet.',
    typology_strengths: ['Dyb refleksion og indsigt', 'Stærk indre overbevisning og værdier', 'Kreativ problemløsning', 'Forstår mennesker på et dybt plan'],
    typology_weaknesses: ['Kan trække sig socialt under pres', 'Tendens til perfektionisme', 'Svært ved overfladisk smalltalk'],
    collab_strengths: ['Bringer dybde og perspektiv til samtaler', 'Loyal og engageret i meningsfulde projekter', 'God til at se langsigtede konsekvenser'],
    collab_risks: ['Kan opfattes som distanceret af mere udadvendte kolleger', 'Behov for plads og ro — kan miste energi i konstante møder'],
    flags,
    interview_questions: [
      'Hvilken type opgaver giver dig mest energi?',
      'Hvordan håndterer du konflikter i et team?',
      'Beskriv en situation hvor du har stået fast på dine værdier.',
    ],
  }
}

export async function POST(request: Request) {
  const { content, name, team_context } = await request.json()

  if (process.env.ANTHROPIC_API_KEY) {
    const sys = `Du er ekspert i MBTI og Enneagrammet og bruger dem til at vurdere kandidater til rekruttering.

VIGTIGT:
- Læseren har INGEN forhåndskendskab til MBTI eller Enneagram. Forklar ALT i hverdagssprog.
- Brug aldrig fagudtryk uden at forklare dem kort. "Introvert" → "orienterer sig indad", "Intuitiv" → "tænker i mønstre og muligheder", osv.
- Dine vurderinger er kvalificerede gæt baseret på CV og baggrund — IKKE en officiel test. Vær varsom med absolutte påstande.
- Hvis team_context er angivet, brug den til konkret at vurdere kollaborationsrisici med de specifikke navngivne teammedlemmer.

MBTI-typer er fire bogstaver (fx INTJ, ENFP). Enneagram er et tal 1-9 + valgfri vinge (fx 5w4, 7w6).

Returnér KUN valid JSON uden markdown:
{
  "headline": "kort baggrund max 55 tegn",
  "score": tal 30-97,
  "personal_bio": "2-3 sætninger om personen som menneske, varmt sprog",
  "summary": "3-4 sætninger samlet professionel vurdering",
  "mbti": "fire bogstaver fx INTJ",
  "enneagram": "tal + vinge fx 5w4",
  "typology_summary": "1-2 sætninger på hverdagssprog der beskriver personen typologisk uden fagudtryk",
  "detailed_explanation": "4-6 sætninger der forklarer både MBTI og Enneagram type i klart sprog. Forklar hvert bogstav/tal kort. Beskriv hvordan kombinationen påvirker arbejdsstil, beslutninger og samspil.",
  "typology_strengths": ["typologisk styrke 1", "...2", "...3", "...4"],
  "typology_weaknesses": ["typologisk svaghed 1", "...2", "...3"],
  "collab_strengths": ["sådan bidrager de godt i team 1", "...2", "...3"],
  "collab_risks": ["mulig udfordring 1 (specifikt hvis team_context er angivet)", "...2"],
  "flags": [{"severity":"red|warn|ok","text":"observation"}],
  "interview_questions": ["spørgsmål 1", "spørgsmål 2", "spørgsmål 3"]
}`

    const userContent = [
      `Kandidat: ${name}`,
      content || '(ingen tekst)',
      team_context ? `\n\nEKSISTERENDE TEAMMEDLEMMER (brug til specifikke collab_risks):\n${team_context}` : '',
    ].filter(Boolean).join('\n\n')

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
          messages: [{ role: 'user', content: userContent }],
        }),
      })
      if (resp.ok) {
        const data = await resp.json()
        const raw: string = data.content?.[0]?.text ?? ''
        try { return Response.json(JSON.parse(raw)) } catch { /* fall through */ }
        const m = raw.match(/\{[\s\S]*\}/)
        if (m) return Response.json(JSON.parse(m[0]))
      }
    } catch { /* fall through to mock */ }
  }

  return Response.json(mockResult(name ?? 'Kandidat'))
}
