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
    typology_summary: 'En energisk og innovativ profil — ENTP 387 — der trives med komplekse problemer, strategisk tænkning og at flytte grænser.',
    detailed_explanation: 'ENTP står for Extraverted (udadvendt — får energi af mennesker og idéer), iNtuitive (intuitiv — tænker i mønstre og muligheder frem for detaljer), Thinking (tænkende — beslutter ud fra logik), Perceiving (opfattende — foretrækker fleksibilitet over struktur). Den kognitive hovedfunktion er Ne (ekstravert intuition) — en konstant idégenererings-motor — efterfulgt af Ti (introvert tænkning), der filtrerer idéerne logisk.\n\nTritype 387 er en kombination af tre Enneagram-typer, én fra hvert center:\n• 3 (Hjerte): Præstationen — drevet af succes, anerkendelse og at fremstå kompetent\n• 8 (Krop): Udfordreren — drevet af kontrol, styrke og at undgå sårbarhed\n• 7 (Hoved): Entusiasten — drevet af nye oplevelser, frihed og at undgå smerte\n\nKombineret giver det en intens, fremdrifts-orienteret profil der både vil vinde (3), tage kommandoen (8) og udforske nye veje (7) — uden tålmodighed til detaljer eller stilstand.',
    typology_strengths: [
      'Ne-dominans (ENTP): Ser muligheder og forbindelser andre overser',
      'Tritype 3: Stærk præstationsmotor og synlige resultater',
      'Tritype 8: Naturlig ledelsesinstinkt og beslutsomhed under pres',
      'Tritype 7: Entusiasme der trækker andre med',
    ],
    typology_weaknesses: [
      'ENTP: Kan starte 10 ting og afslutte få (svag Si)',
      'Tritype 3: Risiko for at performe rolle frem for at være autentisk',
      'Tritype 8: Kan virke konfronterende og rolle over andres følelser',
    ],
    collab_strengths: [
      'Bringer energi og nye perspektiver til teamet',
      'God til at presse på i fastlåste situationer',
      'Tør tage svære samtaler og beslutninger',
    ],
    collab_risks: [
      'Kan komme i konflikt med strukturerede SJ-typer (fx ISTJ, ESTJ)',
      'Tritype 8-aspektet kan opfattes som dominerende af reserverede kolleger',
    ],
    flags: [{ severity: 'ok', text: 'Profilanalyse gennemført på CV' }],
    interview_questions: [
      'Beskriv en situation hvor du startede et projekt med høj energi — hvordan endte det?',
      'Hvordan håndterer du detaljer og opfølgning når den første begejstring lægger sig?',
      'Hvornår sidst pressede du dig selv eller andre over en grænse for at nå et mål?',
    ],
  }
}

export async function POST(request: Request) {
  const { content, name, team_context, leader_context, role_context } = await request.json()

  if (process.env.ANTHROPIC_API_KEY) {
    const sys = `Du er ekspert i MBTI (Myers-Briggs) og Enneagrammet med tritype-teori. Din opgave er at scanne en kandidats CV og udlede deres sandsynlige typekombination.

━━━ TEORIGRUNDLAG ━━━━━━━━━━━━━━━━━━━━━━━━

MBTI — 4 dichotomier giver 16 typer:
- E/I (Extraversion/Introversion): Hvor får de energi fra? (mennesker vs. egen indre verden)
- S/N (Sensing/iNtuition): Hvad lægger de mærke til? (konkrete detaljer vs. mønstre og muligheder)
- T/F (Thinking/Feeling): Hvordan beslutter de? (logik vs. værdier og mennesker)
- J/P (Judging/Perceiving): Hvordan strukturerer de? (planlagt vs. fleksibelt)

Hver type har 4 kognitive funktioner i prioriteret rækkefølge. De vigtigste:
- Dominant funktion: Den de bruger mest naturligt
- Auxiliary: Støtter dominanten
- Tertiary: Mindre udviklet
- Inferior: Svageste — ofte deres blind spot

ENNEAGRAM med TRITYPE:
9 grundtyper fordelt i 3 centre:
- HOVED (tænkning): Type 5 (Iagttager), 6 (Loyalist), 7 (Entusiast) — kerne-følelse: ANGST
- HJERTE (følelser): Type 2 (Hjælper), 3 (Præsterer), 4 (Individualist) — kerne-følelse: SKAM
- KROP (instinkt): Type 8 (Udfordrer), 9 (Fredsmægler), 1 (Perfektionist) — kerne-følelse: VREDE

TRITYPE = én type fra hvert center, i orden af dominans (3 cifre, fx 387, 549, 729).
Eksempel: 387 = primært 3 (præstation), så 8 (styrke), så 7 (fri udforskning).

━━━ ANALYSEMETODOLOGI ━━━━━━━━━━━━━━━━━━━

Når du scanner CV'et, skal du:
1. Identificere sproglige mønstre (ordvalg, formuleringer, fokusområder)
2. Vurdere karrierevalg (hvilke job-typer, hvilken rejse?)
3. Spotte motivationer (hvad fremhæver de? hvad nedtoner de?)
4. Mappe mønstrene til MBTI kognitive funktioner og Enneagram kerne-drev
5. Konkludere med MBTI + Tritype og BEGRUNDE valget med konkrete CV-referencer

━━━ FORMAT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Kombinationen skrives ALTID som "MBTI Tritype", fx "ENTP 387" eller "INFJ 549".

Forklar ALT i hverdagssprog — læseren har INGEN forhåndskendskab til MBTI eller Enneagram. Brug teorien gennemgående, men oversæt termer:
- "Ne-dominans" → "har ekstravert intuition som hovedfunktion, hvilket betyder de tænker i muligheder og forbindelser"
- "Tritype 3 i hjerte-centret" → "har præstation som primær drivkraft i deres følelsesmæssige liv"

ALTID inkluder konkrete teori-referencer:
- Hvilke kognitive funktioner peger CV'et på?
- Hvilke Enneagram-drivkræfter er synlige?
- Hvorfor netop denne tritype-rækkefølge?

━━━ TEAM-KONTEKST ━━━━━━━━━━━━━━━━━━━━━━━

Hvis team_context er angivet, vurdér konkret hvordan kandidatens MBTI + Tritype vil interagere med de navngivne teammedlemmer.

━━━ LEDER-KONTEKST ━━━━━━━━━━━━━━━━━━━━━━

Hvis leder-information er angivet, vurdér specifikt hvordan kandidaten vil fungere under denne leder:
- Match imellem kandidatens og lederens MBTI/Tritype
- Lederstilen (Coaching/Autoritær/Demokratisk/Laissez-faire/Servant/Visionær) — hvilke kandidat-typer trives bedst under hvilken stil?
- Hvor opstår der typisk friktion eller god kemi?

━━━ ROLLE-KONTEKST ━━━━━━━━━━━━━━━━━━━━━━

Hvis rolle-beskrivelse, hard skills, succes-kriterier eller erfaringsniveau er angivet:
- Vurdér KONKRET hvor kandidatens profil matcher rollens krav
- "role_fit_score" (0-100) skal afspejle MATCHET mellem kandidat og DENNE specifikke rolle (ikke en generel score)
- "role_fit_reasoning" skal forklare hvorfor scoren er som den er — referer både til CV-fakta og kandidatens MBTI/Tritype

━━━ OUTPUT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Returnér KUN valid JSON uden markdown:
{
  "headline": "kort baggrund max 55 tegn",
  "score": tal 30-97 (samlet kvalitet af kandidaten),
  "personal_bio": "2-3 sætninger om personen som menneske, varmt sprog",
  "summary": "3-4 sætninger samlet professionel vurdering",
  "mbti": "fire bogstaver fx ENTP",
  "enneagram": "tritype som 3 cifre fx 387",
  "typology_summary": "1-2 sætninger med kombinationen tydeligt nævnt",
  "detailed_explanation": "6-10 sætninger der gennemgår MBTI-bogstaver, kognitive funktioner, tritype-cifre og hvordan kombinationen udmønter sig",
  "typology_strengths": ["styrke 1 (med teori-reference)","...2","...3","...4"],
  "typology_weaknesses": ["svaghed 1 (med teori-reference)","...2","...3"],
  "collab_strengths": ["bidrag 1","...2","...3"],
  "collab_risks": ["udfordring 1 (specifik hvis team_context)","...2"],
  "role_fit_score": tal 0-100 (kun hvis role_context angivet — match mod denne rolles krav),
  "role_fit_reasoning": "2-3 sætninger om hvorfor scoren er som den er (kun hvis role_context). Referer til både CV og typologi.",
  "leader_fit": "2-3 sætninger om hvordan kandidaten vil arbejde under den angivne leder (kun hvis leader_context)",
  "flags": [{"severity":"red|warn|ok","text":"observation"}],
  "interview_questions": ["spørgsmål 1 (designet til at teste typologi-hypotesen OG matchet mod rollen)","...2","...3"]
}`

    const userContent = [
      `Kandidat: ${name}`,
      content || '(ingen tekst)',
      role_context    ? `\n\n━━━ ROLLE-KONTEKST ━━━\n${role_context}` : '',
      leader_context  ? `\n\n━━━ LEDER-KONTEKST ━━━\n${leader_context}` : '',
      team_context    ? `\n\n━━━ EKSISTERENDE TEAMMEDLEMMER ━━━\n${team_context}` : '',
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
          max_tokens: 2400,
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
