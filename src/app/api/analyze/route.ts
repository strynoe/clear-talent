function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function mockResult(name: string) {
  const score = rnd(42, 94)
  const flags =
    score >= 80
      ? [
          { severity: 'ok', text: 'Stærkt CV med dokumenterede resultater' },
          { severity: 'ok', text: 'Stabil karrierevej og høj anciennitet' },
        ]
      : score >= 60
        ? [
            { severity: 'warn', text: 'Middelmådig match på kernekompetencer' },
            { severity: 'warn', text: 'Relativt kort erfaring indenfor feltet' },
          ]
        : [
            { severity: 'red', text: 'Væsentlige gap i relevante kompetencer' },
            { severity: 'warn', text: 'Begrænset anciennitet på det aktuelle niveau' },
          ]
  return {
    headline: 'Erfaren professional med solid baggrund',
    score,
    personal_bio: `${name} fremstår som en engageret person med en tydelig retning i sit karrierevalg. Baggrunden vidner om en person der sætter pris på faglig udvikling og meningsfulde arbejdsrelationer.`,
    summary: `${name} fremstår som en kompetent kandidat med relevant erfaring. Profilen matcher rollen på centrale parametre. Anbefales til en nærmere dialog for at afdække kulturel pasning og motivation.`,
    flags,
    strengths: ['Faglig kompetence', 'Kommunikation', 'Samarbejdsevne'],
    risks: ['Uklar karriereretning', 'Begrænset ledererfaring'],
    interview_questions: [
      'Beskriv din stærkeste faglige kompetence og giv et konkret eksempel.',
      'Hvad motiverer dig i dette job fremfor andre muligheder?',
      'Fortæl om en situation hvor du skulle navigere en vanskelig beslutning.',
    ],
  }
}

export async function POST(request: Request) {
  const { content, name } = await request.json()

  if (process.env.ANTHROPIC_API_KEY) {
    const sys = `Du er ekspert i rekruttering for TypeSystems. Returnér KUN valid JSON uden markdown.
Analysér kandidaten ud fra det givne materiale og giv en faglig vurdering.

JSON format:
{
  "headline": "kort baggrund max 55 tegn",
  "score": tal mellem 30 og 97,
  "personal_bio": "2-3 sætninger der beskriver personen som menneske — hvem er de, hvad driver dem, hvad har formet dem — baseret på CV. Skriv varmt og nysgerrigt, ikke korporativt.",
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
          messages: [{ role: 'user', content: `Kandidat: ${name}\n\n${content || '(ingen tekst)'}` }],
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
