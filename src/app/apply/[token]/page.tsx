'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'

type Stage = 'loading' | 'not-found' | 'expired' | 'used' | 'form' | 'submitting' | 'done'

interface InviteInfo { type: 'job' | 'team'; label: string; used: boolean }

export default function ApplyPage() {
  const { token } = useParams<{ token: string }>()
  const [stage, setStage] = useState<Stage>('loading')
  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [name, setName] = useState('')
  const [cvText, setCvText] = useState('')
  const [errMsg, setErrMsg] = useState('')
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrMsg('')
    if (!name.trim()) { setErrMsg('Udfyld venligst dit fulde navn.'); topRef.current?.scrollIntoView({ behavior: 'smooth' }); return }

    setStage('submitting')
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: name.trim(), cv_text: cvText.trim() }),
      })
      const d = await res.json()
      if (!res.ok) { setErrMsg(d.error ?? 'Noget gik galt. Prøv igen.'); setStage('form'); return }
      setStage('done')
    } catch {
      setErrMsg('Netværksfejl. Tjek din forbindelse og prøv igen.')
      setStage('form')
    }
  }

  const shell: React.CSSProperties = {
    minHeight: '100vh', background: 'var(--bg)',
    fontFamily: "'DM Sans', sans-serif", color: 'var(--ink)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '0 16px 80px',
  }
  const card: React.CSSProperties = {
    width: '100%', maxWidth: 680, marginTop: 16,
    background: 'var(--s1)', border: '1px solid var(--b1)',
    borderRadius: 16, overflow: 'hidden',
    boxShadow: '0 4px 32px rgba(26,25,22,.07)',
  }

  if (stage === 'loading') {
    return <div style={shell}><div style={{ marginTop: 120, color: 'var(--m1)', fontSize: 14 }}>Henter invitation…</div></div>
  }
  if (stage === 'not-found') return <StatusPage icon="🔍" title="Link ikke fundet" sub="Kontrollér at du har det rigtige link, eller kontakt afsenderen." />
  if (stage === 'expired')   return <StatusPage icon="⏱"  title="Linket er udløbet" sub="Dette invitationslink er ikke længere gyldigt. Kontakt afsenderen for et nyt link." />
  if (stage === 'used')      return <StatusPage icon="✓"  title="Allerede indsendt" sub="Vi har allerede modtaget din besvarelse via dette link. Kontakt afsenderen hvis du mener det er en fejl." />

  if (stage === 'done') {
    return (
      <div style={shell}>
        <Logo />
        <div style={{ ...card, padding: '48px 40px', textAlign: 'center', marginTop: 40 }}>
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

  const typeLabel = info?.type === 'job' ? 'ansøge til stillingen' : 'tilslutte dig teamet'

  return (
    <div style={shell}>
      <Logo />

      {/* Header card */}
      <div style={{ ...card, padding: '28px 32px', marginTop: 40 }} ref={topRef}>
        <div style={{ fontSize: 11, color: 'var(--m2)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 6 }}>
          Du er inviteret til at {typeLabel}
        </div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
          {info?.label}
        </div>
        <div style={{ fontSize: 13, color: 'var(--m1)', fontWeight: 300 }}>
          Udfyld dine oplysninger herunder. Alle svar behandles fortroligt.
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

        {/* CV / Background */}
        <div style={card}>
          <div style={{ padding: '24px 32px' }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
              CV / Baggrund
            </div>
            <div style={{ fontSize: 13, color: 'var(--m1)', fontWeight: 300, marginBottom: 16 }}>
              Indsæt dit CV eller en kort beskrivelse af din baggrund.
            </div>
            <textarea
              value={cvText}
              onChange={e => setCvText(e.target.value)}
              placeholder="Indsæt dit CV, erfaring, uddannelse eller hvad du finder relevant…"
              rows={12}
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

        {errMsg && (
          <div style={{
            padding: '12px 16px', background: 'var(--bd-bg)', color: 'var(--bd-text)',
            border: '1px solid #e0b0b0', borderRadius: 10, fontSize: 13,
          }}>
            {errMsg}
          </div>
        )}

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
