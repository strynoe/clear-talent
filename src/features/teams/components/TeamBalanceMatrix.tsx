import type { Employee } from '@/types'

interface Props {
  employees: Employee[]
}

const AXES = [
  { left: 'I', leftLabel: 'Indadvendt', right: 'E', rightLabel: 'Udadvendt', position: 0 },
  { left: 'N', leftLabel: 'Intuitiv',   right: 'S', rightLabel: 'Sansende',  position: 1 },
  { left: 'F', leftLabel: 'Følende',    right: 'T', rightLabel: 'Tænkende',  position: 2 },
  { left: 'P', leftLabel: 'Opfattende', right: 'J', rightLabel: 'Vurderende', position: 3 },
]

/**
 * Visuel oversigt over teamets MBTI-balance.
 * For hver af de 4 dichotomier vises hvor mange medlemmer der hører
 * til hver side. Hjælper HR med hurtigt at se hvor teamet er skævt
 * og hvilke perspektiver der mangler.
 */
export function TeamBalanceMatrix({ employees }: Props) {
  const withMbti = employees.filter(e => !e._loading && !e._error && e.mbti && e.mbti.length === 4)

  if (withMbti.length === 0) {
    return (
      <div className="cp-section">
        <div className="cp-section-title">Team-balance</div>
        <div className="tbm-empty">
          Tilføj medlemmer med fuld MBTI-profil for at se teamets balance her.
        </div>
      </div>
    )
  }

  // For hver akse, count hvor mange har bogstavet til venstre vs højre
  const axisData = AXES.map(axis => {
    const leftCount = withMbti.filter(e => e.mbti.toUpperCase()[axis.position] === axis.left).length
    const rightCount = withMbti.filter(e => e.mbti.toUpperCase()[axis.position] === axis.right).length
    const total = leftCount + rightCount
    return {
      ...axis,
      leftCount,
      rightCount,
      total,
      leftPct: total > 0 ? (leftCount / total) * 100 : 0,
      rightPct: total > 0 ? (rightCount / total) * 100 : 0,
    }
  })

  return (
    <div className="cp-section">
      <div className="cp-section-title">Team-balance — {withMbti.length} {withMbti.length === 1 ? 'profil' : 'profiler'}</div>
      <div className="tbm-grid">
        {axisData.map(a => (
          <div key={a.position} className="tbm-axis">
            <div className="tbm-axis-label">
              <span><span className="count">{a.leftCount}</span> {a.leftLabel}</span>
              <span>{a.rightLabel} <span className="count">{a.rightCount}</span></span>
            </div>
            <div className="tbm-axis-bar">
              {a.leftPct > 0 && <div className="left" style={{ width: `${a.leftPct}%` }} />}
              {a.rightPct > 0 && <div className="right" style={{ width: `${a.rightPct}%` }} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
