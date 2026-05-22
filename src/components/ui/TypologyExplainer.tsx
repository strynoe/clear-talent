'use client'

import { useState } from 'react'

interface Props {
  text: string
}

/**
 * Expandable boks der viser den dybe MBTI + Enneagram-forklaring.
 * Default er den foldet sammen for ikke at overvælde læseren.
 */
export function TypologyExplainer({ text }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{
      marginTop: 14,
      border: '1px solid var(--b1)',
      borderRadius: 10,
      overflow: 'hidden',
      background: 'var(--s2)',
    }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          padding: '11px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--m1)',
          textTransform: 'uppercase',
          letterSpacing: '.8px',
        }}
      >
        <span>{open ? 'Skjul' : 'Vis'} detaljeret forklaring</span>
        <span style={{
          fontSize: 14,
          transition: 'transform .2s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--b1)' }}>
          <p style={{
            margin: '14px 0 0',
            fontSize: 13,
            color: 'var(--ink)',
            lineHeight: 1.75,
            fontWeight: 300,
          }}>{text}</p>
        </div>
      )}
    </div>
  )
}
