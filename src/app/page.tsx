'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// Typer (delt med resten af app'en)
import type { Bar, Flag, Typology, Candidate, Job, Employee, Team, Recommendation, QueueItem, Member, Page } from '@/types'

// Konstanter og helpers (udtrukket til /utils for genbrug)
import { ALL_METRICS, GRADS } from '@/utils/constants'
import { rnd, shuffle } from '@/utils/random'
import { initials, nameFromUrl, readFileText } from '@/utils/format'
import { scoreClass, verdictFromScore } from '@/utils/scoring'

// Genanvendelige UI-komponenter
import { BarRow } from '@/components/ui/BarRow'
import { TypologyExplainer } from '@/components/ui/TypologyExplainer'
import { CandidateCard as CandCard } from '@/components/ui/CandidateCard'

const initialJobs: Job[] = []

// ─── Main app ────────────────────────────────────────────
// ── DB helpers ───────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEmployee(e: any, teamId: number): Employee {
  return {
    id: e.id, name: e.name, score: e.score,
    grad: e.grad,
    bars: e.bars ?? [], verdict: e.verdict,
    headline: e.headline, summary: e.summary,
    personal_bio: e.personal_bio ?? '',
    mbti: e.mbti ?? '', enneagram: e.enneagram ?? '',
    typology_summary: e.typology_summary ?? '',
    detailed_explanation: e.detailed_explanation ?? '',
    typology_strengths: e.typology_strengths ?? [],
    typology_weaknesses: e.typology_weaknesses ?? [],
    collab_strengths: e.collab_strengths ?? [],
    collab_risks: e.collab_risks ?? [],
    role_fit_score: e.role_fit_score ?? undefined,
    role_fit_reasoning: e.role_fit_reasoning ?? '',
    leader_fit: e.leader_fit ?? '',
    flags: e.flags ?? [], strengths: e.strengths ?? [],
    risks: e.risks ?? [], interview_questions: e.interview_questions ?? [],
    role: (e.role === 'leader' ? 'leader' : 'member') as 'member' | 'leader',
    leadership_style: e.leadership_style ?? '',
    teamId,
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCandidate(c: any, jobId: number): Candidate {
  return {
    id: c.id, name: c.name, score: c.score,
    grad: c.grad,
    bars: c.bars ?? [], verdict: c.verdict,
    headline: c.headline, summary: c.summary,
    personal_bio: c.personal_bio ?? '',
    mbti: c.mbti ?? '', enneagram: c.enneagram ?? '',
    typology_summary: c.typology_summary ?? '',
    detailed_explanation: c.detailed_explanation ?? '',
    typology_strengths: c.typology_strengths ?? [],
    typology_weaknesses: c.typology_weaknesses ?? [],
    collab_strengths: c.collab_strengths ?? [],
    collab_risks: c.collab_risks ?? [],
    role_fit_score: c.role_fit_score ?? undefined,
    role_fit_reasoning: c.role_fit_reasoning ?? '',
    leader_fit: c.leader_fit ?? '',
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

  const [orgId, setOrgId] = useState<number | null>(null)
  const [orgName, setOrgName] = useState('')
  const [orgCode, setOrgCode] = useState('')
  const [orgRole, setOrgRole] = useState<'owner' | 'member' | null>(null)
  const [orgStatus, setOrgStatus] = useState<'none' | 'pending' | 'active' | 'loading'>('loading')
  const [members, setMembers] = useState<Member[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>('')
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
  const [jobTeamId, setJobTeamId] = useState<number | null>(null)
  const [jobTeamErr, setJobTeamErr] = useState(false)
  const [jobDescription, setJobDescription] = useState('')
  const [jobHardSkills, setJobHardSkills] = useState('')
  const [jobSuccessCriteria, setJobSuccessCriteria] = useState('')
  const [jobExperienceLevel, setJobExperienceLevel] = useState('')
  const [jobTitleErr, setJobTitleErr] = useState(false)

  // Candidate modal form
  const [mcName, setMcName] = useState('')
  const [mcText, setMcText] = useState('')
  const [mcLinkedin, setMcLinkedin] = useState('')
  const [mcFile, setMcFile] = useState<File | null>(null)
  const [mcDrag, setMcDrag] = useState(false)
  const [mcSubmitting, setMcSubmitting] = useState(false)

  // Teams
  const [teams, setTeams] = useState<Team[]>([])
  const [currentTeamId, setCurrentTeamId] = useState<number | null>(null)
  const [currentEmployeeId, setCurrentEmployeeId] = useState<number | null>(null)
  const [modalTeamOpen, setModalTeamOpen] = useState(false)
  const [modalEmpOpen, setModalEmpOpen] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamDesc, setTeamDesc] = useState('')
  const [teamNameErr, setTeamNameErr] = useState(false)
  const [empName, setEmpName] = useState('')
  const [empFile, setEmpFile] = useState<File | null>(null)
  const [empText, setEmpText] = useState('')
  const [empLinkedin, setEmpLinkedin] = useState('')
  const [empSubmitting, setEmpSubmitting] = useState(false)
  const [empAsLeader, setEmpAsLeader] = useState(false)
  const [empLeadershipStyle, setEmpLeadershipStyle] = useState('')
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [recLoading, setRecLoading] = useState(false)

  // CV analysis page
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [cvText, setCvText] = useState('')
  const [linkedinVal, setLinkedinVal] = useState('')
  const [nameVal, setNameVal] = useState('')
  const [cvResults, setCvResults] = useState<Array<{ id: number; loading?: boolean; error?: string; name: string; score: number; mbti: string; enneagram: string; grad: string; headline: string; flags: Flag[] }>>([])
  const [cvDrag, setCvDrag] = useState(false)
  const analysisCount = useRef(0)

  // ── Load or create organisation ──
  const loadOrCreateOrg = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) { setOrgStatus('none'); return }
    try {
      const res = await fetch('/api/org', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      const body = await res.json()
      if (!res.ok) { setOrgStatus('none'); return }
      if (body.status === 'none' || !body.org_id) {
        setOrgStatus('none')
        return
      }
      setOrgId(body.org_id)
      setOrgName(body.org_name ?? '')
      setOrgCode(body.invite_code ?? '')
      setOrgRole(body.role)
      setOrgStatus(body.status)
    } catch (ex) {
      console.error('[loadOrCreateOrg] exception:', ex)
      setOrgStatus('none')
    }
  }, [supabase])

  // Få current user id (til at finde sig selv i medlemslisten)
  useEffect(() => {
    (async () => {
      const res = await supabase.auth.getUser()
      const id = res.data?.user?.id
      if (id) setCurrentUserId(id)
    })()
  }, [supabase])

  const loadMembers = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    const res = await fetch('/api/members', {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
    })
    if (!res.ok) return
    const data = await res.json()
    setMembers(data.members ?? [])
  }, [supabase])

  async function memberAction(target_user_id: string, action: 'approve' | 'deny' | 'remove') {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ action, target_user_id }),
    })
    if (res.ok) loadMembers()
    else alert((await res.json()).error ?? 'Handlingen fejlede')
  }

  useEffect(() => { loadOrCreateOrg() }, [loadOrCreateOrg])

  // ── Load jobs from Supabase (filtered by org) ──
  const loadJobs = useCallback(async () => {
    if (!orgId) return
    const { data, error } = await supabase
      .from('jobs')
      .select('*, candidates(*)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    if (error) { console.error('[loadJobs]', error); return }
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setJobs(data.map((j: any) => ({
        id: j.id, title: j.title, dept: j.dept, type: j.type,
        status: j.status, team_id: j.team_id,
        description: j.description ?? '',
        hard_skills: j.hard_skills ?? '',
        success_criteria: j.success_criteria ?? '',
        experience_level: j.experience_level ?? '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        candidates: (j.candidates ?? []).map((c: any) => mapCandidate(c, j.id)),
      })))
    }
  }, [supabase, orgId])

  useEffect(() => { loadJobs() }, [loadJobs])

  // Esc closes modals
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setModalJobOpen(false); setModalCandOpen(false)
        setModalTeamOpen(false); setModalEmpOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Load teams from Supabase (filtered by org) ──
  const loadTeams = useCallback(async () => {
    if (!orgId) return
    const { data, error } = await supabase
      .from('teams')
      .select('*, employees(*)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    if (error) { console.error('[loadTeams]', error.message); return }
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTeams(data.map((t: any) => ({
        id: t.id, name: t.name, description: t.description,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        employees: (t.employees ?? []).map((e: any) => mapEmployee(e, t.id)),
      })))
    }
  }, [supabase, orgId])

  useEffect(() => { loadTeams() }, [loadTeams])

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
  async function callAnalyze(content: string, name: string, ctx: { team_context?: string; role_context?: string; leader_context?: string } = {}) {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, name, ...ctx }),
    })
    if (!res.ok) throw new Error('Analyse fejlede')
    const data = await res.json()
    console.log('[callAnalyze]', name, 'returned:', data)
    return data
  }

  function buildTeamContext(teamId: number | null | undefined): string {
    if (!teamId) return ''
    const team = teams.find(t => t.id === teamId)
    if (!team) return ''
    const members = team.employees.filter(e => !e._loading && !e._error && e.mbti)
    if (members.length === 0) return ''
    return members.map(e => `- ${e.name}: ${e.mbti}${e.enneagram ? ` ${e.enneagram}` : ''}`).join('\n')
  }

  function buildLeaderContext(teamId: number | null | undefined): string {
    if (!teamId) return ''
    const team = teams.find(t => t.id === teamId)
    if (!team) return ''
    const leader = team.employees.find(e => e.role === 'leader' && !e._loading && !e._error)
    if (!leader) return ''
    const parts: string[] = [`Lederens navn: ${leader.name}`]
    if (leader.mbti) parts.push(`Lederens MBTI: ${leader.mbti}`)
    if (leader.enneagram) parts.push(`Lederens Enneagram-tritype: ${leader.enneagram}`)
    if (leader.leadership_style) parts.push(`Lederstil: ${leader.leadership_style}`)
    if (leader.typology_summary) parts.push(`Lederens typologi-resume: ${leader.typology_summary}`)
    return parts.join('\n')
  }

  // Eksklud leder fra team-medlems-context (de behandles separat som leder)
  function buildTeamContextMembersOnly(teamId: number | null | undefined): string {
    if (!teamId) return ''
    const team = teams.find(t => t.id === teamId)
    if (!team) return ''
    const members = team.employees.filter(e => !e._loading && !e._error && e.mbti && e.role !== 'leader')
    if (members.length === 0) return ''
    return members.map(e => `- ${e.name}: ${e.mbti}${e.enneagram ? ` ${e.enneagram}` : ''}`).join('\n')
  }

  function buildRoleContext(job: Job | undefined): string {
    if (!job) return ''
    const parts: string[] = []
    if (job.title) parts.push(`Stilling: ${job.title}`)
    if (job.experience_level) parts.push(`Erfaringsniveau: ${job.experience_level}`)
    if (job.description) parts.push(`Rolle-beskrivelse: ${job.description}`)
    if (job.hard_skills) parts.push(`Nødvendige hard skills: ${job.hard_skills}`)
    if (job.success_criteria) parts.push(`Succes-kriterier: ${job.success_criteria}`)
    return parts.join('\n')
  }

  async function analyzeAndAddToJob(content: string, name: string, jobId: number) {
    const tempId = -(Date.now() + Math.random())
    const grad = GRADS[analysisCount.current++ % GRADS.length]
    setJobs(prev => prev.map(j => j.id !== jobId ? j : {
      ...j, candidates: [...j.candidates, { id: tempId, name, _loading: true } as Candidate],
    }))
    try {
      const job = jobs.find(j => j.id === jobId)
      const team_context  = buildTeamContextMembersOnly(job?.team_id)
      const leader_context = buildLeaderContext(job?.team_id)
      const role_context   = buildRoleContext(job)
      const res = await callAnalyze(content, name, { team_context, leader_context, role_context })
      const score = res.score ?? rnd(50, 90)
      const bars = shuffle(ALL_METRICS).slice(0, 3).map((l: string) => ({ l, v: rnd(30, 97) }))
      const verdict = verdictFromScore(score)

      const { data: saved, error: dbErr } = await supabase.from('candidates').insert({
        job_id: jobId, name, score, grad, bars, verdict,
        headline: res.headline ?? '',
        summary: res.summary ?? '',
        personal_bio: res.personal_bio ?? '',
        mbti: res.mbti ?? '',
        enneagram: res.enneagram ?? '',
        typology_summary: res.typology_summary ?? '',
        detailed_explanation: res.detailed_explanation ?? '',
        typology_strengths: res.typology_strengths ?? [],
        typology_weaknesses: res.typology_weaknesses ?? [],
        collab_strengths: res.collab_strengths ?? [],
        collab_risks: res.collab_risks ?? [],
        role_fit_score: typeof res.role_fit_score === 'number' ? res.role_fit_score : null,
        role_fit_reasoning: res.role_fit_reasoning ?? '',
        leader_fit: res.leader_fit ?? '',
        flags: res.flags ?? [],
        interview_questions: res.interview_questions ?? [],
        strengths: res.typology_strengths ?? res.strengths ?? [],
        risks: res.typology_weaknesses ?? res.risks ?? [],
      }).select().single()

      if (dbErr) {
        console.error('[analyzeAndAddToJob] DB FEJL:', dbErr.message, dbErr.code, dbErr.details, dbErr.hint)
        alert('Database fejl ved oprettelse:\n' + (dbErr.message ?? 'Ukendt') + '\n\nHar du kørt typology.sql i Supabase?')
      }

      const cand: Candidate = saved
        ? mapCandidate(saved, jobId)
        : { id: Date.now() + Math.random(), name, score, grad, bars, verdict, headline: res.headline ?? '', summary: res.summary ?? '', personal_bio: res.personal_bio ?? '', mbti: res.mbti ?? '', enneagram: res.enneagram ?? '', typology_summary: res.typology_summary ?? '', detailed_explanation: res.detailed_explanation ?? '', typology_strengths: res.typology_strengths ?? [], typology_weaknesses: res.typology_weaknesses ?? [], collab_strengths: res.collab_strengths ?? [], collab_risks: res.collab_risks ?? [], flags: res.flags ?? [], interview_questions: res.interview_questions ?? [], strengths: res.typology_strengths ?? res.strengths ?? [], risks: res.typology_weaknesses ?? res.risks ?? [], jobId }

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
  const currentTeam = teams.find(t => t.id === currentTeamId) ?? null
  const currentEmployee = currentTeam?.employees.find(e => e.id === currentEmployeeId) ?? null

  function showJobs() { setPage('jobs'); setCurrentJobId(null); setCurrentCandId(null) }
  function openJob(id: number) { setCurrentJobId(id); setPage('job-detail'); setCurrentCandId(null) }
  function openCandidateProfile(candId: number) { setCurrentCandId(candId); setPage('cand-profile') }
  function goBack() {
    if (page === 'cand-profile' && currentCandId && currentJobId) { openJob(currentJobId); return }
    if (page === 'employee-profile' && currentEmployeeId && currentTeamId) { openTeam(currentTeamId); return }
    if (page === 'team-detail') { showTeams(); return }
    showJobs()
  }
  function navCv() { setPage('cv'); setCurrentJobId(null); setCurrentCandId(null) }
  function showMembers() { setPage('members'); loadMembers() }

  // ── Ansæt kandidat → flyt til team som medarbejder ──
  async function hireCandidate(candidate: Candidate, job: Job) {
    if (!job.team_id) {
      alert('Stillingen er ikke knyttet til et team. Slet stillingen og opret en ny med et team valgt.')
      return
    }
    const team = teams.find(t => t.id === job.team_id)
    if (!team) {
      alert('Teamet kunne ikke findes.')
      return
    }
    if (!confirm(`Ansæt ${candidate.name} i ${team.name}?`)) return

    const { error: insErr } = await supabase.from('employees').insert({
      team_id: job.team_id,
      name: candidate.name,
      score: candidate.score,
      grad: candidate.grad,
      bars: candidate.bars,
      verdict: candidate.verdict,
      headline: candidate.headline,
      summary: candidate.summary,
      personal_bio: candidate.personal_bio,
      mbti: candidate.mbti,
      enneagram: candidate.enneagram,
      typology_summary: candidate.typology_summary,
      detailed_explanation: candidate.detailed_explanation,
      typology_strengths: candidate.typology_strengths,
      typology_weaknesses: candidate.typology_weaknesses,
      collab_strengths: candidate.collab_strengths,
      collab_risks: candidate.collab_risks,
      role_fit_score: candidate.role_fit_score ?? null,
      role_fit_reasoning: candidate.role_fit_reasoning ?? '',
      leader_fit: candidate.leader_fit ?? '',
      flags: candidate.flags,
      strengths: candidate.strengths,
      risks: candidate.risks,
      interview_questions: candidate.interview_questions,
    })
    if (insErr) { alert('Kunne ikke ansætte: ' + insErr.message); return }

    const { error: delErr } = await supabase.from('candidates').delete().eq('id', candidate.id)
    if (delErr) console.error('[hire] kunne ikke slette kandidat:', delErr)

    setJobs(prev => prev.map(j => j.id !== job.id ? j : { ...j, candidates: j.candidates.filter(c => c.id !== candidate.id) }))
    await loadTeams()
    openTeam(team.id)
  }

  // ── Slet ────────────────────────────────────────────────
  async function deleteCandidate(candidateId: number, jobId: number) {
    if (!confirm('Er du sikker på du vil slette denne kandidat?')) return
    const { error } = await supabase.from('candidates').delete().eq('id', candidateId)
    if (error) { alert('Kunne ikke slette: ' + error.message); return }
    setJobs(prev => prev.map(j => j.id !== jobId ? j : { ...j, candidates: j.candidates.filter(c => c.id !== candidateId) }))
    if (currentCandId === candidateId) openJob(jobId)
  }

  async function deleteEmployee(employeeId: number, teamId: number) {
    if (!confirm('Er du sikker på du vil slette denne medarbejder?')) return
    const { error } = await supabase.from('employees').delete().eq('id', employeeId)
    if (error) { alert('Kunne ikke slette: ' + error.message); return }
    setTeams(prev => prev.map(t => t.id !== teamId ? t : { ...t, employees: t.employees.filter(e => e.id !== employeeId) }))
    if (currentEmployeeId === employeeId) openTeam(teamId)
  }

  async function deleteJob(jobId: number) {
    if (!confirm('Er du sikker på du vil slette stillingen? Alle tilknyttede kandidater slettes også.')) return
    await supabase.from('candidates').delete().eq('job_id', jobId)
    const { error } = await supabase.from('jobs').delete().eq('id', jobId)
    if (error) { alert('Kunne ikke slette: ' + error.message); return }
    setJobs(prev => prev.filter(j => j.id !== jobId))
    showJobs()
  }

  // ── Job modal ──
  async function createJob() {
    if (!jobTitle.trim()) { setJobTitleErr(true); return }
    if (!jobTeamId) { setJobTeamErr(true); return }
    if (!orgId) { alert('Vent venligst — organisationen indlæses...'); return }
    const { data, error } = await supabase.from('jobs').insert({
      title: jobTitle.trim(), dept: jobDept.trim() || 'Generel',
      type: jobType, status: 'active',
      org_id: orgId,
      team_id: jobTeamId,
      description: jobDescription.trim(),
      hard_skills: jobHardSkills.trim(),
      success_criteria: jobSuccessCriteria.trim(),
      experience_level: jobExperienceLevel,
    }).select().single()
    if (error) { console.error('[createJob]', error.code, error.message, error.details, error.hint); return }
    const j: Job = { ...data, candidates: [] }
    setJobs(prev => [j, ...prev])
    setModalJobOpen(false)
    setJobTitle(''); setJobDept(''); setJobType('Fuldtid'); setJobTitleErr(false); setJobTeamId(null); setJobTeamErr(false)
    setJobDescription(''); setJobHardSkills(''); setJobSuccessCriteria(''); setJobExperienceLevel('')
    openJob(j.id)
  }

  // ── Teams ──
  function showTeams() { setPage('teams'); setCurrentTeamId(null); setCurrentEmployeeId(null); setRecommendation(null) }
  function openTeam(id: number) { setCurrentTeamId(id); setPage('team-detail'); setCurrentEmployeeId(null); setRecommendation(null) }
  function openEmployeeProfile(empId: number) { setCurrentEmployeeId(empId); setPage('employee-profile') }

  const [teamErr, setTeamErr] = useState('')
  const [copyLabel, setCopyLabel] = useState<Record<string, string>>({})

  async function copyInviteLink(type: 'job' | 'team', targetId: number, label: string) {
    const key = `${type}-${targetId}`
    setCopyLabel(prev => ({ ...prev, [key]: '…' }))
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, target_id: targetId, label }),
      })
      const d = await res.json()
      if (!res.ok || !d.url) {
        const msg = d.error ?? 'API fejl'
        console.error('[copyInviteLink]', msg)
        window.alert('Fejl ved oprettelse af link:\n' + msg)
        setCopyLabel(prev => ({ ...prev, [key]: '' }))
        return
      }
      // Try clipboard API, fall back to prompt
      try {
        await navigator.clipboard.writeText(d.url)
        setCopyLabel(prev => ({ ...prev, [key]: '✓ Kopieret!' }))
      } catch {
        window.prompt('Kopiér invitationslinket:', d.url)
        setCopyLabel(prev => ({ ...prev, [key]: '✓ Link klar' }))
      }
      setTimeout(() => setCopyLabel(prev => ({ ...prev, [key]: '' })), 3000)
    } catch (ex) {
      console.error('[copyInviteLink] network error', ex)
      window.alert('Netværksfejl — tjek konsollen for detaljer.')
      setCopyLabel(prev => ({ ...prev, [key]: '' }))
    }
  }

  async function createTeam() {
    console.log('[createTeam] clicked, name:', teamName)
    if (!teamName.trim()) { setTeamNameErr(true); return }
    if (!orgId) { setTeamErr('Vent venligst — organisationen indlæses...'); return }
    setTeamErr('')
    try {
      const { data, error } = await supabase.from('teams').insert({
        name: teamName.trim(), description: teamDesc.trim(),
        org_id: orgId,
      }).select().single()
      console.log('[createTeam] result:', { data, error })
      if (error) {
        const msg = error.message || error.code || JSON.stringify(error) || 'Ukendt fejl'
        console.error('[createTeam] error:', msg)
        setTeamErr(msg)
        return
      }
      const t: Team = { ...data, employees: [] }
      setTeams(prev => [t, ...prev])
      setModalTeamOpen(false); setTeamName(''); setTeamDesc(''); setTeamNameErr(false); setTeamErr('')
      openTeam(t.id)
    } catch (ex: unknown) {
      const msg = ex instanceof Error ? ex.message : String(ex)
      console.error('[createTeam] exception:', msg)
      setTeamErr('Fejl: ' + msg)
    }
  }

  function openEmpModal(asLeader = false) {
    setEmpName(''); setEmpFile(null); setEmpText(''); setEmpLinkedin('')
    setEmpAsLeader(asLeader); setEmpLeadershipStyle('')
    setModalEmpOpen(true)
  }

  async function submitEmpModal() {
    if (!empText && !empFile && !empLinkedin) { alert('Tilføj et CV, tekst eller LinkedIn URL.'); return }
    if (empAsLeader && !empLeadershipStyle) { alert('Vælg en lederstil.'); return }
    setEmpSubmitting(true)
    let content = '', name = empName.trim() || (empAsLeader ? 'Leder' : 'Medarbejder')
    if (empFile) {
      uploadToSupabase(empFile, name)
      try { content = await readFileText(empFile) } catch { content = '' }
    } else if (empText) { content = empText
    } else if (empLinkedin) { content = 'LinkedIn: ' + empLinkedin; if (!empName.trim()) name = nameFromUrl(empLinkedin) }
    setModalEmpOpen(false); setEmpSubmitting(false)
    await analyzeAndAddToTeam(content, name, currentTeamId!, empAsLeader, empLeadershipStyle)
  }

  async function analyzeAndAddToTeam(content: string, name: string, teamId: number, asLeader = false, leadershipStyle = '') {
    const tempId = -(Date.now() + Math.random())
    const grad = GRADS[analysisCount.current++ % GRADS.length]
    setTeams(prev => prev.map(t => t.id !== teamId ? t : {
      ...t, employees: [...t.employees, { id: tempId, name, _loading: true, role: asLeader ? 'leader' : 'member' } as Employee],
    }))
    try {
      const team_context = buildTeamContextMembersOnly(teamId)
      const leader_context = buildLeaderContext(teamId)
      const res = await callAnalyze(content, name, { team_context, leader_context })
      const score = res.score ?? rnd(50, 90)
      const bars = shuffle(ALL_METRICS).slice(0, 3).map((l: string) => ({ l, v: rnd(30, 97) }))
      const verdict = verdictFromScore(score)
      const { data: saved, error: dbErr } = await supabase.from('employees').insert({
        team_id: teamId, name, score, grad, bars, verdict,
        headline: res.headline ?? '', summary: res.summary ?? '',
        personal_bio: res.personal_bio ?? '',
        mbti: res.mbti ?? '',
        enneagram: res.enneagram ?? '',
        typology_summary: res.typology_summary ?? '',
        detailed_explanation: res.detailed_explanation ?? '',
        typology_strengths: res.typology_strengths ?? [],
        typology_weaknesses: res.typology_weaknesses ?? [],
        collab_strengths: res.collab_strengths ?? [],
        collab_risks: res.collab_risks ?? [],
        role_fit_score: typeof res.role_fit_score === 'number' ? res.role_fit_score : null,
        role_fit_reasoning: res.role_fit_reasoning ?? '',
        leader_fit: res.leader_fit ?? '',
        role: asLeader ? 'leader' : 'member',
        leadership_style: asLeader ? leadershipStyle : '',
        flags: res.flags ?? [], interview_questions: res.interview_questions ?? [],
        strengths: res.typology_strengths ?? res.strengths ?? [],
        risks: res.typology_weaknesses ?? res.risks ?? [],
      }).select().single()
      if (dbErr) {
        console.error('[analyzeAndAddToTeam] DB FEJL:', dbErr.message, dbErr.code, dbErr.details, dbErr.hint)
        alert('Database fejl ved oprettelse:\n' + (dbErr.message ?? 'Ukendt') + '\n\nHar du kørt typology.sql i Supabase?')
      }
      const emp: Employee = saved
        ? mapEmployee(saved, teamId)
        : { id: Date.now() + Math.random(), name, score, grad, bars, verdict, headline: res.headline ?? '', summary: res.summary ?? '', personal_bio: res.personal_bio ?? '', mbti: res.mbti ?? '', enneagram: res.enneagram ?? '', typology_summary: res.typology_summary ?? '', detailed_explanation: res.detailed_explanation ?? '', typology_strengths: res.typology_strengths ?? [], typology_weaknesses: res.typology_weaknesses ?? [], collab_strengths: res.collab_strengths ?? [], collab_risks: res.collab_risks ?? [], role_fit_score: res.role_fit_score, role_fit_reasoning: res.role_fit_reasoning ?? '', leader_fit: res.leader_fit ?? '', flags: res.flags ?? [], interview_questions: res.interview_questions ?? [], strengths: res.typology_strengths ?? res.strengths ?? [], risks: res.typology_weaknesses ?? res.risks ?? [], role: asLeader ? 'leader' : 'member', leadership_style: asLeader ? leadershipStyle : '', teamId }
      setTeams(prev => prev.map(t => t.id !== teamId ? t : {
        ...t, employees: t.employees.map(e => e.id === tempId ? emp : e),
      }))
    } catch (err) {
      setTeams(prev => prev.map(t => t.id !== teamId ? t : {
        ...t, employees: t.employees.map(e =>
          e.id === tempId ? { ...e, _loading: false, _error: err instanceof Error ? err.message : 'Fejl' } : e
        ),
      }))
    }
  }

  async function getRecommendation(teamId: number, description: string) {
    const team = teams.find(t => t.id === teamId)
    if (!team) return
    setRecLoading(true); setRecommendation(null)
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employees: team.employees.filter(e => !e._loading && !e._error).map(e => ({ name: e.name, mbti: e.mbti, enneagram: e.enneagram })),
          description, teamName: team.name,
        }),
      })
      const data = await res.json()
      setRecommendation(data)
    } catch (err) { console.error('[recommend]', err) }
    setRecLoading(false)
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
    setCvResults(prev => [...prev, { id: tempId, loading: true, name: item.name, score: 0, mbti: '', enneagram: '', grad, headline: '', flags: [] }])
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
      setCvResults(prev => prev.map(r => r.id !== tempId ? r : {
        id: tempId, name, score: res.score ?? 0, mbti: res.mbti ?? '', enneagram: res.enneagram ?? '',
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
    topbarActions = (<><button className="tb-btn tb-btn-ghost" onClick={() => deleteJob(currentJob.id)} style={{ color: 'var(--danger)' }}>Slet stilling</button><button className="tb-btn tb-btn-ghost" onClick={() => copyInviteLink('job', currentJob.id, currentJob.title)}>{copyLabel[`job-${currentJob.id}`] || '🔗 Invitationslink'}</button><button className="tb-btn tb-btn-primary" onClick={openCandModal}>+ Tilføj kandidat</button></>)
  } else if (page === 'cv') {
    breadcrumb = <span className="tb-crumb active">CV Analyse</span>
    topbarActions = <div className="ai-pill">AI AKTIV</div>
  } else if (page === 'cand-profile' && currentCand && currentJob) {
    backHidden = false
    breadcrumb = (<><span className="tb-crumb" onClick={showJobs}>Åbne stillinger</span><span className="tb-crumb-sep">/</span><span className="tb-crumb" onClick={() => openJob(currentJobId!)}>{currentJob.title}</span><span className="tb-crumb-sep">/</span><span className="tb-crumb active">{currentCand.name}</span></>)
    topbarActions = (
      <>
        <button className="tb-btn tb-btn-ghost" onClick={() => deleteCandidate(currentCand.id, currentJob.id)} style={{ color: 'var(--danger)' }}>Slet</button>
        <button className="tb-btn tb-btn-primary" onClick={() => hireCandidate(currentCand, currentJob)}>✓ Ansæt</button>
        <button className="tb-btn tb-btn-ghost" onClick={() => openJob(currentJobId!)}>← Tilbage</button>
      </>
    )
  } else if (page === 'teams') {
    breadcrumb = <span className="tb-crumb active">Teams</span>
    topbarActions = <button className="tb-btn tb-btn-primary" onClick={() => setModalTeamOpen(true)}>+ Opret team</button>
  } else if (page === 'team-detail' && currentTeam) {
    backHidden = false
    breadcrumb = (<><span className="tb-crumb" onClick={showTeams}>Teams</span><span className="tb-crumb-sep">/</span><span className="tb-crumb active">{currentTeam.name}</span></>)
    {
      const hasLeader = currentTeam.employees.some(e => e.role === 'leader' && !e._loading && !e._error)
      topbarActions = (
        <>
          <button className="tb-btn tb-btn-ghost" onClick={async () => { if (!confirm(`Slet team "${currentTeam.name}" og alle medarbejdere?`)) return; await supabase.from('employees').delete().eq('team_id', currentTeam.id); const { error } = await supabase.from('teams').delete().eq('id', currentTeam.id); if (error) { alert('Kunne ikke slette: ' + error.message); return } setTeams(prev => prev.filter(t => t.id !== currentTeam.id)); showTeams() }} style={{ color: 'var(--danger)' }}>Slet team</button>
          <button className="tb-btn tb-btn-ghost" onClick={() => copyInviteLink('team', currentTeam.id, currentTeam.name)}>{copyLabel[`team-${currentTeam.id}`] || '🔗 Invitationslink'}</button>
          {!hasLeader && <button className="tb-btn tb-btn-ghost" onClick={() => openEmpModal(true)}>+ Tilføj leder</button>}
          <button className="tb-btn tb-btn-primary" onClick={() => openEmpModal(false)}>+ Tilføj medarbejder</button>
        </>
      )
    }
  } else if (page === 'members') {
    breadcrumb = <span className="tb-crumb active">Medlemmer</span>
    topbarActions = null
  } else if (page === 'employee-profile' && currentEmployee && currentTeam) {
    backHidden = false
    breadcrumb = (<><span className="tb-crumb" onClick={showTeams}>Teams</span><span className="tb-crumb-sep">/</span><span className="tb-crumb" onClick={() => openTeam(currentTeamId!)}>{currentTeam.name}</span><span className="tb-crumb-sep">/</span><span className="tb-crumb active">{currentEmployee.name}</span></>)
    topbarActions = (
      <>
        <button className="tb-btn tb-btn-ghost" onClick={() => deleteEmployee(currentEmployee.id, currentTeam.id)} style={{ color: 'var(--danger)' }}>Slet</button>
        <button className="tb-btn tb-btn-ghost" onClick={() => openTeam(currentTeamId!)}>← Tilbage</button>
      </>
    )
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
            {(c.mbti || c.enneagram) && (
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ padding: '4px 11px', background: 'var(--ink)', color: 'var(--bg)', borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', fontFamily: 'monospace' }}>
                  {c.mbti}{c.enneagram ? ` ${c.enneagram}` : ''}
                </span>
              </div>
            )}
          </div>
          <div className="cp-verdict-block">
            <div className={`cp-score-big ${sClass}`}>{c.score}</div>
            <div className="cp-score-label">Match score</div>
            <div className={`cp-verdict-tag ${vTag}`}>{c.verdict}</div>
          </div>
        </div>

        {c.personal_bio && (
          <div style={{ margin: '0 24px 0', padding: '18px 22px', background: 'var(--s2)', borderRadius: 12, border: '1px solid var(--b1)', borderLeft: '3px solid var(--accent)' }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Om personen</div>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--ink)', lineHeight: 1.75, fontWeight: 300 }}>{c.personal_bio}</p>
          </div>
        )}

        <div className="cp-grid">
          <div className="cp-col">
            <div className="cp-section">
              <div className="cp-section-title">Adfærdsprofil</div>
              {fullBars.map((b, i) => <BarRow key={i} bar={b} prefix="cp" />)}
            </div>
            {/* Personprofil — MBTI + Enneagram */}
            <div className="cp-section">
              <div className="cp-section-title">Personprofil</div>

              {c.mbti || c.enneagram ? (
                <>
                  {/* Formodet typekombination — prominent */}
                  <div style={{ background: 'var(--ink)', color: 'var(--bg)', borderRadius: 10, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--m2)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 4, opacity: .8 }}>Formodet typekombination</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 700, letterSpacing: '3px' }}>
                        {c.mbti}{c.enneagram ? ` ${c.enneagram}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, fontSize: 10, opacity: .7 }}>
                      {c.mbti && <span>MBTI</span>}
                      {c.mbti && c.enneagram && <span>·</span>}
                      {c.enneagram && <span>Tritype</span>}
                    </div>
                  </div>

                  {/* Hverdagsforklaring */}
                  {c.typology_summary && (
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--ink)', lineHeight: 1.7, fontWeight: 300 }}>
                      {c.typology_summary}
                    </p>
                  )}

                  {/* Expandable detaljeret forklaring */}
                  {c.detailed_explanation && (
                    <TypologyExplainer text={c.detailed_explanation} />
                  )}

                  {/* Styrker / svagheder grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
                    {c.typology_strengths.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 6, fontWeight: 500 }}>Typologiske styrker</div>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {c.typology_strengths.map((s, i) => (
                            <li key={i} style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 300, paddingLeft: 12, position: 'relative' }}>
                              <span style={{ position: 'absolute', left: 0, color: 'var(--accent)' }}>+</span>{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {c.typology_weaknesses.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--warn)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 6, fontWeight: 500 }}>Typologiske svagheder</div>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {c.typology_weaknesses.map((s, i) => (
                            <li key={i} style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 300, paddingLeft: 12, position: 'relative' }}>
                              <span style={{ position: 'absolute', left: 0, color: 'var(--warn)' }}>−</span>{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--m2)', fontStyle: 'italic' }}>
                  Profilanalyse er endnu ikke kørt for denne person.
                </p>
              )}
            </div>

            {/* Rolle-fit (kun hvis stillingen havde rolle-kontekst) */}
            {(typeof c.role_fit_score === 'number' || c.role_fit_reasoning) && (
              <div className="cp-section">
                <div className="cp-section-title">Rolle-fit til denne stilling</div>
                {typeof c.role_fit_score === 'number' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                    <div style={{
                      fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 700,
                      color: c.role_fit_score >= 75 ? 'var(--accent)' : c.role_fit_score >= 50 ? 'var(--warn)' : 'var(--danger)',
                    }}>
                      {c.role_fit_score}<span style={{ fontSize: 14, color: 'var(--m2)', fontWeight: 400 }}>/100</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--m2)', textTransform: 'uppercase', letterSpacing: '1px' }}>Match til rollens krav</div>
                  </div>
                )}
                {c.role_fit_reasoning && (
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--ink)', lineHeight: 1.7, fontWeight: 300 }}>{c.role_fit_reasoning}</p>
                )}
              </div>
            )}

            {/* Leder-fit */}
            {c.leader_fit && (
              <div className="cp-section">
                <div className="cp-section-title">Under denne leder</div>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--ink)', lineHeight: 1.7, fontWeight: 300 }}>{c.leader_fit}</p>
              </div>
            )}

            {/* Samarbejde i team */}
            {(c.collab_strengths.length > 0 || c.collab_risks.length > 0) && (
              <div className="cp-section">
                <div className="cp-section-title">Samarbejde i team</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {c.collab_strengths.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8, fontWeight: 500 }}>Sådan bidrager de</div>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {c.collab_strengths.map((s, i) => (
                          <li key={i} style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 300, lineHeight: 1.5, paddingLeft: 16, position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 0, color: 'var(--accent)' }}>✓</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {c.collab_risks.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--warn)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8, fontWeight: 500 }}>Mulige udfordringer</div>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {c.collab_risks.map((s, i) => (
                          <li key={i} style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 300, lineHeight: 1.5, paddingLeft: 16, position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 0, color: 'var(--warn)' }}>⚠</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
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

  // ── Status guards ──────────────────────────────────
  if (orgStatus === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', fontFamily: "'DM Sans', sans-serif", color: 'var(--m1)', fontSize: 14 }}>
        Indlæser…
      </div>
    )
  }

  if (orgStatus === 'none') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
        <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 16, padding: '40px 36px', maxWidth: 460, width: '100%', textAlign: 'center', boxShadow: '0 4px 32px rgba(26,25,22,.07)' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔑</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Ingen organisation</div>
          <p style={{ fontSize: 14, color: 'var(--m1)', lineHeight: 1.7, fontWeight: 300, marginBottom: 24 }}>
            Din konto er ikke knyttet til en organisation. Kontakt din administrator for at få en organisationskode, eller opret en ny konto med koden.
          </p>
          <button onClick={handleLogout} style={{ padding: '10px 24px', borderRadius: 9, background: 'var(--ink)', color: 'var(--bg)', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            Log ud
          </button>
        </div>
      </div>
    )
  }

  if (orgStatus === 'pending') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
        <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 16, padding: '40px 36px', maxWidth: 460, width: '100%', textAlign: 'center', boxShadow: '0 4px 32px rgba(26,25,22,.07)' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Venter på godkendelse</div>
          <p style={{ fontSize: 14, color: 'var(--m1)', lineHeight: 1.7, fontWeight: 300, marginBottom: 24 }}>
            Du er tilmeldt <strong style={{ color: 'var(--ink)' }}>{orgName}</strong> og venter på at ejeren godkender din anmodning. Du får adgang til platformen så snart det er gjort.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => loadOrCreateOrg()} style={{ padding: '10px 20px', borderRadius: 9, background: 'transparent', color: 'var(--ink)', border: '1px solid var(--b1)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              Tjek igen
            </button>
            <button onClick={handleLogout} style={{ padding: '10px 20px', borderRadius: 9, background: 'var(--ink)', color: 'var(--bg)', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              Log ud
            </button>
          </div>
        </div>
      </div>
    )
  }

  const pendingCount = members.filter(m => m.status === 'pending').length

  // ═══════════════════════════════════════════════════
  return (
    <>
      {/* ── SIDEBAR ── */}
      <nav className="sidebar">
        <div className="sb-logo">
          <div className="sb-icon">🐺</div>
          <div><div className="sb-name">TypeSystems</div><div className="sb-sub">People Decision Intelligence</div></div>
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
          <div className={`sb-item${page === 'teams' || page === 'team-detail' || page === 'employee-profile' ? (page === 'teams' ? ' active' : '') : ''}`} onClick={showTeams}>
            <span className="sb-pip" /><span className="sb-ico">⬡</span>Teams
          </div>
          {teams.map(t => (
            <div key={t.id} className={`sb-job${currentTeamId === t.id && (page === 'team-detail' || page === 'employee-profile') ? ' active' : ''}`} onClick={() => openTeam(t.id)}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{t.name}</span>
              <span className="sb-job-count">{t.employees.filter(e => !e._loading && !e._error).length}</span>
            </div>
          ))}
          <div className={`sb-item${page === 'members' ? ' active' : ''}`} onClick={showMembers}>
            <span className="sb-pip" /><span className="sb-ico">👥</span>Medlemmer
            {pendingCount > 0 && <span className="sb-tag" style={{ background: 'var(--warn)', color: '#fff' }}>{pendingCount}</span>}
          </div>
          <div className="sb-item dim"><span className="sb-pip" /><span className="sb-ico">◈</span>De 8 Types<span className="sb-tag">Snart</span></div>
        </div>
        <div className="sb-bottom">
          <div className="sb-company">
            <div className="sb-ca">{(orgName[0] ?? 'O').toUpperCase()}</div>
            <div><div className="sb-cn">{orgName || 'Organisation'}</div><div className="sb-cp">{orgRole === 'owner' ? 'Ejer' : 'Medlem'}</div></div>
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
                    {/* Job typeprofil — bygges når ny teori er klar */}
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
                <div className="ji-block"><div className="ji-label">Afdeling</div><div className="ji-val">{teams.find(t => t.id === currentJob.team_id)?.name ?? '—'}</div></div>
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
                      {(r.mbti || r.enneagram) ? (
                        <span style={{ padding: '3px 9px', background: 'var(--ink)', color: 'var(--bg)', borderRadius: 5, fontSize: 11, fontWeight: 700, letterSpacing: '1px', fontFamily: 'monospace' }}>
                          {r.mbti}{r.enneagram ? ` ${r.enneagram}` : ''}
                        </span>
                      ) : <div />}
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

        {/* ── TEAMS OVERSIGT ── */}
        <div className={`page${page === 'teams' ? ' active' : ''}`} id="page-teams">
          <div className="jobs-wrap">
            {teams.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--m2)', fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>⬡</div>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, color: 'var(--m1)', marginBottom: 6 }}>Ingen teams endnu</div>
                <div>Opret et team for at komme i gang</div>
              </div>
            ) : (
              <div className="jobs-grid">
                {teams.map(t => (
                  <div key={t.id} className="job-card" onClick={() => openTeam(t.id)}>
                    <div className="jc-header">
                      <div className="jc-title">{t.name}</div>
                      {t.description && <div className="jc-dept">{t.description}</div>}
                    </div>
                    <div className="jc-body">
                      <div className="jc-meta-row">
                        <div className="jc-meta"><div className="jc-meta-label">Medarbejdere</div><div className="jc-meta-val">{t.employees.filter(e => !e._loading && !e._error).length}</div></div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {[...new Set(t.employees.filter(e => !e._loading && e.mbti).map(e => e.mbti))].slice(0, 6).map(m => (
                          <span key={m} style={{ padding: '2px 8px', background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 5, fontSize: 10, fontWeight: 600, letterSpacing: '.5px', color: 'var(--ink)' }}>{m}</span>
                        ))}
                      </div>
                    </div>
                    <div className="jc-footer">
                      <span style={{ fontSize: 11, color: 'var(--m2)' }}>Se team →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── TEAM DETALJE ── */}
        <div className={`page${page === 'team-detail' ? ' active' : ''}`} id="page-team-detail">
          {currentTeam && (
            <div className="jobs-wrap">
              {currentTeam.description && (
                <div style={{ marginBottom: 20, padding: '12px 16px', background: 'var(--s1)', borderRadius: 10, border: '1px solid var(--b1)', fontSize: 13, color: 'var(--m1)' }}>
                  {currentTeam.description}
                </div>
              )}

              {/* Team Balance Matrix — only shown when ≥2 profiled members */}
              {(() => {
                const validEmps = currentTeam.employees.filter(e => !e._loading && !e._error && e.mbti && e.mbti.length === 4)
                if (validEmps.length < 2) return null
                const dims = [
                  { left: 'I', right: 'E', leftLabel: 'Introvert', rightLabel: 'Ekstrovert', idx: 0 },
                  { left: 'N', right: 'S', leftLabel: 'Intuitiv', rightLabel: 'Sansende', idx: 1 },
                  { left: 'T', right: 'F', leftLabel: 'Tænkende', rightLabel: 'Følende', idx: 2 },
                  { left: 'J', right: 'P', leftLabel: 'Planlagt', rightLabel: 'Fleksibel', idx: 3 },
                ]
                return (
                  <div className="mbti-section">
                    <div className="mbti-section-title">Team Balance Matrix — {validEmps.length} profiler</div>
                    {dims.map(d => {
                      const leftCount = validEmps.filter(e => e.mbti[d.idx] === d.left).length
                      const rightCount = validEmps.filter(e => e.mbti[d.idx] === d.right).length
                      const total = leftCount + rightCount
                      const leftPct = total > 0 ? (leftCount / total) * 100 : 50
                      const rightPct = total > 0 ? (rightCount / total) * 100 : 50
                      const dominant = leftCount > rightCount ? d.leftLabel : rightCount > leftCount ? d.rightLabel : null
                      return (
                        <div key={d.left} className="mbti-trait-row">
                          <div className="mbti-trait-labels">
                            <span className="mbti-label-left">{d.left} — {d.leftLabel} ({leftCount})</span>
                            <span className="mbti-label-right">({rightCount}) {d.rightLabel} — {d.right}</span>
                          </div>
                          <div className="mbti-bar-wrap">
                            <div className="mbti-center-mark" />
                            <div className="mbti-half" style={{ justifyContent: 'flex-end' }}>
                              <div className="mbti-fill-left" style={{ width: `${leftPct}%` }} />
                            </div>
                            <div className="mbti-half">
                              <div className="mbti-fill-right" style={{ width: `${rightPct}%` }} />
                            </div>
                          </div>
                          <div className="mbti-counts">
                            <span style={{ color: leftCount > rightCount ? 'var(--m3)' : 'var(--m2)' }}>
                              {leftCount > rightCount ? '↑ Dominerer' : leftCount === rightCount ? '⇌ Ligevægt' : '↓ Underrep.'}
                            </span>
                            <span style={{ color: 'var(--m2)', fontStyle: dominant ? 'normal' : 'italic' }}>
                              {dominant ? `Team trækker mod ${dominant}` : 'Afbalanceret'}
                            </span>
                            <span style={{ color: rightCount > leftCount ? 'var(--m3)' : 'var(--m2)' }}>
                              {rightCount > leftCount ? '↑ Dominerer' : rightCount === leftCount ? '⇌ Ligevægt' : '↓ Underrep.'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

              {(() => {
                const leader = currentTeam.employees.find(e => e.role === 'leader')
                const members = currentTeam.employees.filter(e => e.role !== 'leader')
                return (
                  <>
                    {leader && (
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 10, fontWeight: 600 }}>
                          ★ Leder{leader.leadership_style ? ` — ${leader.leadership_style} stil` : ''}
                        </div>
                        <div style={{ background: 'var(--s1)', border: '2px solid var(--accent)', borderRadius: 14, padding: 4 }}>
                          <CandCard c={{ ...leader, jobId: leader.teamId }} onClick={() => openEmployeeProfile(leader.id)} />
                        </div>
                      </div>
                    )}
                    {members.length === 0 && !leader ? (
                      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--m2)', fontSize: 13 }}>
                        <div>Ingen medarbejdere endnu — tilføj den første eller en leder</div>
                      </div>
                    ) : members.length > 0 ? (
                      <>
                        {leader && (
                          <div style={{ fontSize: 11, color: 'var(--m1)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, fontWeight: 500 }}>
                            Medarbejdere ({members.length})
                          </div>
                        )}
                        <div className="jobs-grid">
                          {members.map(e => (
                            <CandCard key={e.id} c={{ ...e, jobId: e.teamId }} onClick={() => openEmployeeProfile(e.id)} />
                          ))}
                        </div>
                      </>
                    ) : null}
                  </>
                )
              })()}
            </div>
          )}
        </div>

        {/* ── MEDARBEJDER PROFIL ── */}
        <div className={`page${page === 'employee-profile' ? ' active' : ''}`} id="page-employee-profile">
          {currentEmployee && currentTeam && renderCandProfile({ ...currentEmployee, jobId: currentEmployee.teamId }, { id: currentTeam.id, title: currentTeam.name, dept: '', type: '', status: 'active', candidates: [] })}
        </div>

        {/* ── MEDLEMMER ── */}
        <div className={`page${page === 'members' ? ' active' : ''}`} id="page-members">
          <div className="jobs-wrap">
            {/* Org info card */}
            <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 14, padding: '22px 26px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--m2)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Organisation</div>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>{orgName}</div>
                </div>
                {orgRole === 'owner' && (
                  <div style={{ background: 'var(--s2)', borderRadius: 10, padding: '12px 16px', border: '1px solid var(--b1)' }}>
                    <div style={{ fontSize: 10, color: 'var(--m2)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Invitationskode</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 600, letterSpacing: '2px', color: 'var(--ink)' }}>{orgCode}</span>
                      <button onClick={() => { navigator.clipboard.writeText(orgCode); alert('Kopieret!') }} style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--ink)', color: 'var(--bg)', border: 'none', fontSize: 11, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Kopiér</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pending requests */}
            {members.filter(m => m.status === 'pending').length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>
                  Venter på godkendelse ({members.filter(m => m.status === 'pending').length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {members.filter(m => m.status === 'pending').map(m => (
                    <div key={m.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 10, padding: '14px 18px' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{m.email || '(uden email)'}</div>
                        <div style={{ fontSize: 11, color: 'var(--m2)', marginTop: 2 }}>Anmodet {new Date(m.created_at).toLocaleDateString('da-DK')}</div>
                      </div>
                      {orgRole === 'owner' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => memberAction(m.user_id, 'approve')} style={{ padding: '7px 14px', borderRadius: 7, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Godkend</button>
                          <button onClick={() => memberAction(m.user_id, 'deny')} style={{ padding: '7px 14px', borderRadius: 7, background: 'transparent', color: 'var(--danger)', border: '1px solid var(--b1)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Afvis</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active members */}
            <div>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>
                Aktive medlemmer ({members.filter(m => m.status === 'active').length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {members.filter(m => m.status === 'active').map(m => (
                  <div key={m.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 10, padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--s2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: 'var(--m1)' }}>
                        {(m.email?.[0] ?? '?').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
                          {m.email || '(uden email)'} {m.user_id === currentUserId && <span style={{ fontSize: 11, color: 'var(--m2)', fontWeight: 400 }}>(dig)</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--m2)', marginTop: 2, textTransform: 'capitalize' }}>{m.role === 'owner' ? 'Ejer' : 'Medlem'}</div>
                      </div>
                    </div>
                    {orgRole === 'owner' && m.user_id !== currentUserId && m.role !== 'owner' && (
                      <button onClick={() => { if (confirm(`Fjern ${m.email} fra organisationen?`)) memberAction(m.user_id, 'remove') }} style={{ padding: '6px 12px', borderRadius: 7, background: 'transparent', color: 'var(--danger)', border: '1px solid var(--b1)', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Fjern</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
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
            {/* Personlighedstype-felter fjernet — bygges når ny teori er klar */}
            <div className="modal-row">
              <div className="modal-field" style={{ gridColumn: '1/-1' }}>
                <div className="modal-label">Afdeling (hvilket team ansætter du til?) *</div>
                {teams.length === 0 ? (
                  <div style={{ padding: '12px 14px', borderRadius: 9, background: 'var(--s2)', border: '1px solid var(--b1)', fontSize: 13, color: 'var(--m1)' }}>
                    Du har endnu ikke oprettet nogen teams. Opret et team først under <strong>Teams</strong> i sidebaren.
                  </div>
                ) : (
                  <select
                    className="modal-select"
                    value={jobTeamId ?? ''}
                    onChange={e => { setJobTeamId(e.target.value ? Number(e.target.value) : null); setJobTeamErr(false) }}
                    style={jobTeamErr ? { borderColor: 'var(--danger)' } : {}}
                  >
                    <option value="">Vælg team</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                )}
              </div>
            </div>

            {/* Rolle-kontekst — bruges af AI til mere præcis vurdering */}
            <div style={{ marginTop: 8, padding: '14px 0 0', borderTop: '1px solid var(--b1)' }}>
              <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4, fontWeight: 600 }}>Rolle-kontekst (valgfri)</div>
              <div style={{ fontSize: 12, color: 'var(--m1)', marginBottom: 12 }}>Jo mere detaljeret, jo mere præcis bliver AI-analysen af kandidaterne.</div>
            </div>
            <div className="modal-row">
              <div className="modal-field" style={{ gridColumn: '1/-1' }}>
                <div className="modal-label">Rolle-beskrivelse</div>
                <textarea className="modal-textarea" rows={3} placeholder="Hvad laver personen i denne rolle? Hvad er ansvarsområderne?" value={jobDescription} onChange={e => setJobDescription(e.target.value)} />
              </div>
            </div>
            <div className="modal-row">
              <div className="modal-field" style={{ gridColumn: '1/-1' }}>
                <div className="modal-label">Nødvendige hard skills</div>
                <input className="modal-input" placeholder="fx Python, SQL, Salesforce, B2B-salg" value={jobHardSkills} onChange={e => setJobHardSkills(e.target.value)} />
              </div>
            </div>
            <div className="modal-row">
              <div className="modal-field" style={{ gridColumn: '1/-1' }}>
                <div className="modal-label">Succes-kriterier</div>
                <input className="modal-input" placeholder="fx 'Bygger kundebase fra 0 til 50 inden 12 mdr'" value={jobSuccessCriteria} onChange={e => setJobSuccessCriteria(e.target.value)} />
              </div>
            </div>
            <div className="modal-row">
              <div className="modal-field" style={{ gridColumn: '1/-1' }}>
                <div className="modal-label">Erfaringsniveau</div>
                <select className="modal-select" value={jobExperienceLevel} onChange={e => setJobExperienceLevel(e.target.value)}>
                  <option value="">Vælg niveau</option>
                  <option value="Junior">Junior (0-2 år)</option>
                  <option value="Mid">Mid (2-5 år)</option>
                  <option value="Senior">Senior (5+ år)</option>
                  <option value="Lead">Lead / Ledelse</option>
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

      {/* ── MODAL: OPRET TEAM ── */}
      <div className={`modal-backdrop${modalTeamOpen ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) setModalTeamOpen(false) }}>
        <div className="modal">
          <div className="modal-header">
            <div className="modal-title">Opret team</div>
            <div className="modal-close" onClick={() => setModalTeamOpen(false)}>✕</div>
          </div>
          <div className="modal-body">
            <div className="modal-field">
              <div className="modal-label">Teamnavn / Afdeling</div>
              <input
                className="modal-input" placeholder="fx Salg, Marketing, Udvikling"
                value={teamName} onChange={e => { setTeamName(e.target.value); setTeamNameErr(false) }}
                style={teamNameErr ? { borderColor: 'var(--danger)' } : {}}
              />
            </div>
            <div className="modal-field">
              <div className="modal-label">Beskrivelse (valgfrit)</div>
              <textarea className="modal-textarea" rows={3} placeholder="Hvad laver dette team?" value={teamDesc} onChange={e => setTeamDesc(e.target.value)} />
            </div>

            <div style={{ marginTop: 4, padding: '12px 14px', background: 'var(--s2)', border: '1px dashed var(--b1)', borderRadius: 9, fontSize: 12, color: 'var(--m1)', lineHeight: 1.5 }}>
              💡 Du kan tilføje en <strong>leder</strong> til teamet bagefter — fra team-siden. Lederens profil bruges automatisk som leder-kontekst når nye kandidater analyseres.
            </div>
          </div>
          {teamErr && <div style={{ padding: '8px 12px', background: 'var(--bd-bg)', color: 'var(--bd-text)', borderRadius: 8, fontSize: 12, margin: '0 20px 12px' }}>{teamErr}</div>}
          <div className="modal-footer">
            <button type="button" className="modal-btn modal-btn-ghost" onClick={() => setModalTeamOpen(false)}>Annuller</button>
            <button type="button" className="modal-btn modal-btn-create" onClick={createTeam}>Opret team →</button>
          </div>
        </div>
      </div>

      {/* ── MODAL: TILFØJ MEDARBEJDER / LEDER ── */}
      <div className={`modal-backdrop${modalEmpOpen ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) setModalEmpOpen(false) }}>
        <div className="modal">
          <div className="modal-header">
            <div className="modal-title">{empAsLeader ? 'Tilføj leder' : 'Tilføj medarbejder'}{currentTeam ? ` — ${currentTeam.name}` : ''}</div>
            <div className="modal-close" onClick={() => setModalEmpOpen(false)}>✕</div>
          </div>
          <div className="modal-body">
            {empAsLeader && (
              <div className="modal-field">
                <div className="modal-label">Lederstil *</div>
                <select className="modal-select" value={empLeadershipStyle} onChange={e => setEmpLeadershipStyle(e.target.value)}>
                  <option value="">Vælg stil</option>
                  <option value="Coaching">Coaching — vejleder og udvikler</option>
                  <option value="Demokratisk">Demokratisk — beslutninger sammen</option>
                  <option value="Autoritær">Autoritær — top-down, klar retning</option>
                  <option value="Laissez-faire">Laissez-faire — stor frihed</option>
                  <option value="Servant">Servant — støtter teamet</option>
                  <option value="Visionær">Visionær — sætter retning og inspirerer</option>
                </select>
                <div style={{ fontSize: 11, color: 'var(--m2)', marginTop: 4 }}>MBTI + Enneagram udledes automatisk fra CV'et</div>
              </div>
            )}
            <div className="modal-field">
              <div className="modal-label">{empAsLeader ? 'Lederens' : 'Medarbejderens'} navn (valgfrit)</div>
              <input className="modal-input" placeholder="Fornavn Efternavn" value={empName} onChange={e => setEmpName(e.target.value)} />
            </div>
            <div className="modal-field">
              <div className="modal-label">Upload CV</div>
              <div className="modal-upload" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setEmpFile(f) }}>
                <input type="file" accept=".pdf,.txt,.doc,.docx" onChange={e => { const f = e.target.files?.[0]; if (f) setEmpFile(f) }} />
                <div className="mu-icon">📄</div>
                <div className="mu-title">{empFile ? empFile.name : 'Klik eller træk fil hertil'}</div>
                <div className="mu-sub">{empFile ? `${(empFile.size / 1024).toFixed(0)} KB` : 'PDF, TXT eller DOCX'}</div>
              </div>
            </div>
            <div className="or-line">eller</div>
            <div className="modal-field">
              <div className="modal-label">Indsæt CV / profil som tekst</div>
              <textarea className="modal-textarea" rows={4} placeholder="Sæt CV-tekst ind her..." value={empText} onChange={e => setEmpText(e.target.value)} />
            </div>
            <div className="modal-field">
              <div className="modal-label">LinkedIn URL</div>
              <input className="modal-input" placeholder="https://linkedin.com/in/navn" value={empLinkedin} onChange={e => setEmpLinkedin(e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button className="modal-btn modal-btn-ghost" onClick={() => setModalEmpOpen(false)}>Annuller</button>
            <button className="modal-btn modal-btn-create" disabled={empSubmitting} onClick={submitEmpModal}>
              {empSubmitting ? 'Analyserer...' : 'Analysér og tilføj →'}
            </button>
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
