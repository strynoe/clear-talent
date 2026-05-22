import type { Candidate } from '@/types'
import { scoreClass, vbarCls, vtxtCls } from '@/utils/scoring'
import { initials } from '@/utils/format'
import { BarRow } from './BarRow'

interface Props {
  c: Candidate
  onClick: () => void
}

/**
 * Kort der viser en kandidat (eller medarbejder repræsenteret som candidate).
 * Bruges i job-detalje, team-detalje og CV-resultatlisten.
 */
export function CandidateCard({ c, onClick }: Props) {
  if (c._loading) {
    return (
      <div className="cand-card" style={{ pointerEvents: 'none' }}>
        <div className="cc-header">
          <div className="cc-avatar" style={{ background: 'var(--s3)' }} />
          <div className="cc-nameblock" style={{ flex: 1, gap: 6, display: 'flex', flexDirection: 'column' }}>
            <div className="skel" style={{ width: '60%', height: 12 }} />
            <div className="skel" style={{ width: '80%', height: 9 }} />
          </div>
        </div>
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
        {(c.mbti || c.enneagram) ? (
          <span style={{
            padding: '3px 9px',
            background: 'var(--ink)',
            color: 'var(--bg)',
            borderRadius: 5,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '1px',
            fontFamily: 'monospace',
          }}>
            {c.mbti}{c.enneagram ? ` ${c.enneagram}` : ''}
          </span>
        ) : <span />}
        <div className="verdict-pill">
          <div className={`vbar ${vbarCls(c.verdict)}`} />
          <span className={vtxtCls(c.verdict)}>{c.verdict}</span>
        </div>
      </div>
    </div>
  )
}
