// Delte typer på tværs af hele applikationen

export interface Bar { l: string; v: number }
export interface Flag { severity: 'red' | 'warn' | 'ok'; text: string }

export interface Typology {
  mbti: string
  enneagram: string
  typology_summary: string
  detailed_explanation: string
  typology_strengths: string[]
  typology_weaknesses: string[]
  collab_strengths: string[]
  collab_risks: string[]
  role_fit_score?: number
  role_fit_reasoning?: string
  leader_fit?: string
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
  interview_questions: string[]
  strengths: string[]
  risks: string[]
  jobId: number
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
  interview_questions: string[]
  strengths: string[]
  risks: string[]
  teamId: number
  role: 'member' | 'leader'
  leadership_style: string
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
