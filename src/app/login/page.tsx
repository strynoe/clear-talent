'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const supabase = createClient()

  function switchMode(next: 'login' | 'signup') {
    setMode(next)
    setError('')
    setSuccess('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setError('E-mail ikke bekræftet. Tjek din indbakke og klik bekræftelseslinket.')
        } else {
          setError('Forkert e-mail eller adgangskode.')
        }
        setLoading(false)
        return
      }
      router.push('/')
      router.refresh()
    } else {
      // Krav: invite code
      if (!inviteCode.trim()) {
        setError('Indtast en organisationskode for at oprette konto.')
        setLoading(false)
        return
      }
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message.includes('already registered')
          ? 'Der findes allerede en konto med denne e-mail.'
          : 'Kunne ikke oprette konto. Prøv igen.')
        setLoading(false)
        return
      }
      // Forsøg at tilmelde til organisationen
      const token = data.session?.access_token
      if (token) {
        const joinRes = await fetch('/api/join-org', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ invite_code: inviteCode.trim() }),
        })
        const joinData = await joinRes.json()
        if (!joinRes.ok) {
          setError(joinData.error ?? 'Ugyldig organisationskode')
          setLoading(false)
          return
        }
        if (joinData.status === 'pending') {
          setSuccess('Konto oprettet! Du venter på godkendelse fra organisationens ejer.')
        } else {
          setSuccess('Konto oprettet! Du er nu ejer af organisationen.')
        }
        setTimeout(() => { router.push('/'); router.refresh() }, 1500)
      } else {
        setSuccess('Konto oprettet! Bekræft din e-mail og log derefter ind med koden.')
      }
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '10px 13px', borderRadius: 9, border: '1px solid var(--b1)',
    background: 'var(--bg)', fontSize: 13, color: 'var(--ink)',
    fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
    outline: 'none', transition: 'border-color .12s', width: '100%',
  }

  return (
    <div style={{
      width: '100vw', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'var(--s1)', border: '1px solid var(--b1)',
        borderRadius: 16, padding: '40px 36px', boxShadow: '0 4px 32px rgba(26,25,22,.07)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{
            width: 36, height: 36, background: 'var(--ink)', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
          }}>🐺</div>
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>
              TypeSystems
            </div>
            <div style={{ fontSize: 10, color: 'var(--m1)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 1 }}>
              People Decision Intelligence
            </div>
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{
          display: 'flex', background: 'var(--s2)', borderRadius: 10,
          padding: 3, marginBottom: 28, border: '1px solid var(--b1)',
        }}>
          {(['login', 'signup'] as const).map(m => (
            <button key={m} onClick={() => switchMode(m)} type="button" style={{
              flex: 1, padding: '7px 0', borderRadius: 8, border: 'none',
              fontSize: 12, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
              cursor: 'pointer', transition: 'all .13s',
              background: mode === m ? 'var(--s1)' : 'transparent',
              color: mode === m ? 'var(--ink)' : 'var(--m1)',
              boxShadow: mode === m ? '0 1px 4px rgba(26,25,22,.08)' : 'none',
            }}>
              {m === 'login' ? 'Log ind' : 'Opret konto'}
            </button>
          ))}
        </div>

        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
          {mode === 'login' ? 'Velkommen tilbage' : 'Opret konto'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--m1)', marginBottom: 24, fontWeight: 300 }}>
          {mode === 'login' ? 'Fortsæt til din rekrutteringsplatform' : 'Kom i gang med Clear Talent'}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--m1)', textTransform: 'uppercase', letterSpacing: '.8px' }}>
              E-mail
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="din@virksomhed.dk" required style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--b1)')}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--m1)', textTransform: 'uppercase', letterSpacing: '.8px' }}>
              Adgangskode
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required minLength={6} style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--b1)')}
            />
            {mode === 'signup' && (
              <span style={{ fontSize: 11, color: 'var(--m2)' }}>Minimum 6 tegn</span>
            )}
          </div>

          {mode === 'signup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--m1)', textTransform: 'uppercase', letterSpacing: '.8px' }}>
                Organisationskode
              </label>
              <input
                type="text" value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX" required
                style={{ ...inputStyle, letterSpacing: '2px', fontFamily: 'monospace' }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--b1)')}
              />
              <span style={{ fontSize: 11, color: 'var(--m2)' }}>Få koden fra din organisations ejer</span>
            </div>
          )}

          {error && (
            <div style={{
              padding: '9px 12px', borderRadius: 8,
              background: 'var(--bd-bg)', color: 'var(--bd-text)',
              border: '1px solid #e0b0b0', fontSize: 12,
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              padding: '9px 12px', borderRadius: 8,
              background: 'var(--ok-bg)', color: 'var(--ok-text)',
              border: '1px solid #b0d8b8', fontSize: 12,
            }}>
              {success}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              marginTop: 4, padding: '11px 0', borderRadius: 9,
              background: loading ? 'var(--b2)' : 'var(--ink)',
              color: 'var(--bg)', border: 'none', fontSize: 13, fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif", cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background .13s', letterSpacing: '.2px',
            }}
          >
            {loading ? (mode === 'login' ? 'Logger ind…' : 'Opretter konto…') : (mode === 'login' ? 'Log ind' : 'Opret konto')}
          </button>
        </form>
      </div>
    </div>
  )
}
