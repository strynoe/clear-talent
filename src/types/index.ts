// Delte typer på tværs af hele applikationen

export interface Bar { l: string; v: number }

export interface Flag {
  severity: 'red' | 'warn' | 'ok'
  text: string
  action?: string
}

export interface InterviewQuestion {
  question: string
  probes: string
}

export interface DataSources {
  cv: boolean
  ansoegning: boolean
  linkedin: boolean
  spoergeskema: boolean
}

export interface WorkHistoryItem {
  arbejdsgiver: string
  rolle: string
  start: string
  slut: string
  dato_usikker: boolean
  relevans: 'direkte' | 'indirekte'
  resultater?: string | null
  noter?: string | null
  reference?: string | null
}

export interface CvGap {
  fra: string
  til: string
  laengde: string
}

export interface BehaviorBars {
  'Analytisk tænkning': number
  'Beslutningsevne': number
  'Struktur': number
  'Initiativ': number
  'Samarbejde': number
  'Tilpasningsevne': number
}

export interface Typology {
  mbti: string
  enneagram: string
  // Backward compat fields (still stored in DB, may be empty for new records)
  typology_summary: string
  detailed_explanation: string
  typology_strengths: string[]
  typology_weaknesses: string[]
  collab_strengths: string[]
  collab_risks: string[]
  role_fit_score?: number
  role_fit_reasoning?: string
  leader_fit?: string
  // Råmateriale indsendt af kandidat/medarbejder (via invite-link)
  cv_text?: string
  application_text?: string
  linkedin_url?: string
  cv_was_pdf?: boolean
}

export interface Candidate extends Typology {
  id: number
  name: string
  score: number
  grad: string
  bars: Bar[]
  verdict: string
  headline: string
  summary: string
  personal_bio: string
  flags: Flag[]
  interview_questions: Array<InterviewQuestion | string>
  strengths: string[]
  risks: string[]
  jobId: number
  // Nye felter (DEL 3) — kræver DB-migration for persistens
  confidence?: 'lav' | 'middel' | 'høj'
  confidence_reason?: string
  overall_score?: number
  overall_reason?: string
  bottom_line?: string
  role_needs?: string[]
  candidate_brings?: string[]
  role_fit_summary?: string
  team_contributions?: string[]
  team_risks?: string[]
  personality_plain?: string
  behavior_bars?: BehaviorBars
  data_sources?: DataSources
  candidate_summary?: string
  work_history?: WorkHistoryItem[]
  cv_gaps?: CvGap[]
  _loading?: boolean
  _error?: string
}

export interface Job {
  id: number
  title: string
  dept: string
  type: string
  status: 'active' | 'paused'
  candidates: Candidate[]
  team_id?: number | null
  description?: string
  hard_skills?: string
  success_criteria?: string
  experience_level?: string
}

export interface Employee extends Typology {
  id: number
  name: string
  score: number
  grad: string
  bars: Bar[]
  verdict: string
  headline: string
  summary: string
  personal_bio: string
  flags: Flag[]
  interview_questions: Array<InterviewQuestion | string>
  strengths: string[]
  risks: string[]
  teamId: number
  role: 'member' | 'leader'
  leadership_style: string
  // Nye felter (DEL 3) — kræver DB-migration for persistens
  confidence?: 'lav' | 'middel' | 'høj'
  confidence_reason?: string
  overall_score?: number
  overall_reason?: string
  bottom_line?: string
  role_needs?: string[]
  candidate_brings?: string[]
  role_fit_summary?: string
  team_contributions?: string[]
  team_risks?: string[]
  personality_plain?: string
  behavior_bars?: BehaviorBars
  data_sources?: DataSources
  candidate_summary?: string
  work_history?: WorkHistoryItem[]
  cv_gaps?: CvGap[]
  _loading?: boolean
  _error?: string
}

export interface Team {
  id: number
  name: string
  description: string
  employees: Employee[]
}

export interface Recommendation {
  reasoning: string
  gap_analysis: string
  team_strengths?: string
  interview_focus?: string[]
}

export interface QueueItem {
  id: number
  type: 'file' | 'linkedin' | 'text'
  name: string
  file?: File
  content?: string
}

export interface Member {
  user_id: string
  email: string
  role: 'owner' | 'member'
  status: 'pending' | 'active'
  created_at: string
}

export type Page =
  | 'dashboard'
  | 'jobs'
  | 'job-detail'
  | 'cv'
  | 'cand-profile'
  | 'teams'
  | 'team-detail'
  | 'employee-profile'
  | 'members'
