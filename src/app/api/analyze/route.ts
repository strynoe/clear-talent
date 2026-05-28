import { buildAnalysisPrompt } from '@/lib/buildAnalysisPrompt'

// Streaming function — Netlify allows longer execution when data flows continuously
export const maxDuration = 60

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function mockResult(name: string) {
  const overall = rnd(42, 94)
  return {
    headline: 'Erfaren professional med solid baggrund',
    type: 'ENTP 387',
    confidence: 'lav' as const,
    confidence_reason: 'Mock-data — AI-analyse kræver ANTHROPIC_API_KEY.',
    overall_score: overall,
    overall_reason: 'Mock-score uden reel vurdering.',
    bottom_line: `${name} fremstår som en engageret profil. Dette er mock-data — indsæt ANTHROPIC_API_KEY for rigtig analyse.`,
    role_fit_score: rnd(40, 90),
    role_needs: ['Relevant erfaring', 'Faglige kompetencer'],
    candidate_brings: ['ikke dokumenteret i CV', 'ikke dokumenteret i CV'],
    role_fit_summary: 'Mock rolle-fit — AI-analyse kræver ANTHROPIC_API_KEY.',
    flags: [{ severity: 'ok' as const, text: 'Profilanalyse gennemført (mock)', action: 'Ingen handling nødvendig' }],
    interview_questions: [
      { question: 'Beskriv et projekt du startede med høj energi.', probes: 'Mock-spørgsmål' },
    ],
    team_contributions: ['Bringer nye perspektiver'],
    team_risks: ['Kan komme i konflikt med strukturerede profiler'],
    personality_plain: 'CV-mønstre tyder på en ENTP 387-profil — energisk og idédrevet. Dette er mock-data.',
    behavior_bars: {
      'Analytisk tænkning': rnd(50, 90),
      'Beslutningsevne': rnd(50, 90),
      'Struktur': rnd(30, 70),
      'Initiativ': rnd(60, 95),
      'Samarbejde': rnd(50, 85),
      'Tilpasningsevne': rnd(55, 90),
    },
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
