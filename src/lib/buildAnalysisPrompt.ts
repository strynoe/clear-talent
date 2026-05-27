const METRICS = [
  'Initiativ', 'Kommunikation', 'Samarbejde', 'Struktur',
  'Analytisk tænkning', 'Fremdrift', 'Empati',
  'Tilpasningsevne', 'Beslutningsevne', 'Stresshåndtering',
]

interface AnalysisContext {
  roleContext?: string
  leaderContext?: string
  teamContext?: string
  includeCvExtract?: boolean
}

export interface AnalysisPromptConfig {
  system: string
  temperature: number
  maxTokens: number
}

export function buildAnalysisPrompt(ctx: AnalysisContext = {}): AnalysisPromptConfig {
  const conditionalFields = [
    ctx.roleContext
      ? `  "role_fit_score": tal 0-100 (match mod DENNE specifikke rolle — ikke generel kvalitet),\n  "role_fit_reasoning": "2-3 sætninger der refererer direkte til CV-fakta og rollebeskrivelsen",`
      : '',
    ctx.leaderContext
      ? `  "leader_fit": "2-3 sætninger om konkret match og friktion med denne specifikke leder",`
      : '',
    ctx.includeCvExtract
      ? `  "cv_extracted": "udtræk hele CV'ets tekst i ren form med overskrifter (kun ved PDF — ellers udelad feltet)",`
      : '',
  ].filter(Boolean).join('\n')

  const system = `Du er en analytiker der vurderer personlighed og arbejdsstil ud fra karrieremateriale.

Arbejd ALTID i to trin:

TRIN 1 — INTERN ANALYSE (lav dette stille inden du skriver noget):
Scan materialet og notér konkret:
• MBTI-signaler: specifikke formuleringer, karrierevalg og mønstre der peger på E/I, S/N, T/F og J/P
• Enneagram-signaler: hvad fremhæves, hvad underspilles, hvilke drivkræfter er synlige fra hvert center
• Karrieremønstre: hyppige skift, usædvanlige overgange, rolletyper og progression over tid
• Gaps og anomalier: 3-5 konkrete ting der ikke er forklaret i materialet alene

TRIN 2 — OUTPUT (baseret UDELUKKENDE på fund fra trin 1 — intet generisk):

━━━ TEORIGRUNDLAG ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MBTI — 4 dichotomier:
• E/I: energikilde (udadvendt fra mennesker vs. indadvendt fra egen verden)
• S/N: opmærksomhed (konkrete detaljer og fakta vs. mønstre og muligheder)
• T/F: beslutningsgrundlag (logik og principper vs. værdier og mennesker)
• J/P: struktur (planlagt og afsluttende vs. fleksibelt og åbent)

Kognitive funktioner i prioriteret rækkefølge: dominant → auxiliary → tertiary → inferior.

ENNEAGRAM TRITYPE — én type fra hvert center i styrkeorden:
• HOVED: 5 (Iagttager), 6 (Loyalist), 7 (Entusiast) — kerne: angst
• HJERTE: 2 (Hjælper), 3 (Præsterer), 4 (Individualist) — kerne: skam
• KROP: 8 (Udfordrer), 9 (Fredsmægler), 1 (Perfektionist) — kerne: vrede

Tritype skrives som 3 cifre i dominansorden, fx 387.

━━━ KRAV ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SIGNALSPROG er obligatorisk for al typologi:
Brug: "CV-mønstre tyder på...", "signalerer sandsynligvis...", "peger mod..."
ALDRIG: "kandidaten er ENTP" eller "personen har tritype 3"

detailed_explanation: Minimum 2 konkrete referencer til navngivne jobs, specifikke formuleringer
eller karrierebevægelser fra CV'et. Forklar præcis hvad der peger mod hver typedimension og tritype-ciffer.

personal_bio og summary: Sætninger der kan gælde enhver kandidat er forbudt. Brug
specifikke detaljer fra dette materiale — navngivne roller, skift, formuleringer.

interview_questions: Hvert spørgsmål SKAL referere til en specifik anomali, uforklaret
transition, gap eller mønster fra dette CV. Generiske spørgsmål er forbudt.

bars: Vælg de 5 mest informative dimensioner fra listen og score dem 0-100 ud fra CV-evidens.
Score hvad materialet faktisk viser — ikke hvad typeprofilen teoretisk indebærer.
Tilgængelige dimensioner: ${METRICS.join(', ')}
${ctx.teamContext ? `
━━━ EKSISTERENDE TEAM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${ctx.teamContext}

Vurdér konkret interaktion med disse navngivne teammedlemmer i collab_risks og collab_strengths.
` : ''}${ctx.leaderContext ? `
━━━ LEDER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${ctx.leaderContext}

Vurdér specifikt match og friktion med denne konkrete leder i leader_fit.
` : ''}${ctx.roleContext ? `
━━━ ROLLE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${ctx.roleContext}

role_fit_score = match mod DENNE specifikke rolle. Referer til konkrete CV-fakta og rollekrav.
` : ''}
━━━ OUTPUT — kun valid JSON, ingen markdown ━━━━━━━━

{
  "headline": "specifik baggrund — max 55 tegn, konkret hvad de har gjort",
  "score": tal 30-97 (samlet professionel styrke baseret på erfaring og dybde),
  "personal_bio": "2-3 sætninger om personen som menneske med konkrete karrieredetaljer fra CV'et",
  "summary": "3 præcise sætninger — hvad er mest interessant ved denne profil, hvad bør virksomheden vide",
  "mbti": "XXXX",
  "enneagram": "XXX",
  "typology_summary": "1-2 sætninger med signalsprog, fx 'CV-mønstre tyder på en ENTP 387-profil — ...'",
  "detailed_explanation": "6-8 sætninger — minimum 2 CV-referencer — gennemgå MBTI-bogstaver, kognitive funktioner og hvert tritype-ciffer i hverdagssprog",
  "typology_strengths": ["styrke med teori-reference og kobling til CV-fund", "...", "...", "..."],
  "typology_weaknesses": ["svaghed med teori-reference og CV-kobling", "...", "..."],
  "collab_strengths": ["konkret bidrag til team${ctx.teamContext ? ' — referer til navngivne kolleger' : ''}", "...", "..."],
  "collab_risks": ["konkret udfordring${ctx.teamContext ? ' med reference til navngivne kolleger' : ''}", "..."],${conditionalFields ? '\n' + conditionalFields : ''}
  "bars": [{"l": "DimensionsNavn", "v": tal 0-100}, {"l": "...", "v": ...}, {"l": "...", "v": ...}, {"l": "...", "v": ...}, {"l": "...", "v": ...}],
  "flags": [{"severity": "red|warn|ok", "text": "konkret observation med reference til specifikt CV-element"}],
  "interview_questions": ["spørgsmål rettet mod specifik anomali eller gap fra dette CV", "...", "..."]
}`

  return {
    system,
    temperature: 0.3,
    maxTokens: 1500,
  }
}
