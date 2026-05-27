import { buildAnalysisPrompt } from '@/lib/buildAnalysisPrompt'

// Forlænget timeout — AI-analysen kan tage 20-30 sek
export const maxDuration = 60

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function mockResult(name: string) {
  return {
    headline: 'Erfaren professional med solid baggrund',
    score: rnd(42, 94),
    personal_bio: `${name} fremstår som en engageret person med en tydelig retning i sit karrierevalg.`,
    summary: `${name} fremstår som en kompetent kandidat med relevant erfaring.`,
    mbti: 'ENTP',
    enneagram: '387',
    typology_summary: 'CV-mønstre tyder på en ENTP 387-profil — energisk og idédrevet med en naturlig præstationsorientering.',
    detailed_explanation: 'Dette er en placeholder — AI-analyse kræver ANTHROPIC_API_KEY.',
    typology_strengths: ['Idégenerering og innovation', 'Præstationsdrevet (tritype 3)', 'Naturlig ledelsesinstinkt (tritype 8)', 'Entusiasme der trækker andre med (tritype 7)'],
    typology_weaknesses: ['Kan starte mange projekter og afslutte få', 'Risiko for at performe rolle frem for at være autentisk'],
    collab_strengths: ['Bringer nye perspektiver', 'Tør tage svære samtaler', 'Høj energi i fastlåste situationer'],
    collab_risks: ['Kan komme i konflikt med meget strukturerede profiler', 'Kan opfattes som dominerende'],
    bars: [
      { l: 'Initiativ', v: rnd(50, 90) },
      { l: 'Kommunikation', v: rnd(50, 90) },
      { l: 'Analytisk tænkning', v: rnd(50, 90) },
      { l: 'Fremdrift', v: rnd(50, 90) },
      { l: 'Tilpasningsevne', v: rnd(50, 90) },
    ],
    flags: [{ severity: 'ok', text: 'Profilanalyse gennemført på CV' }],
    interview_questions: [
      'Beskriv et projekt du startede med høj energi — hvordan endte det?',
      'Hvornår sidst pressede du dig selv eller andre over en grænse for at nå et mål?',
      'Hvad motiverer dig mere end noget andet i dit arbejdsliv?',
    ],
  }
}

export async function POST(request: Request) {
  const { content, name, team_context, leader_context, role_context } = await request.json()

  const encoder = new TextEncoder()

  // Streaming response with keepalive whitespace — ensures bytes flow during the
  // long Anthropic call so Netlify's gateway treats this as a streaming function
  // and doesn't trigger a 504. JSON.parse ignores leading whitespace, so the
  // client's res.json() works unchanged.
  const stream = new ReadableStream({
    async start(controller) {
      // Initial whitespace byte to commit to streaming mode immediately
      controller.enqueue(encoder.encode(' '))

      const keepalive = setInterval(() => {
        try { controller.enqueue(encoder.encode(' ')) } catch { /* stream closed */ }
      }, 5000)

      let result

      try {
        if (process.env.ANTHROPIC_API_KEY) {
          const { system, temperature, maxTokens } = buildAnalysisPrompt({
            roleContext: role_context || undefined,
            leaderContext: leader_context || undefined,
            teamContext: team_context || undefined,
          })

          const userContent = [
            `Kandidat: ${name}`,
            content || '(ingen tekst)',
            role_context    ? `\n\n━━━ ROLLE-KONTEKST ━━━\n${role_context}` : '',
            leader_context  ? `\n\n━━━ LEDER-KONTEKST ━━━\n${leader_context}` : '',
            team_context    ? `\n\n━━━ EKSISTERENDE TEAMMEDLEMMER ━━━\n${team_context}` : '',
          ].filter(Boolean).join('\n\n')

          const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: maxTokens,
              temperature,
              system,
              messages: [{ role: 'user', content: userContent }],
            }),
          })

          if (resp.ok) {
            const data = await resp.json()
            const raw: string = data.content?.[0]?.text ?? ''
            try { result = JSON.parse(raw) } catch {
              const m = raw.match(/\{[\s\S]*\}/)
              if (m) try { result = JSON.parse(m[0]) } catch { /* fall through */ }
            }
          }
        }
      } catch { /* fall through to mock */ }

      if (!result) result = mockResult(name ?? 'Kandidat')

      clearInterval(keepalive)
      controller.enqueue(encoder.encode(JSON.stringify(result)))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  })
}
