'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────
interface Bar { l: string; v: number }
interface Flag { severity: 'red' | 'warn' | 'ok'; text: string }
interface Candidate {
  id: number; name: string; score: number; wolf: string; wolfSec: string
  grad: string; bars: Bar[]; verdict: string; headline: string; summary: string
  wolf_reasoning: string; flags: Flag[]; interview_questions: string[]
  strengths: string[]; risks: string[]; jobId: number
  _loading?: boolean; _error?: string
}
interface Job {
  id: number; title: string; dept: string; type: string
  wolf1: string; wolf2: string; status: 'active' | 'paused'; candidates: Candidate[]
}
interface QueueItem { id: number; type: 'file' | 'linkedin' | 'text'; name: string; file?: File; content?: string }
type Page = 'jobs' | 'job-detail' | 'cv' | 'cand-profile'

// ─── Constants ───────────────────────────────────────────
const WOLVES: Record<string, { label: string }> = {
  architect: { label: 'Architect' }, hunter:    { label: 'Hunter' },
  builder:   { label: 'Builder' },   guardian:  { label: 'Guardian' },
  protector: { label: 'Protector' }, connector: { label: 'Connector' },
  challenger:{ label: 'Challenger'},  explorer:  { label: 'Explorer' },
}
const WOLF_COLORS: Record<string, string> = {
  Explorer: '#2a7a5a', Hunter: '#a03030', Architect: '#4a6aaa', Builder: '#3a7a8a',
  Connector: '#8a3a7a', Challenger: '#6a3a9a', Guardian: '#5a7a30', Protector: '#9a6020',
}
const GRADS = [
  'linear-gradient(135deg,#3a8a5a,#5aaa7a)', 'linear-gradient(135deg,#5a3a8a,#8a5aaa)',
  'linear-gradient(135deg,#8a3a6a,#aa5a8a)', 'linear-gradient(135deg,#3a5a8a,#5a7aaa)',
  'linear-gradient(135deg,#6a3a3a,#8a5a5a)', 'linear-gradient(135deg,#3a6a8a,#5a8aaa)',
  'linear-gradient(135deg,#6a5a3a,#8a7a5a)', 'linear-gradient(135deg,#5a6a3a,#7a8a5a)',
]

// ─── Helpers ─────────────────────────────────────────────
const scoreClass  = (s: number) => s >= 80 ? 's-ok' : s >= 60 ? 's-warn' : 's-bad'
const verdictFromScore = (s: number) => s >= 80 ? 'Anbefalet' : s >= 60 ? 'Forsigtighed' : 'Frarådet'
const vbarCls     = (v: string) => v === 'Anbefalet' ? 'vbar-ok' : v === 'Forsigtighed' ? 'vbar-warn' : 'vbar-bad'
const vtxtCls     = (v: string) => v === 'Anbefalet' ? 'vtxt-ok' : v === 'Forsigtighed' ? 'vtxt-warn' : 'vtxt-bad'
const barCls      = (v: number) => v >= 75 ? 'bf-g' : v >= 55 ? 'bf-b' : v >= 38 ? 'bf-w' : 'bf-d'
const valCls      = (v: number) => v < 38 ? 'v-bad' : v < 55 ? 'v-warn' : ''
const wColor      = (name: string) => WOLF_COLORS[name] ?? '#7a7570'
const rnd         = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const shuffle     = <T,>(a: T[]) => [...a].sort(() => Math.random() - .5)
const initials    = (name: string) => name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase()
const nameFromUrl = (url: string) => {
  const m = url.match(/linkedin\.com\/in\/([^/?]+)/)
  return m ? m[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'LinkedIn Kandidat'
}
function readFileText(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = e => res(e.target!.result as string)
    r.onerror = () => rej(new Error('Kunne ikke læse filen'))
    r.readAsText(file)
  })
}

// ─── Initial data ────────────────────────────────────────
const ALL_METRICS = ['Initiativ','Kommunikation','Samarbejde','Struktur','Analytisk tænkning','Fremdrift','Empati','Tilpasningsevne','Beslutningsevne','Stresshåndtering']

function makeFakeCandidate(
  overrides: Partial<Candidate> & { name: string; score: number; wolf: string; wolfSec: string; headline: string },
  grad: string, jobId: number, id: number
): Candidate {
  const bars = shuffle(ALL_METRICS).slice(0, 3).map(l => ({ l, v: rnd(30, 97) }))
  return {
    id, jobId, grad, bars,
    verdict: verdictFromScore(overrides.score),
    summary: '', wolf_reasoning: '', flags: [], interview_questions: [], strengths: [], risks: [],
    ...overrides,
  }
}

const initialJobs: Job[] = []

// ─── Small components ────────────────────────────────────
function WolfDots({ wolf, wolfSec }: { wolf: string; wolfSec?: string }) {
  return (
    <>
      <div className="wolf-dot" style={{ background: wColor(wolf) }} />
      <span className="wolf-name">{wolf}</span>
      {wolfSec && (<><span className="wolf-sep">·</span><div className="wolf-dot" style={{ background: wColor(wolfSec) }} /><span className="wolf-name" style={{ opacity: .7 }}>{wolfSec}</span></>)}
    </>
  )
}

function BarRow({ bar, prefix }: { bar: Bar; prefix: 'cc' | 'cp' }) {
  const cls = prefix === 'cc' ? { row:'cc-bar-row', meta:'cc-bar-meta', lbl:'cc-bar-label', val:'cc-bar-val', track:'bar-track', fill:'bar-fill' }
                              : { row:'cp-bar-row', meta:'cp-bar-meta', lbl:'cp-bar-label', val:'cp-bar-val', track:'cp-bar-track', fill:'cp-bar-fill' }
  return (
    <div className={cls.row}>
      <div className={cls.meta}>
        <span className={cls.lbl}>{bar.l}</span>
        <span className={`${cls.val} ${valCls(bar.v)}`}>{bar.v}%</span>
      </div>
      <div className={cls.track}>
        <div className={`${cls.fill} ${barCls(bar.v)}`} style={{ '--w': `${bar.v}%` } as React.CSSProperties} />
      </div>
    </div>
  )
}

function CandCard({ c, onClick }: { c: Candidate; onClick: () => void }) {
  if (c._loading) {
    return (
      <div className="cand-card" style={{ pointerEvents: 'none' }}>
        {/* Header: avatar + navn */}
        <div className="cc-header">
          <div className="cc-avatar" style={{ background: 'var(--s3)' }} />
          <div className="cc-nameblock" style={{ flex: 1, gap: 6, display: 'flex', flexDirection: 'column' }}>
            <div className="skel" style={{ width: '60%', height: 12 }} />
            <div className="skel" style={{ width: '80%', height: 9 }} />
          </div>
        </div>
        {/* Bars */}
        <div className="cc-bars" style={{ gap: 10 }}>
          {[72, 55, 85].map((w, i) => (
            <div key={i} className="cc-bar-row">
              <div className="cc-bar-meta">
                <div className="skel" style={{ width: `${w}%`, height: 9 }} />
              </div>
              <div className="bar-track">
                <div className="skel" style={{ width: '100%', height: '100%', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div className="cc-footer">
          <div className="skel" style={{ width: 90, height: 10 }} />
          <div className="skel" style={{ width: 70, height: 10 }} />
        </div>
      </div>
    )
  }
  if (c._error) {
    return <div className="err-row">Fejl ved analyse af {c.name}: {c._error}</div>
  }
  return (
    <div className="cand-card" onClick={onClick}>
      <div className="cc-header">
        <div className="cc-avatar" style={{ background: c.grad }}>{initials(c.name)}</div>
        <div className="cc-nameblock">
          <div className="cc-nameline">
            <div className="cc-name">{c.name}</div>
            <div className={`cc-score ${scoreClass(c.score)}`}>{c.score}</div>
          </div>
          <div className="cc-role">{c.headline}</div>
        </div>
      </div>
      <div className="cc-bars">
        {c.bars.map((b, i) => <BarRow key={i} bar={b} prefix="cc" />)}
      </div>
      <div className="cc-footer">
        <div className="wolf-inline"><WolfDots wolf={c.wolf} wolfSec={c.wolfSec} /></div>
        <div className="verdict-pill">
          <div className={`vbar ${vbarCls(c.verdict)}`} />
          <span className={vtxtCls(c.verdict)}>{c.verdict}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main app ────────────────────────────────────────────
// ── DB helpers ───────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCandidate(c: any, jobId: number): Candidate {
  return {
    id: c.id, name: c.name, score: c.score,
    wolf: c.wolf, wolfSec: c.wolf_sec, grad: c.grad,
    bars: c.bars ?? [], verdict: c.verdict,
    headline: c.headline, summary: c.summary,
    wolf_reasoning: c.wolf_reasoning,
    flags: c.flags ?? [], strengths: c.strengths ?? [],
    risks: c.risks ?? [], interview_questions: c.interview_questions ?? [],
    jobId,
  }
}

export default function App() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const [page, setPage] = useState<Page>('jobs')
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [currentJobId, setCurrentJobId] = useState<number | null>(null)
  const [currentCandId, setCurrentCandId] = useState<number | null>(null)

  // Modals
  const [modalJobOpen, setModalJobOpen] = useState(false)
  const [modalCandOpen, setModalCandOpen] = useState(false)

  // Job form
  const [jobTitle, setJobTitle] = useState('')
  const [jobDept, setJobDept] = useState('')
  const [jobType, setJobType] = useState('Fuldtid')
  const [jobWolf1, setJobWolf1] = useState('')
  const [jobWolf2, setJobWolf2] = useState('')
  const [jobTitleErr, setJobTitleErr] = useState(false)

  // Candidate modal form
  const [mcName, setMcName] = useState('')
  const [mcText, setMcText] = useState('')
  const [mcLinkedin, setMcLinkedin] = useState('')
  const [mcFile, setMcFile] = useState<File | null>(null)
  const [mcDrag, setMcDrag] = useState(false)
  const [mcSubmitting, setMcSubmitting] = useState(false)

  // CV analysis page
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [cvText, setCvText] = useState('')
  const [linkedinVal, setLinkedinVal] = useState('')
  const [nameVal, setNameVal] = useState('')
  const [cvResults, setCvResults] = useState<Array<{ id: number; loading?: boolean; error?: string; name: string; score: number; wolf: string; wolfSec: string; grad: string; headline: string; flags: Flag[] }>>([])
  const [cvDrag, setCvDrag] = useState(false)
  const analysisCount = useRef(0)

  // ── Load jobs from Supabase on mount ──
  const loadJobs = useCallback(async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, candidates(*)')
      .order('created_at', { ascending: false })
    if (error) { console.error('[loadJobs]', error); return }
    if (data) {
      setJobs(data.map(j => ({
        id: j.id, title: j.title, dept: j.dept, type: j.type,
        wolf1: j.wolf1, wolf2: j.wolf2, status: j.status,
        candidates: (j.candidates ?? []).map((c: Parameters<typeof mapCandidate>[0]) => mapCandidate(c, j.id)),
      })))
    }
  }, [supabase])

  useEffect(() => { loadJobs() }, [loadJobs])

  // Esc closes modals
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setModalJobOpen(false); setModalCandOpen(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Upload to Supabase (fire & forget) ──
  function uploadToSupabase(file: File, candidateName?: string, jobId?: number | null) {
    const fd = new FormData()
    fd.append('file', file)
    if (candidateName) fd.append('candidateName', candidateName)
    if (jobId != null) {
      const job = jobs.find(j => j.id === jobId)
      fd.append('jobId', String(jobId))
      if (job) fd.append('jobTitle', job.title)
    }
    fetch('/api/upload', { method: 'POST', body: fd })
      .then(r => r.json()).then(d => console.log('[upload response]', d))
      .catch(console.error)
  }

  // ── AI analyze ──
  async function callAnalyze(content: string, name: string) {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, name }),
    })
    if (!res.ok) throw new Error('Analyse fejlede')
    return res.json()
  }

  async function analyzeAndAddToJob(content: string, name: string, jobId: number) {
    const tempId = -(Date.now() + Math.random())
    const grad = GRADS[analysisCount.current++ % GRADS.length]
    setJobs(prev => prev.map(j => j.id !== jobId ? j : {
      ...j, candidates: [...j.candidates, { id: tempId, name, _loading: true } as Candidate],
    }))
    try {
      const res = await callAnalyze(content, name)
      const wLabel = WOLVES[(res.wolf_primary ?? 'explorer').toLowerCase()]?.label ?? 'Explorer'
      const wSecLabel = WOLVES[(res.wolf_secondary ?? '').toLowerCase()]?.label ?? ''
      const score = res.score ?? rnd(50, 90)
      const bars = shuffle(ALL_METRICS).slice(0, 3).map((l: string) => ({ l, v: rnd(30, 97) }))
      const verdict = verdictFromScore(score)

      const { data: saved, error: dbErr } = await supabase.from('candidates').insert({
        job_id: jobId, name, score, grad, bars,
        wolf: wLabel, wolf_sec: wSecLabel, verdict,
        headline: res.headline ?? '',
        summary: res.summary ?? '',
        wolf_reasoning: res.wolf_reasoning ?? '',
        flags: res.flags ?? [],
        interview_questions: res.interview_questions ?? [],
        strengths: res.strengths ?? [],
        risks: res.risks ?? [],
      }).select().single()

      if (dbErr) console.error('[analyzeAndAddToJob]', dbErr)

      const cand: Candidate = saved
        ? mapCandidate(saved, jobId)
        : { id: Date.now() + Math.random(), name, score, grad, bars, wolf: wLabel, wolfSec: wSecLabel, verdict, headline: res.headline ?? '', summary: res.summary ?? '', wolf_reasoning: res.wolf_reasoning ?? '', flags: res.flags ?? [], interview_questions: res.interview_questions ?? [], strengths: res.strengths ?? [], risks: res.risks ?? [], jobId }

      setJobs(prev => prev.map(j => j.id !== jobId ? j : {
        ...j, candidates: j.candidates.map(c => c.id === tempId ? cand : c),
      }))
    } catch (err) {
      setJobs(prev => prev.map(j => j.id !== jobId ? j : {
        ...j, candidates: j.candidates.map(c =>
          c.id === tempId ? { ...c, _loading: false, _error: err instanceof Error ? err.message : 'Ukendt fejl' } : c
        ),
      }))
    }
  }

  // ── Navigation ──
  const currentJob = jobs.find(j => j.id === currentJobId) ?? null
  const currentCand = currentJob?.candidates.find(c => c.id === currentCandId) ?? null

  function showJobs() { setPage('jobs'); setCurrentJobId(null); setCurrentCandId(null) }
  function openJob(id: number) { setCurrentJobId(id); setPage('job-detail'); setCurrentCandId(null) }
  function openCandidateProfile(candId: number) { setCurrentCandId(candId); setPage('cand-profile') }
  function goBack() {
    if (page === 'cand-profile' && currentCandId && currentJobId) { openJob(currentJobId); return }
    showJobs()
  }
  function navCv() { setPage('cv'); setCurrentJobId(null); setCurrentCandId(null) }

  // ── Job modal ──
  async function createJob() {
    if (!jobTitle.trim()) { setJobTitleErr(true); return }
    const { data, error } = await supabase.from('jobs').insert({
      title: jobTitle.trim(), dept: jobDept.trim() || 'Generel',
      type: jobType, wolf1: jobWolf1 || 'Explorer', wolf2: jobWolf2, status: 'active',
    }).select().single()
    if (error) { console.error('[createJob]', error.code, error.message, error.details, error.hint); return }
    const j: Job = { ...data, candidates: [] }
    setJobs(prev => [j, ...prev])
    setModalJobOpen(false)
    setJobTitle(''); setJobDept(''); setJobType('Fuldtid'); setJobWolf1(''); setJobWolf2(''); setJobTitleErr(false)
    openJob(j.id)
  }

  // ── Candidate modal ──
  function openCandModal() { setMcName(''); setMcText(''); setMcLinkedin(''); setMcFile(null); setModalCandOpen(true) }

  async function submitCandModal() {
    if (!mcText && !mcFile && !mcLinkedin) { alert('Tilføj et CV, tekst eller LinkedIn URL.'); return }
    setMcSubmitting(true)
    let content = '', candidateName = mcName.trim() || 'Kandidat'
    if (mcFile) {
      uploadToSupabase(mcFile, candidateName, currentJobId)
      try { content = await readFileText(mcFile) } catch { content = '' }
    } else if (mcText) {
      content = mcText
    } else if (mcLinkedin) {
      content = 'LinkedIn: ' + mcLinkedin
      if (!mcName.trim()) candidateName = nameFromUrl(mcLinkedin)
    }
    setModalCandOpen(false)
    setMcSubmitting(false)
    await analyzeAndAddToJob(content, candidateName, currentJobId!)
  }

  // ── CV page queue ──
  function addToQueue(item: Omit<QueueItem, 'id'>) {
    setQueue(prev => [...prev, { ...item, id: Date.now() + Math.random() }])
  }
  function removeFromQueue(id: number) { setQueue(prev => prev.filter(x => x.id !== id)) }

  const cvHasInput = queue.length > 0 || cvText.length > 50 || linkedinVal.length > 10

  async function runAnalysis() {
    const items = [...queue]
    if (cvText.length > 50) items.push({ type: 'text', content: cvText, name: nameVal || 'Kandidat', id: Date.now() })
    if (linkedinVal && items.every(x => x.type !== 'linkedin')) items.push({ type: 'linkedin', name: linkedinVal, id: Date.now() + 1 })
    if (!items.length) return
    setQueue([]); setCvText(''); setLinkedinVal(''); setNameVal('')
    for (const it of items) await analyzeForCvPage(it)
  }

  async function analyzeForCvPage(item: QueueItem) {
    const tempId = Date.now() + Math.random()
    const grad = GRADS[analysisCount.current++ % GRADS.length]
    setCvResults(prev => [...prev, { id: tempId, loading: true, name: item.name, score: 0, wolf: '', wolfSec: '', grad, headline: '', flags: [] }])
    try {
      let content = ''
      if (item.type === 'file' && item.file) {
        uploadToSupabase(item.file, item.name)
        content = await readFileText(item.file)
      } else if (item.type === 'text') {
        content = item.content ?? ''
      } else {
        content = 'LinkedIn: ' + item.name
      }
      const name = item.type === 'linkedin' ? nameFromUrl(item.name) : item.name
      const res = await callAnalyze(content, name)
      const wLabel = WOLVES[(res.wolf_primary ?? 'explorer').toLowerCase()]?.label ?? 'Explorer'
      const wSecLabel = WOLVES[(res.wolf_secondary ?? '').toLowerCase()]?.label ?? ''
      setCvResults(prev => prev.map(r => r.id !== tempId ? r : {
        id: tempId, name, score: res.score ?? 0, wolf: wLabel, wolfSec: wSecLabel,
        grad, headline: res.headline ?? '', flags: (res.flags ?? []).slice(0, 2),
      }))
    } catch (err) {
      setCvResults(prev => prev.map(r => r.id !== tempId ? r : { ...r, loading: false, error: err instanceof Error ? err.message : 'Fejl' }))
    }
  }

  // ── Topbar content ──
  let backHidden = true, breadcrumb: React.ReactNode, topbarActions: React.ReactNode

  if (page === 'jobs') {
    breadcrumb = <span className="tb-crumb active">Åbne stillinger</span>
    topbarActions = <button className="tb-btn tb-btn-primary" onClick={() => setModalJobOpen(true)}>+ Opret stilling</button>
  } else if (page === 'job-detail' && currentJob) {
    backHidden = false
    breadcrumb = (<><span className="tb-crumb" onClick={showJobs}>Åbne stillinger</span><span className="tb-crumb-sep">/</span><span className="tb-crumb active">{currentJob.title}</span></>)
    topbarActions = (<><button className="tb-btn tb-btn-ghost" onClick={navCv}>CV Analyse</button><button className="tb-btn tb-btn-primary" onClick={openCandModal}>+ Tilføj kandidat</button></>)
  } else if (page === 'cv') {
    breadcrumb = <span className="tb-crumb active">CV Analyse</span>
    topbarActions = <div className="ai-pill">AI AKTIV</div>
  } else if (page === 'cand-profile' && currentCand && currentJob) {
    backHidden = false
    breadcrumb = (<><span className="tb-crumb" onClick={showJobs}>Åbne stillinger</span><span className="tb-crumb-sep">/</span><span className="tb-crumb" onClick={() => openJob(currentJobId!)}>{currentJob.title}</span><span className="tb-crumb-sep">/</span><span className="tb-crumb active">{currentCand.name}</span></>)
    topbarActions = <button className="tb-btn tb-btn-ghost" onClick={() => openJob(currentJobId!)}>← Tilbage til stilling</button>
  }

  // ── Candidate profile helpers ──
  function renderCandProfile(c: Candidate, j: Job) {
    const existingLabels = c.bars.map(b => b.l)
    const extra = ALL_METRICS.filter(m => !existingLabels.includes(m))
    const fullBars = [...c.bars, ...shuffle(extra).slice(0, 3).map(l => ({ l, v: rnd(35, 90) }))].slice(0, 6)
    const sClass = scoreClass(c.score)
    const vTag = c.verdict === 'Anbefalet' ? 'ok' : c.verdict === 'Forsigtighed' ? 'warn' : 'bad'
    const flags = c.flags?.length ? c.flags : [{ severity: 'ok' as const, text: 'Profil analyseret uden kritiske fund' }]
    const strengths = c.strengths?.length ? c.strengths : ['Ikke specificeret']
    const risks = c.risks?.length ? c.risks : ['Ikke specificeret']
    const questions = c.interview_questions?.length ? c.interview_questions : ['Beskriv din arbejdsstil i et nyt team.']

    return (
      <div className="cp-scroll">
        <div className="cp-hero">
          <div className="cp-avatar" style={{ background: c.grad }}>{initials(c.name)}</div>
          <div className="cp-identity">
            <div className="cp-name">{c.name}</div>
            <div className="cp-headline">{c.headline || j.title}</div>
            <div className="cp-wolf-row"><WolfDots wolf={c.wolf} wolfSec={c.wolfSec} /></div>
          </div>
          <div className="cp-verdict-block">
            <div className={`cp-score-big ${sClass}`}>{c.score}</div>
            <div className="cp-score-label">Match score</div>
            <div className={`cp-verdict-tag ${vTag}`}>{c.verdict}</div>
          </div>
        </div>

        <div className="cp-grid">
          <div className="cp-col">
            <div className="cp-section">
              <div className="cp-section-title">Adfærdsprofil</div>
              {fullBars.map((b, i) => <BarRow key={i} bar={b} prefix="cp" />)}
            </div>
            <div className="cp-section">
              <div className="cp-section-title">Work style — {c.wolf}</div>
              <p className="cp-wolf-reasoning">{c.wolf_reasoning || `Kandidatens work style er vurderet til ${c.wolf} baseret på erfaring og beslutningsstil.`}</p>
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <WolfDots wolf={c.wolf} wolfSec={c.wolfSec} />
              </div>
            </div>
            <div className="cp-section">
              <div className="cp-section-title">Styrker</div>
              <div className="cp-tags">{strengths.map((s, i) => <span key={i} className="cp-tag strength">{s}</span>)}</div>
              <div className="cp-section-title" style={{ marginTop: 14 }}>Risici</div>
              <div className="cp-tags">{risks.map((r, i) => <span key={i} className="cp-tag risk">{r}</span>)}</div>
            </div>
          </div>
          <div className="cp-col">
            <div className="cp-section">
              <div className="cp-section-title">Samlet vurdering</div>
              <p className="cp-summary">{c.summary || 'Kandidaten er vurderet på baggrund af det tilgængelige materiale.'}</p>
            </div>
            <div className="cp-section">
              <div className="cp-section-title">Opmærksomhedspunkter</div>
              {flags.map((f, i) => {
                const cls = f.severity === 'red' ? 'red' : f.severity === 'ok' ? 'ok' : 'warn'
                const icon = cls === 'red' ? '🚩' : cls === 'ok' ? '✦' : '⚠'
                return <div key={i} className={`cp-flag ${cls}`}><span className="cp-flag-icon">{icon}</span><span>{f.text}</span></div>
              })}
            </div>
            <div className="cp-section">
              <div className="cp-section-title">Foreslåede interviewspørgsmål</div>
              {questions.map((q, i) => <div key={i} className="cp-question">{q}</div>)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════
  return (
    <>
      {/* ── SIDEBAR ── */}
      <nav className="sidebar">
        <div className="sb-logo">
          <div className="sb-icon">🐺</div>
          <div><div className="sb-name">Clear Talent</div><div className="sb-sub">People Decision Intelligence</div></div>
        </div>
        <div className="sb-nav">
          <div className="sb-sec">Rekruttering</div>
          <div className={`sb-item${page === 'jobs' || page === 'job-detail' || (page === 'cand-profile' && currentJobId) ? (page === 'jobs' ? ' active' : '') : ''}`} onClick={showJobs}>
            <span className="sb-pip" /><span className="sb-ico">◇</span>Åbne stillinger
          </div>
          {/* Sidebar job list */}
          <div>
            {jobs.map(j => (
              <div key={j.id} className={`sb-job${currentJobId === j.id && (page === 'job-detail' || page === 'cand-profile') ? ' active' : ''}`} onClick={() => openJob(j.id)}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{j.title}</span>
                <span className="sb-job-count">{j.candidates.filter(c => !c._loading && !c._error).length}</span>
              </div>
            ))}
          </div>
          <div className={`sb-item${page === 'cv' ? ' active' : ''}`} onClick={navCv}>
            <span className="sb-pip" /><span className="sb-ico">📄</span>CV Analyse<span className="sb-tag">AI</span>
          </div>
          <div className="sb-sec">Organisation</div>
          <div className="sb-item dim"><span className="sb-pip" /><span className="sb-ico">⬡</span>Teams<span className="sb-tag">Snart</span></div>
          <div className="sb-item dim"><span className="sb-pip" /><span className="sb-ico">🐺</span>De 8 Wolves<span className="sb-tag">Snart</span></div>
        </div>
        <div className="sb-bottom">
          <div className="sb-company">
            <div className="sb-ca">NX</div>
            <div><div className="sb-cn">Nexum A/S</div><div className="sb-cp">Pro licens</div></div>
          </div>
          <button onClick={handleLogout} style={{
            marginTop: 8, width: '100%', padding: '8px 0', borderRadius: 8,
            background: 'transparent', border: '1px solid var(--b1)',
            fontSize: 12, color: 'var(--m1)', fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500, cursor: 'pointer', transition: 'all .12s',
          }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--ink)'; (e.target as HTMLElement).style.borderColor = 'var(--b2)' }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--m1)'; (e.target as HTMLElement).style.borderColor = 'var(--b1)' }}
          >
            Log ud
          </button>
        </div>
      </nav>

      {/* ── MAIN ── */}
      <div className="main">
        {/* TOPBAR */}
        <div className="topbar">
          <div className="tb-left">
            <div className={`tb-back${backHidden ? ' hidden' : ''}`} onClick={goBack}>←</div>
            <div className="tb-breadcrumb">{breadcrumb}</div>
          </div>
          <div className="tb-right">
            <div className="ai-pill">AI AKTIV</div>
            {topbarActions}
          </div>
        </div>

        {/* PAGE: ÅBNE STILLINGER */}
        <div className={`page${page === 'jobs' ? ' active' : ''}`} id="page-jobs">
          <div className="jobs-wrap">
            <div className="jobs-grid">
              {jobs.map(j => (
                <div key={j.id} className="job-card" onClick={() => openJob(j.id)}>
                  <div className="jc-header">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div className="jc-title">{j.title}</div>
                      <span className={`status-badge ${j.status === 'active' ? 'sb-active' : 'sb-paused'}`}>{j.status === 'active' ? 'Aktiv' : 'Pause'}</span>
                    </div>
                    <div className="jc-dept">{j.dept}</div>
                  </div>
                  <div className="jc-body">
                    <div className="jc-meta-row">
                      <div className="jc-meta"><div className="jc-meta-label">Ansættelse</div><div className="jc-meta-val">{j.type}</div></div>
                      <div className="jc-meta"><div className="jc-meta-label">Kandidater</div><div className="jc-meta-val">{j.candidates.length}</div></div>
                    </div>
                    <div className="jc-wolf-row"><WolfDots wolf={j.wolf1} wolfSec={j.wolf2} /></div>
                  </div>
                  <div className="jc-footer">
                    <span className="jc-cand-count"><span>{j.candidates.length}</span> kandidat{j.candidates.length === 1 ? '' : 'er'}</span>
                    <span className="jc-open-btn">Åbn stilling →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PAGE: STILLING DETALJE */}
        <div className={`page${page === 'job-detail' ? ' active' : ''}`} id="page-job-detail">
          {currentJob && (
            <div className="job-detail-inner">
              <div className="job-info-strip">
                <div className="ji-block"><div className="ji-label">Afdeling</div><div className="ji-val">{currentJob.dept}</div></div>
                <div className="ji-block"><div className="ji-label">Ansættelsestype</div><div className="ji-val">{currentJob.type}</div></div>
                <div className="ji-block"><div className="ji-label">Status</div><div className="ji-val">{currentJob.status === 'active' ? 'Aktiv opslag' : 'På pause'}</div></div>
                <div className="ji-block"><div className="ji-label">Kandidater</div><div className="ji-val">{currentJob.candidates.length}</div></div>
                <div className="ji-block"><div className="ji-label">Wolf-profil</div><div className="ji-val" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><WolfDots wolf={currentJob.wolf1} wolfSec={currentJob.wolf2} /></div></div>
              </div>
              <div>
                <div className="cands-header" style={{ marginBottom: 12 }}>
                  <div className="cands-title">Kandidater ({currentJob.candidates.length})</div>
                </div>
                {currentJob.candidates.length === 0 ? (
                  <div className="empty-cands">
                    <div className="ec-icon">👤</div>
                    <div className="ec-title">Ingen kandidater endnu</div>
                    <div className="ec-sub">Tilføj den første kandidat til denne stilling ved at uploade et CV eller indsætte tekst.</div>
                    <button className="ec-btn" onClick={openCandModal}>+ Tilføj kandidat</button>
                  </div>
                ) : (
                  <div className="cands-grid">
                    {currentJob.candidates.map(c => (
                      <CandCard key={c.id} c={c} onClick={() => !c._loading && !c._error && openCandidateProfile(c.id)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* PAGE: CV ANALYSE */}
        <div className={`page${page === 'cv' ? ' active' : ''}`} id="page-cv">
          <div className="cv-left">
            <div className="panel-label">Upload CV&apos;er</div>
            <div
              className={`upload-zone${cvDrag ? ' drag' : ''}`}
              onDragOver={e => { e.preventDefault(); setCvDrag(true) }}
              onDragLeave={() => setCvDrag(false)}
              onDrop={e => {
                e.preventDefault(); setCvDrag(false)
                Array.from(e.dataTransfer.files).forEach(f => {
                  uploadToSupabase(f)
                  addToQueue({ type: 'file', file: f, name: f.name })
                })
              }}
            >
              <input
                type="file" accept=".pdf,.txt,.doc,.docx" multiple
                onChange={e => {
                  Array.from(e.target.files ?? []).forEach(f => {
                    uploadToSupabase(f)
                    addToQueue({ type: 'file', file: f, name: f.name })
                  })
                  e.target.value = ''
                }}
              />
              <div className="uz-icon">📄</div>
              <div className="uz-title">Træk filer hertil</div>
              <div className="uz-sub">Upload ét eller flere CV / ansøgningsbreve</div>
              <div className="uz-chips"><span className="uz-chip">PDF</span><span className="uz-chip">TXT</span><span className="uz-chip">DOCX</span></div>
            </div>

            <div className="or-line">eller tilføj manuelt</div>

            <div className="field">
              <div className="field-label">LinkedIn URL</div>
              <input
                className="txt-in" type="url" placeholder="https://linkedin.com/in/navn"
                value={linkedinVal} onChange={e => setLinkedinVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && linkedinVal.trim()) {
                    addToQueue({ type: 'linkedin', name: linkedinVal.trim() })
                    setLinkedinVal('')
                  }
                }}
              />
            </div>
            <div className="field">
              <div className="field-label">Indsæt CV / ansøgning som tekst</div>
              <textarea
                rows={6} placeholder="Sæt CV-tekst eller ansøgning ind her..."
                value={cvText} onChange={e => setCvText(e.target.value)}
                onBlur={() => {
                  if (cvText.trim().length > 50) {
                    addToQueue({ type: 'text', content: cvText.trim(), name: nameVal || 'Kandidat (tekst)' })
                    setCvText(''); setNameVal('')
                  }
                }}
              />
            </div>
            <div className="field">
              <div className="field-label">Kandidatens navn (valgfrit)</div>
              <input className="txt-in" type="text" placeholder="Fornavn Efternavn" value={nameVal} onChange={e => setNameVal(e.target.value)} />
            </div>

            {queue.length > 0 && (
              <div className="queue-wrap">
                <div className="panel-label" style={{ marginBottom: 4 }}>Klar til analyse ({queue.length})</div>
                {queue.map(it => (
                  <div key={it.id} className="q-item">
                    <span className="q-icon">{it.type === 'file' ? '📄' : it.type === 'linkedin' ? '🔗' : '📝'}</span>
                    <span className="q-name">{it.name}</span>
                    <span className="q-type">{it.type}</span>
                    <span className="q-rm" onClick={() => removeFromQueue(it.id)}>✕</span>
                  </div>
                ))}
              </div>
            )}

            <button className="analyze-btn" disabled={!cvHasInput} onClick={runAnalysis}>
              <span>🔍</span>
              <span>{cvHasInput ? `Analysér ${queue.length || 1} kandidat${queue.length > 1 ? 'er' : ''}` : 'Tilføj kandidat for at analysere'}</span>
            </button>
          </div>

          <div className="cv-right">
            {cvResults.length === 0 ? (
              <div className="empty-state">
                <div className="es-icon">🐺</div>
                <div className="es-title">Ingen analyser endnu</div>
                <div className="es-sub">Upload et CV, indsæt tekst eller en LinkedIn URL og tryk analysér.</div>
              </div>
            ) : (
              cvResults.map(r => {
                if (r.loading) return (
                  <div key={r.id} className="loading-row">
                    <div className="spinner" />
                    <span style={{ fontSize: 12, color: 'var(--m1)' }}>Analyserer {r.name}...</span>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div className="skel" style={{ width: '55%' }} />
                      <div className="skel" style={{ width: '35%', height: 8 }} />
                    </div>
                  </div>
                )
                if (r.error) return <div key={r.id} className="err-row">Fejl: {r.error}</div>
                return (
                  <div key={r.id} className="result-row">
                    <div className="rr-top">
                      <div className="rr-avatar" style={{ background: r.grad }}>{initials(r.name)}</div>
                      <div className="rr-info">
                        <div className="rr-nameline">
                          <div className="rr-name">{r.name}</div>
                          <div className={`rr-score ${scoreClass(r.score)}`}>{r.score}</div>
                        </div>
                        <div className="rr-meta">{r.headline}</div>
                      </div>
                    </div>
                    <div className="rr-foot">
                      <div className="rr-wolves"><WolfDots wolf={r.wolf} wolfSec={r.wolfSec} /></div>
                      <div className="rr-flags">
                        {r.flags.length ? r.flags.map((f, i) => {
                          const cls = f.severity === 'red' ? 'red' : f.severity === 'ok' ? 'ok' : 'warn'
                          const icon = cls === 'red' ? '🚩' : cls === 'ok' ? '✦' : '⚠'
                          return <div key={i} className={`rr-flag ${cls}`}><span>{icon}</span><span>{f.text}</span></div>
                        }) : <div className="rr-flag ok"><span>✦</span><span>Ingen røde flag</span></div>}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* PAGE: KANDIDAT PROFIL */}
        <div className={`page${page === 'cand-profile' ? ' active' : ''}`} id="page-cand-profile">
          {currentCand && currentJob && renderCandProfile(currentCand, currentJob)}
        </div>
      </div>

      {/* ── MODAL: OPRET STILLING ── */}
      <div className={`modal-backdrop${modalJobOpen ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) setModalJobOpen(false) }}>
        <div className="modal">
          <div className="modal-header">
            <div className="modal-title">Opret stilling</div>
            <div className="modal-close" onClick={() => setModalJobOpen(false)}>✕</div>
          </div>
          <div className="modal-body">
            <div className="modal-row">
              <div className="modal-field" style={{ gridColumn: '1/-1' }}>
                <div className="modal-label">Stillingsbetegnelse</div>
                <input
                  className="modal-input" placeholder="fx Marketing Manager"
                  value={jobTitle} onChange={e => { setJobTitle(e.target.value); setJobTitleErr(false) }}
                  style={jobTitleErr ? { borderColor: 'var(--danger)' } : {}}
                />
              </div>
            </div>
            <div className="modal-row">
              <div className="modal-field">
                <div className="modal-label">Afdeling</div>
                <input className="modal-input" placeholder="fx Marketing" value={jobDept} onChange={e => setJobDept(e.target.value)} />
              </div>
              <div className="modal-field">
                <div className="modal-label">Ansættelsestype</div>
                <select className="modal-select" value={jobType} onChange={e => setJobType(e.target.value)}>
                  <option>Fuldtid</option><option>Deltid</option><option>Freelance</option><option>Praktik</option>
                </select>
              </div>
            </div>
            <div className="modal-row">
              <div className="modal-field">
                <div className="modal-label">Primær wolf-type</div>
                <select className="modal-select" value={jobWolf1} onChange={e => setJobWolf1(e.target.value)}>
                  <option value="">Vælg type</option>
                  {Object.values(WOLVES).map(w => <option key={w.label}>{w.label}</option>)}
                </select>
              </div>
              <div className="modal-field">
                <div className="modal-label">Sekundær wolf-type</div>
                <select className="modal-select" value={jobWolf2} onChange={e => setJobWolf2(e.target.value)}>
                  <option value="">Valgfri</option>
                  {Object.values(WOLVES).map(w => <option key={w.label}>{w.label}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="modal-btn modal-btn-ghost" onClick={() => setModalJobOpen(false)}>Annuller</button>
            <button className="modal-btn modal-btn-create" onClick={createJob}>Opret stilling →</button>
          </div>
        </div>
      </div>

      {/* ── MODAL: TILFØJ KANDIDAT ── */}
      <div className={`modal-backdrop${modalCandOpen ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) setModalCandOpen(false) }}>
        <div className="modal">
          <div className="modal-header">
            <div className="modal-title">Tilføj kandidat{currentJob ? ` — ${currentJob.title}` : ''}</div>
            <div className="modal-close" onClick={() => setModalCandOpen(false)}>✕</div>
          </div>
          <div className="modal-body">
            <div className="modal-field">
              <div className="modal-label">Kandidatens navn (valgfrit)</div>
              <input className="modal-input" placeholder="Fornavn Efternavn" value={mcName} onChange={e => setMcName(e.target.value)} />
            </div>
            <div className="modal-field">
              <div className="modal-label">Upload CV</div>
              <div
                className={`modal-upload${mcDrag ? ' drag' : ''}`}
                onDragOver={e => { e.preventDefault(); setMcDrag(true) }}
                onDragLeave={() => setMcDrag(false)}
                onDrop={e => {
                  e.preventDefault(); setMcDrag(false)
                  const f = e.dataTransfer.files[0]
                  if (f) setMcFile(f)
                }}
              >
                <input
                  type="file" accept=".pdf,.txt,.doc,.docx"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setMcFile(f) }}
                />
                <div className="mu-icon">📄</div>
                <div className="mu-title">{mcFile ? mcFile.name : 'Klik eller træk fil hertil'}</div>
                <div className="mu-sub">{mcFile ? `${(mcFile.size / 1024).toFixed(0)} KB` : 'PDF, TXT eller DOCX'}</div>
              </div>
            </div>
            <div className="or-line">eller</div>
            <div className="modal-field">
              <div className="modal-label">Indsæt CV / ansøgning som tekst</div>
              <textarea className="modal-textarea" rows={5} placeholder="Sæt CV-tekst eller ansøgning ind her..." value={mcText} onChange={e => setMcText(e.target.value)} />
            </div>
            <div className="modal-field">
              <div className="modal-label">LinkedIn URL</div>
              <input className="modal-input" placeholder="https://linkedin.com/in/navn" value={mcLinkedin} onChange={e => setMcLinkedin(e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button className="modal-btn modal-btn-ghost" onClick={() => setModalCandOpen(false)}>Annuller</button>
            <button className="modal-btn modal-btn-create" disabled={mcSubmitting} onClick={submitCandModal}>
              {mcSubmitting ? 'Analyserer...' : 'Analysér og tilføj →'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
