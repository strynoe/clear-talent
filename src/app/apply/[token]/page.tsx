'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'

type Stage = 'loading' | 'not-found' | 'expired' | 'used' | 'form' | 'submitting' | 'done'
type CvTab = 'upload' | 'paste'

interface InviteInfo { type: 'job' | 'team'; label: string; used: boolean }

export default function ApplyPage() {
  const { token } = useParams<{ token: string }>()
  const [stage, setStage] = useState<Stage>('loading')
  const [info, setInfo] = useState<InviteInfo | null>(null)

  // Personal info
  const [name, setName] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')

  // CV
  const [cvTab, setCvTab] = useState<CvTab>('upload')
  const [cvText, setCvText] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [cvPdfBase64, setCvPdfBase64] = useState('')
  const [cvFileText, setCvFileText] = useState('')

  // Application letter
  const [applicationText, setApplicationText] = useState('')

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      setErrMsg('Filen er for stor. Maksimum er 4 MB.')
      return
    }
    setCvFile(file)
    setCvPdfBase64('')
    setCvFileText('')
    setErrMsg('')

    if (file.type === 'application/pdf') {
      const reader = new FileReader()
      reader.onload = ev => {
        const dataUrl = ev.target?.result as string
        setCvPdfBase64(dataUrl.split(',')[1])
      }
      reader.readAsDataURL(file)
    } else {
      const reader = new FileReader()
      reader.onload = ev => setCvFileText(ev.target?.result as string ?? '')
      reader.readAsText(file)
    }
  }

  function removeFile() {
    setCvFile(null)
    setCvPdfBase64('')
    setCvFileText('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrMsg('')
    if (!name.trim()) {
      setErrMsg('Udfyld venligst dit fulde navn.')
      topRef.current?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    setStage('submitting')
    try {
      const body: Record<string, string> = {
        token,
        name: name.trim(),
        linkedin_url: linkedinUrl.trim(),
        application_text: applicationText.trim(),
      }

      if (cvTab === 'upload' && cvFile) {
        if (cvPdfBase64) body.cv_pdf_base64 = cvPdfBase64
        else if (cvFileText) body.cv_text = cvFileText
      } else if (cvTab === 'paste') {
        body.cv_text = cvText.trim()
      }

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (!res.ok) {
        setErrMsg(d.error ?? 'Noget gik galt. Prøv igen.')
        setStage('form')
        return
      }
      setStage('done')
    } catch {
      setErrMsg('Netværksfejl. Tjek din forbindelse og prøv igen.')
      setStage('form')
    }
  }

  const shell: React.CSSProperties = {
    height: '100vh', overflowY: 'auto', background: 'var(--bg)',
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
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 9,
    border: '1px solid var(--b1)', background: 'var(--bg)',
    fontSize: 14, color: 'var(--ink)', fontFamily: "'DM Sans', sans-serif",
    fontWeight: 300, outline: 'none', boxSizing: 'border-box',
  }
  const fieldLabel: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--m1)',
    textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8,
  }
  const textareaStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 9,
    border: '1px solid var(--b1)', background: 'var(--bg)',
    fontSize: 13, color: 'var(--ink)', fontFamily: "'DM Sans', sans-serif",
    fontWeight: 300, outline: 'none', resize: 'vertical',
    lineHeight: 1.6, boxSizing: 'border-box',
  }

  if (stage === 'loading') {
    return <div style={{ ...shell, justifyContent: 'center' }}><div style={{ color: 'var(--m1)', fontSize: 14 }}>Henter invitation…</div></div>
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

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 16, marginTop: 0 }}>

        {/* — Personlige oplysninger — */}
        <div style={card}>
          <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={fieldLabel}>Dit fulde navn *</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Fornavn Efternavn" required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={fieldLabel}>LinkedIn</label>
              <input
                type="text" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/dit-navn"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* — CV — */}
        <div style={card}>
          <div style={{ padding: '24px 32px' }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
              CV
            </div>
            <div style={{ fontSize: 13, color: 'var(--m1)', fontWeight: 300, marginBottom: 16 }}>
              Upload dit CV som PDF, eller indsæt teksten direkte.
            </div>

            {/* Tab toggle */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--s2)', borderRadius: 9, padding: 3, width: 'fit-content', border: '1px solid var(--b1)' }}>
              {(['upload', 'paste'] as CvTab[]).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setCvTab(tab)}
                  style={{
                    padding: '6px 14px', borderRadius: 7, border: 'none', fontSize: 12,
                    fontWeight: 500, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
                    transition: 'all .15s',
                    background: cvTab === tab ? 'var(--s1)' : 'transparent',
                    color: cvTab === tab ? 'var(--ink)' : 'var(--m2)',
                    boxShadow: cvTab === tab ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                  }}
                >
                  {tab === 'upload' ? 'Upload fil' : 'Indsæt tekst'}
                </button>
              ))}
            </div>

            {cvTab === 'upload' && (
              cvFile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--s2)', borderRadius: 9, border: '1px solid var(--b1)' }}>
                  <span style={{ fontSize: 20 }}>📄</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cvFile.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--m2)' }}>{(cvFile.size / 1024).toFixed(0)} KB</div>
                  </div>
                  <button
                    type="button" onClick={removeFile}
                    style={{ padding: '4px 10px', border: '1px solid var(--b1)', borderRadius: 6, background: 'transparent', fontSize: 12, color: 'var(--m1)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Fjern
                  </button>
                </div>
              ) : (
                <label style={{ display: 'block', cursor: 'pointer' }}>
                  <div style={{
                    padding: '28px 16px', border: '1.5px dashed var(--b2)', borderRadius: 10,
                    textAlign: 'center', background: 'var(--bg)',
                  }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📎</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 3 }}>Klik for at vælge fil</div>
                    <div style={{ fontSize: 11, color: 'var(--m2)' }}>PDF eller TXT — maks. 4 MB</div>
                  </div>
                  <input type="file" accept=".pdf,.txt,.rtf" onChange={handleFileChange} style={{ display: 'none' }} />
                </label>
              )
            )}

            {cvTab === 'paste' && (
              <textarea
                value={cvText}
                onChange={e => setCvText(e.target.value)}
                placeholder="Indsæt dit CV, erfaring, uddannelse eller hvad du finder relevant…"
                rows={10}
                style={textareaStyle}
              />
            )}
          </div>
        </div>

        {/* — Ansøgning / Motivation — */}
        <div style={card}>
          <div style={{ padding: '24px 32px' }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
              {info?.type === 'job' ? 'Ansøgning' : 'Motivation'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--m1)', fontWeight: 300, marginBottom: 16 }}>
              {info?.type === 'job'
                ? 'Fortæl os hvorfor du søger stillingen, og hvad du bringer med dig.'
                : 'Fortæl os om dig selv og hvorfor du gerne vil med på dette team.'}
            </div>
            <textarea
              value={applicationText}
              onChange={e => setApplicationText(e.target.value)}
              placeholder={info?.type === 'job' ? 'Dit motivationsbrev eller din ansøgning…' : 'Kort introduktion til dig selv…'}
              rows={8}
              style={textareaStyle}
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
      height: '100vh', overflowY: 'auto', background: 'var(--bg)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif",
      padding: '0 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>{icon}</div>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>{title}</div>
      <div style={{ fontSize: 14, color: 'var(--m1)', maxWidth: 360, lineHeight: 1.7, fontWeight: 300 }}>{sub}</div>
    </div>
  )
}
