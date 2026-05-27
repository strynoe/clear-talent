import { buildAnalysisPrompt } from '@/lib/buildAnalysisPrompt'

// Streaming function — Netlify allows longer execution when data flows continuously
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
    typology_summary: 'CV-mønstre tyder på en ENTP 387-profil — energisk og idédrevet.',
    detailed_explanation: 'Dette er en placeholder — AI-analyse kræver ANTHROPIC_API_KEY.',
    typology_strengths: ['Idégenerering', 'Præstationsdrevet', 'Beslutsomhed', 'Entusiasme'],
    typology_weaknesses: ['Kan starte mange projekter og afslutte få'],
    collab_strengths: ['Bringer nye perspektiver', 'Tør tage svære samtaler'],
    collab_risks: ['Kan komme i konflikt med meget strukturerede profiler'],
    bars: [
      { l: 'Initiativ', v: rnd(50, 90) },
      { l: 'Kommunikation', v: rnd(50, 90) },
      { l: 'Analytisk tænkning', v: rnd(50, 90) },
      { l: 'Fremdrift', v: rnd(50, 90) },
      { l: 'Tilpasningsevne', v: rnd(50, 90) },
    ],
    flags: [{ severity: 'ok', text: 'Profilanalyse gennemført' }],
    interview_questions: [
      'Beskriv et projekt du startede med høj energi.',
      'Hvornår pressede du dig selv mest?',
      'Hvad motiverer dig mest?',
    ],
  }
}

export async function POST(request: Request) {
  const { content, name, team_context, leader_context, role_context } = await request.json()

  const encoder = new TextEncoder()

  // True streaming: forward Anthropic text deltas to client as they arrive.
  // Continuous data flow allows the function to run beyond the default timeout.
  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (!process.env.ANTHROPIC_API_KEY) {
          controller.enqueue(encoder.encode(JSON.stringify(mockResult(name ?? 'Kandidat'))))
          controller.close()
          return
        }

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
            stream: true,
          }),
        })

        if (!resp.ok || !resp.body) {
          controller.enqueue(encoder.encode(JSON.stringify(mockResult(name ?? 'Kandidat'))))
          controller.close()
          return
        }

        // Parse Anthropic's SSE stream and forward text deltas as plain text
        const reader = resp.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const payload = line.slice(6).trim()
            if (!payload || payload === '[DONE]') continue
            try {
              const event = JSON.parse(payload)
              if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                const text: string = event.delta.text ?? ''
                if (text) controller.enqueue(encoder.encode(text))
              }
            } catch { /* skip malformed lines */ }
          }
        }

        controller.close()
      } catch (err) {
        // On any unexpected error, send mock so client always gets valid JSON
        try {
          controller.enqueue(encoder.encode(JSON.stringify(mockResult(name ?? 'Kandidat'))))
        } catch { /* stream may already be closed */ }
        controller.close()
        console.error('[analyze stream error]', err)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  })
}
