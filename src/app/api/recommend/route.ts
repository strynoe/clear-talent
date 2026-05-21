// Analyserer eksisterende teamsammensætning og anbefaler hvilken type der vil styrke teamet

interface Employee { name: string; wolf: string; wolfSec: string }

function mockRecommendation(employees: Employee[], description: string) {
  const types = ['Type 1','Type 2','Type 3','Type 4','Type 5','Type 6','Type 7','Type 8']
  const existing = employees.map(e => e.wolf)
  const missing = types.filter(t => !existing.includes(t))
  const recommended = missing[0] ?? types[0]
  return {
    recommended_type: recommended,
    reasoning: `Teamet mangler en ${recommended}-profil. Baseret på stillingsbeskrivelsen vil denne type styrke teamets balance.`,
    team_composition: existing,
    gap_analysis: `Teamet har ${employees.length} medarbejdere. ${missing.length} typeroller er ikke repræsenteret.`,
  }
}

export async function POST(request: Request) {
  const { employees, description, teamName } = await request.json()

  if (process.env.ANTHROPIC_API_KEY && employees?.length >= 0) {
    const typeMap: Record<string, string> = {
      architect:'Type 1', hunter:'Type 2', builder:'Type 3', guardian:'Type 4',
      protector:'Type 5', connector:'Type 6', challenger:'Type 7', explorer:'Type 8',
    }
    const teamSummary = employees.length === 0
      ? 'Teamet er tomt — ingen medarbejdere endnu.'
      : employees.map((e: Employee) => `- ${e.name}: ${typeMap[e.wolf] ?? e.wolf}${e.wolfSec ? ` (sekundær: ${typeMap[e.wolfSec] ?? e.wolfSec})` : ''}`).join('\n')

    const sys = `Du er ekspert i teamsammensætning for TypeSystems. Returnér KUN valid JSON uden markdown.
De 8 arbejdsstilstyper: Type 1 (architect), Type 2 (hunter), Type 3 (builder), Type 4 (guardian), Type 5 (protector), Type 6 (connector), Type 7 (challenger), Type 8 (explorer).

Du modtager et eksisterende team og en stillingsbeskrivelse. Analyser teamets sammensætning og anbefal hvilken type der vil styrke teamet mest.

JSON format:
{
  "recommended_type": "Type X",
  "reasoning": "2-3 sætninger der forklarer anbefalingen konkret ud fra teamets nuværende sammensætning og stillingsbeskrivelsen",
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
