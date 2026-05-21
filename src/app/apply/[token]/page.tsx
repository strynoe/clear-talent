'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'

// ─── Questions ───────────────────────────────────────────
const SECTIONS = [
  {
    title: 'Dit arbejdsliv',
    subtitle: 'Hvordan fungerer du bedst i din hverdag?',
    questions: [
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
    ],
  },
  {
    title: 'Dit samarbejde',
    subtitle: 'Hvordan arbejder du med andre mennesker?',
    questions: [
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
    ],
  },
  {
    title: 'Din personlighed',
    subtitle: 'Hvad driver dig og karakteriserer din tilgang?',
    questions: [
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
    ],
  },
  {
    title: 'Dine værdier',
    subtitle: 'Hvad betyder mest for dig i dit arbejdsliv?',
    questions: [
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
    ],
  },
]

const ALL_QUESTIONS = SECTIONS.flatMap(s => s.questions)
const SCALE = [1, 2, 3, 4, 5]
const SCALE_LABELS = ['Helt uenig', 'Uenig', 'Neutral', 'Enig', 'Helt enig']

type Stage = 'loading' | 'not-found' | 'expired' | 'used' | 'form' | 'submitting' | 'done'

interface InviteInfo { type: 'job' | 'team'; label: string; used: boolean }

export default function ApplyPage() {
  const { token } = useParams<{ token: string }>()
  const [stage, setStage] = useState<Stage>('loading')
  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [name, setName] = useState('')
  const [cvText, setCvText] = useState('')
  const [answers, setAnswers] = useState<number[]>(Array(40).fill(0))
  const [errMsg, setErrMsg] = useState('')
  const [progress, setProgress] = useState(0)
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/invite?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error === 'Expired') { setStage('expired'); return }
        if (d.error) { setStage('not-found'); return }
        if (d.used) { setStage('used'); return }
        setInfo(d)
        setStage('form')
      })
      .catch(() => setStage('not-found'))
  }, [token])

  useEffect(() => {
    const answered = answers.filter(a => a > 0).length
    setProgress(Math.round((answered / 40) * 100))
  }, [answers])

  function setAnswer(idx: number, val: number) {
    setAnswers(prev => { const next = [...prev]; next[idx] = val; return next })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrMsg('')

    if (!name.trim()) { setErrMsg('Udfyld venligst dit fulde navn.'); topRef.current?.scrollIntoView({ behavior: 'smooth' }); return }
    const unanswered = answers.filter(a => a === 0).length
    if (unanswered > 0) { setErrMsg(`${unanswered} spørgsmål er ikke besvaret endnu — rul op for at finde dem.`); return }

    setStage('submitting')
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: name.trim(), cv_text: cvText.trim(), answers }),
      })
      const d = await res.json()
      if (!res.ok) { setErrMsg(d.error ?? 'Noget gik galt. Prøv igen.'); setStage('form'); return }
      setStage('done')
    } catch {
      setErrMsg('Netværksfejl. Tjek din forbindelse og prøv igen.')
      setStage('form')
    }
  }

  // ── Shell styles ──────────────────────────────────────────
  const shell: React.CSSProperties = {
    minHeight: '100vh', background: 'var(--bg)',
    fontFamily: "'DM Sans', sans-serif", color: 'var(--ink)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '0 16px 80px',
  }
  const card: React.CSSProperties = {
    width: '100%', maxWidth: 680, marginTop: 40,
    background: 'var(--s1)', border: '1px solid var(--b1)',
    borderRadius: 16, overflow: 'hidden',
    boxShadow: '0 4px 32px rgba(26,25,22,.07)',
  }

  // ── Loading / error states ────────────────────────────────
  if (stage === 'loading') {
    return (
      <div style={shell}>
        <div style={{ marginTop: 120, color: 'var(--m1)', fontSize: 14 }}>Henter invitation…</div>
      </div>
    )
  }

  if (stage === 'not-found') return <StatusPage icon="🔍" title="Link ikke fundet" sub="Kontrollér at du har det rigtige link, eller kontakt afsenderen." />
  if (stage === 'expired') return <StatusPage icon="⏱" title="Linket er udløbet" sub="Dette invitationslink er ikke længere gyldigt. Kontakt afsenderen for et nyt link." />
  if (stage === 'used') return <StatusPage icon="✓" title="Allerede indsendt" sub="Vi har allerede modtaget din besvarelse via dette link. Kontakt afsenderen hvis du mener det er en fejl." />

  if (stage === 'done') {
    return (
      <div style={shell}>
        <Logo />
        <div style={{ ...card, padding: '48px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>✓</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
            Tak, {name.split(' ')[0]}!
          </div>
          <div style={{ fontSize: 15, color: 'var(--m1)', lineHeight: 1.7, maxWidth: 400, margin: '0 auto' }}>
            Din besvarelse er modtaget og vil blive behandlet af {info?.type === 'job' ? 'rekruttøren' : 'teamlederen'} hurtigst muligt.
          </div>
          <div style={{ marginTop: 32, padding: '16px 20px', background: 'var(--s2)', borderRadius: 10, border: '1px solid var(--b1)', display: 'inline-block' }}>
            <div style={{ fontSize: 11, color: 'var(--m2)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 4 }}>
              {info?.type === 'job' ? 'Stilling' : 'Team'}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{info?.label}</div>
          </div>
        </div>
      </div>
    )
  }

  // ── The form ──────────────────────────────────────────────
  const typeLabel = info?.type === 'job' ? 'ansøge til stillingen' : 'tilslutte dig teamet'

  return (
    <div style={shell}>
      <Logo />

      {/* Header card */}
      <div style={{ ...card, padding: '28px 32px' }} ref={topRef}>
        <div style={{ fontSize: 11, color: 'var(--m2)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 6 }}>
          Du er inviteret til at {typeLabel}
        </div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
          {info?.label}
        </div>
        <div style={{ fontSize: 13, color: 'var(--m1)', fontWeight: 300 }}>
          Udfyld spørgeskemaet herunder — det tager ca. 5 minutter. Alle svar behandles fortroligt.
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--m1)' }}>Spørgeskema</span>
            <span style={{ fontSize: 12, color: 'var(--m1)' }}>{answers.filter(a => a > 0).length} / 40</span>
          </div>
          <div style={{ height: 4, background: 'var(--s3)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width .3s ease' }} />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>

        {/* Name */}
        <div style={card}>
          <div style={{ padding: '24px 32px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--m1)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>
              Dit fulde navn *
            </label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Fornavn Efternavn" required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 9,
                border: '1px solid var(--b1)', background: 'var(--bg)',
                fontSize: 14, color: 'var(--ink)', fontFamily: "'DM Sans', sans-serif",
                fontWeight: 300, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Question sections */}
        {SECTIONS.map((section, si) => {
          const offset = si * 10
          return (
            <div key={si} style={card}>
              <div style={{ padding: '24px 32px 8px' }}>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
                  {section.title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--m1)', fontWeight: 300, marginBottom: 24 }}>
                  {section.subtitle}
                </div>

                {/* Scale legend */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--b1)' }}>
                  <span style={{ fontSize: 10, color: 'var(--m2)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Helt uenig</span>
                  <span style={{ fontSize: 10, color: 'var(--m2)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Helt enig</span>
                </div>

                {section.questions.map((q, qi) => {
                  const idx = offset + qi
                  const val = answers[idx]
                  const isAnswered = val > 0
                  return (
                    <div key={qi} style={{
                      padding: '14px 0',
                      borderBottom: qi < section.questions.length - 1 ? '1px solid var(--b1)' : 'none',
                      opacity: 1,
                    }}>
                      <div style={{ fontSize: 14, color: 'var(--ink)', marginBottom: 10, lineHeight: 1.5, fontWeight: 300 }}>
                        <span style={{ color: 'var(--m2)', fontSize: 11, marginRight: 8 }}>{idx + 1}.</span>
                        {q}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {SCALE.map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setAnswer(idx, n)}
                            title={SCALE_LABELS[n - 1]}
                            style={{
                              flex: 1, height: 36, borderRadius: 7, border: 'none',
                              fontSize: 13, fontWeight: 500, cursor: 'pointer',
                              fontFamily: "'DM Sans', sans-serif",
                              transition: 'all .12s',
                              background: val === n
                                ? 'var(--accent)'
                                : isAnswered
                                  ? 'var(--s2)'
                                  : 'var(--s3)',
                              color: val === n ? '#fff' : val > 0 && n < val ? 'var(--m1)' : 'var(--m1)',
                              transform: val === n ? 'scale(1.08)' : 'scale(1)',
                            }}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ height: 16 }} />
            </div>
          )
        })}

        {/* CV / Background */}
        <div style={card}>
          <div style={{ padding: '24px 32px' }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
              CV / Baggrund
            </div>
            <div style={{ fontSize: 13, color: 'var(--m1)', fontWeight: 300, marginBottom: 16 }}>
              Indsæt dit CV eller en kort beskrivelse af din baggrund (valgfrit, men anbefalet).
            </div>
            <textarea
              value={cvText}
              onChange={e => setCvText(e.target.value)}
              placeholder="Indsæt dit CV, erfaring, uddannelse eller hvad du finder relevant…"
              rows={8}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 9,
                border: '1px solid var(--b1)', background: 'var(--bg)',
                fontSize: 13, color: 'var(--ink)', fontFamily: "'DM Sans', sans-serif",
                fontWeight: 300, outline: 'none', resize: 'vertical',
                lineHeight: 1.6, boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Error */}
        {errMsg && (
          <div style={{
            padding: '12px 16px', background: 'var(--bd-bg)', color: 'var(--bd-text)',
            border: '1px solid #e0b0b0', borderRadius: 10, fontSize: 13,
          }}>
            {errMsg}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={stage === 'submitting'}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 10,
            background: stage === 'submitting' ? 'var(--b2)' : 'var(--ink)',
            color: 'var(--bg)', border: 'none', fontSize: 15, fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            cursor: stage === 'submitting' ? 'not-allowed' : 'pointer',
            transition: 'all .13s', letterSpacing: '.2px',
          }}
        >
          {stage === 'submitting' ? 'Sender og analyserer…' : 'Indsend besvarelse →'}
        </button>

        <div style={{ fontSize: 11, color: 'var(--m2)', textAlign: 'center', lineHeight: 1.6 }}>
          Dine svar behandles fortroligt og bruges kun til rekrutteringsformål.
          <br />Drevet af <strong>TypeSystems</strong> — People Decision Intelligence.
        </div>
      </form>
    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────
function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 32, marginBottom: 8 }}>
      <div style={{
        width: 32, height: 32, background: 'var(--ink)', borderRadius: 9,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
      }}>🐺</div>
      <div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 14, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>TypeSystems</div>
        <div style={{ fontSize: 9, color: 'var(--m2)', textTransform: 'uppercase', letterSpacing: '1px' }}>People Decision Intelligence</div>
      </div>
    </div>
  )
}

function StatusPage({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif",
      padding: '0 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>{icon}</div>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>{title}</div>
      <div style={{ fontSize: 14, color: 'var(--m1)', maxWidth: 360, lineHeight: 1.7, fontWeight: 300 }}>{sub}</div>
    </div>
  )
}
