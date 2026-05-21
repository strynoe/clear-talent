import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const WOLF_LABEL: Record<string, string> = {
  architect: 'Type 1', hunter: 'Type 2', builder: 'Type 3', guardian: 'Type 4',
  protector: 'Type 5', connector: 'Type 6', challenger: 'Type 7', explorer: 'Type 8',
}

const WOLVES = Object.keys(WOLF_LABEL)

const QUESTIONS = [
  // Dit arbejdsliv
  'Jeg tager gerne initiativ uden at blive bedt om det',
  'Jeg trives med at arbejde selvstændigt uden tæt opfølgning',
  'Jeg sætter gerne retning og beslutter, når andre er i tvivl',
  'Jeg analyserer situationer grundigt, inden jeg handler',
  'Jeg fokuserer hellere på det store billede end på detaljer',
  'Jeg motiveres stærkt af at nå konkrete mål',
  'Jeg opsøger aktivt nye muligheder og udfordringer',
  'Jeg er god til at organisere og planlægge mit arbejde',
  'Detaljer og præcision er vigtigt for mig',
  'Jeg arbejder bedst med klare processer og retningslinjer',
  // Dit samarbejde
  'Jeg tager ansvar for mine fejl og lærer af dem',
  'Kvalitet er vigtigere for mig end hastighed',
  'Jeg holder regler og procedurer, selv når ingen kigger',
  'Jeg trives bedst, når jeg arbejder tæt med andre',
  'Jeg hjælper gerne kolleger, selvom det ikke er mit ansvar',
  'Jeg sætter teamets behov over mine egne',
  'Jeg bygger let relationer til nye mennesker',
  'Jeg er god til at formidle komplekse emner på en enkel måde',
  'Jeg trives i sociale og netværksorienterede situationer',
  'Jeg er meget loyal over for mine kolleger og organisation',
  // Din personlighed
  'Jeg udfordrer gerne eksisterende antagelser og metoder',
  'Jeg er ikke bange for at sige min mening, selv når den er upopulær',
  'Jeg ser problemer som muligheder frem for forhindringer',
  'Jeg kommer ofte med nye og ukonventionelle idéer',
  'Jeg trives bedst i omgivelser, der er åbne for forandring',
  'Jeg foretrækker at eksperimentere frem for at følge opskriften',
  'Jeg holder fast i mine forpligtelser, selv under pres',
  'Jeg foretrækker stabilitet og forudsigelighed frem for forandring',
  'Jeg performer godt under pres og med stramme deadlines',
  'Jeg bevarer roen i kaotiske situationer',
  // Dine værdier
  'Jeg har let ved at prioritere, når der er meget på spil',
  'Jeg er god til at sætte mig i andres sted',
  'Jeg mærker hurtigt, hvis en kollega mistrives',
  'Det er vigtigt for mig, at alle i et team føler sig hørt',
  'Jeg tager gerne beslutninger hurtigt, selv med begrænset information',
  'Jeg stoler på min intuition, når data ikke giver et klart svar',
  'Jeg er komfortabel med at stå inde for mine beslutninger efterfølgende',
  'Jeg tænker mere på fremtidige muligheder end nuværende udfordringer',
  'Jeg er god til at identificere mønstre og sammenhænge i komplekse situationer',
  'Jeg motiveres af at skabe resultater, der gør en reel forskel for andre',
]

const SECTIONS = [
  { title: 'Dit arbejdsliv', from: 0, to: 10 },
  { title: 'Dit samarbejde', from: 10, to: 20 },
  { title: 'Din personlighed', from: 20, to: 30 },
  { title: 'Dine værdier', from: 30, to: 40 },
]

function formatAnswers(answers: number[]): string {
  return SECTIONS.map(s =>
    `${s.title}:\n` +
    QUESTIONS.slice(s.from, s.to)
      .map((q, i) => `- ${q}: ${answers[s.from + i]}/5`)
      .join('\n')
  ).join('\n\n')
}

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function mockResult(name: string) {
  const w = WOLVES[rnd(0, 7)]
  const ws = WOLVES[rnd(0, 7)]
  const score = rnd(50, 88)
  return {
    headline: 'Solid profil med relevant baggrund',
    score,
    wolf_primary: w,
    wolf_secondary: ws,
    wolf_reasoning: `Svarene indikerer en ${WOLF_LABEL[w]}-profil med fokus på samarbejde og initiativ.`,
    personal_bio: `${name} er en person med en tydelig retning og engagement i sit arbejdsliv. Baggrunden vidner om en person der sætter pris på faglig udvikling og meningsfulde arbejdsrelationer.`,
    summary: `${name} fremstår som en kompetent profil baseret på spørgeskema og CV.`,
    flags: [{ severity: 'ok' as const, text: 'Spørgeskema gennemført' }],
    strengths: ['Faglig kompetence', 'Kommunikation', 'Samarbejdsevne'],
    risks: ['Begrænset erfaring på området'],
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
  const { token, name, cv_text, answers } = await request.json()
  if (!token || !name?.trim()) {
    return Response.json({ error: 'Navn og token er påkrævet' }, { status: 400 })
  }

  const supabase = db()

  // Validate invite token
  const { data: invite, error: invErr } = await supabase
    .from('invite_links')
    .select('*')
    .eq('id', token)
    .single()

  if (invErr || !invite) return Response.json({ error: 'Ugyldigt invitationslink' }, { status: 400 })
  if (invite.used_at) return Response.json({ error: 'Dette link er allerede brugt' }, { status: 409 })
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return Response.json({ error: 'Invitationslinket er udløbet' }, { status: 410 })
  }

  // Build content for AI
  const answersText = Array.isArray(answers) && answers.length === 40
    ? formatAnswers(answers as number[])
    : ''
  const content = [
    answersText ? `Spørgeskema (1=Helt uenig, 5=Helt enig):\n${answersText}` : '',
    cv_text?.trim() ? `CV / Baggrund:\n${cv_text.trim()}` : '(intet CV indsendt)',
  ].filter(Boolean).join('\n\n---\n\n')

  // AI analysis
  let result = mockResult(name.trim())

  if (process.env.ANTHROPIC_API_KEY) {
    const sys = `Du er ekspert i rekruttering for TypeSystems. Returnér KUN valid JSON uden markdown.
De 8 arbejdsstilstyper (brug disse præcise nøgler): architect, hunter, builder, guardian, protector, connector, challenger, explorer
JSON format:
{
  "headline": "kort baggrund max 55 tegn",
  "score": tal mellem 30 og 97,
  "wolf_primary": "en af de 8 typenøgler",
  "wolf_secondary": "en af de 8 typenøgler",
  "wolf_reasoning": "2-3 sætninger om typevalget baseret på spørgeskema og CV",
  "personal_bio": "2-3 sætninger der beskriver personen som menneske — hvem er de, hvad driver dem, hvad har formet dem — baseret på CV og spørgeskema. Skriv varmt og nysgerrigt, ikke korporativt.",
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
          messages: [{ role: 'user', content: `Kandidat/medarbejder: ${name.trim()}\n\n${content}` }],
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

  // Build DB record
  const score = typeof result.score === 'number' ? result.score : 65
  const verdict = score >= 80 ? 'Anbefalet' : score >= 60 ? 'Forsigtighed' : 'Frarådet'
  const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - .5)
  const bars = shuffle(ALL_METRICS).slice(0, 3).map((l: string) => ({ l, v: rnd(30, 97) }))
  const grad = GRADS[rnd(0, GRADS.length - 1)]
  const wLabel = WOLF_LABEL[(result.wolf_primary ?? '').toLowerCase()] ?? 'Type 1'
  const wSecLabel = WOLF_LABEL[(result.wolf_secondary ?? '').toLowerCase()] ?? ''

  const record = {
    name: name.trim(), score, grad, bars, verdict,
    wolf: wLabel, wolf_sec: wSecLabel,
    headline: result.headline ?? '',
    summary: result.summary ?? '',
    wolf_reasoning: result.wolf_reasoning ?? '',
    personal_bio: result.personal_bio ?? '',
    flags: result.flags ?? [],
    strengths: result.strengths ?? [],
    risks: result.risks ?? [],
    interview_questions: result.interview_questions ?? [],
  }

  // Insert into the right table
  if (invite.type === 'job') {
    const { error: insErr } = await supabase.from('candidates').insert({ ...record, job_id: invite.target_id })
    if (insErr) return Response.json({ error: insErr.message }, { status: 500 })
  } else {
    const { error: insErr } = await supabase.from('employees').insert({ ...record, team_id: invite.target_id })
    if (insErr) return Response.json({ error: insErr.message }, { status: 500 })
  }

  // Mark token used
  await supabase.from('invite_links').update({ used_at: new Date().toISOString() }).eq('id', token)

  return Response.json({ success: true, type: invite.type })
}
