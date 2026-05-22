import type { Bar } from '@/types'
import { barCls, valCls } from '@/utils/scoring'

interface Props {
  bar: Bar
  prefix: 'cc' | 'cp'
}

/**
 * Render én række i adfærdsprofil-grafikken. Bruges både på kandidat-kort
 * (prefix='cc') og på kandidatprofil-siden (prefix='cp').
 */
export function BarRow({ bar, prefix }: Props) {
  const cls = prefix === 'cc'
    ? { row: 'cc-bar-row', meta: 'cc-bar-meta', lbl: 'cc-bar-label', val: 'cc-bar-val', track: 'bar-track', fill: 'bar-fill' }
    : { row: 'cp-bar-row', meta: 'cp-bar-meta', lbl: 'cp-bar-label', val: 'cp-bar-val', track: 'cp-bar-track', fill: 'cp-bar-fill' }

  return (
    <div className={cls.row}>
      <div className={cls.meta}>
        <span className={cls.lbl}>{bar.l}</span>
        <span className={`${cls.val} ${valCls(bar.v)}`}>{bar.v}%</span>
      </div>
      <div className={cls.track}>
        <div
          className={`${cls.fill} ${barCls(bar.v)}`}
          style={{ '--w': `${bar.v}%` } as React.CSSProperties}
        />
      </div>
    </div>
  )
}
