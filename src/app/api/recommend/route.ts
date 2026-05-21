// Anbefaling baseret på et eksisterende team og en stillingsbeskrivelse.
// Personlighedstyper er fjernet — bygges op fra bunden.
// AI'en giver nu kun generel anbefaling baseret på beskrivelsen.

interface Employee { name: string }

function mockRecommendation(employees: Employee[], description: string) {
  return {
    reasoning: `Baseret på stillingsbeskrivelsen anbefales en profil der komplementerer det eksisterende team. ${description ? 'Beskrivelsen indikerer behov for relevante kompetencer indenfor det angivne område.' : ''}`,
    team_composition: employees.map(e => e.name),
    gap_analysis: `Teamet har ${employees.length} medarbejdere. En grundig vurdering af kandidater ud fra deres CV og baggrund anbefales.`,
    team_strengths: 'Teamets nuværende styrker bygger på samarbejde og faglig kompetence.',
    interview_focus: ['Faglig kompetence', 'Samarbejdsevne', 'Motivation for rollen'],
  }
}

export async function POST(request: Request) {
  const { employees, description, teamName } = await request.json()

  if (process.env.ANTHROPIC_API_KEY && employees?.length >= 0) {
    const teamSummary = employees.length === 0
      ? 'Teamet er tomt — ingen medarbejdere endnu.'
      : employees.map((e: Employee) => `- ${e.name}`).join('\n')

    const sys = `Du er ekspert i teamsammensætning for TypeSystems. Returnér KUN valid JSON uden markdown.

Du modtager et eksisterende team og en stillingsbeskrivelse. Giv en anbefaling om hvilken type profil der vil styrke teamet baseret på stillingsbeskrivelsen.

JSON format:
{
  "reasoning": "2-3 sætninger der forklarer anbefalingen baseret på teamet og stillingsbeskrivelsen",
  "gap_analysis": "1-2 sætninger om hvad teamet mangler eller har for meget af",
  "team_strengths": "1-2 sætninger om teamets nuværende styrker",
  "interview_focus": ["fokuspunkt 1", "fokuspunkt 2", "fokuspunkt 3"]
}`

    const userMsg = `Team: ${teamName ?? 'Ukendt team'}
Nuværende medarbejdere:
${teamSummary}

Stillingsbeskrivelse / hvad vi leder efter:
${description || '(ingen beskrivelse angivet)'}`

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
          system: sys,
          messages: [{ role: 'user', content: userMsg }],
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

  return Response.json(mockRecommendation(employees ?? [], description ?? ''))
}
