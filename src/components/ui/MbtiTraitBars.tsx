interface Props {
  mbti: string  // fx "ENTP" eller "INFJ"
}

const TRAITS = [
  { left: 'I', leftLabel: 'Indadvendt', right: 'E', rightLabel: 'Udadvendt' },
  { left: 'N', leftLabel: 'Intuitiv',   right: 'S', rightLabel: 'Sansende'  },
  { left: 'F', leftLabel: 'Følende',    right: 'T', rightLabel: 'Tænkende'  },
  { left: 'P', leftLabel: 'Opfattende', right: 'J', rightLabel: 'Vurderende' },
]

/**
 * Bidirectional MBTI dichotomy-visualisering.
 * Hvert af de 4 træk vises som en linje med en prik der peger mod
 * den side (venstre/højre) kandidatens MBTI-bogstav hører til.
 * Lavere score betyder ikke "dårligt" — det betyder bare hældning
 * mod den modsatte præference.
 */
export function MbtiTraitBars({ mbti }: Props) {
  if (!mbti || mbti.length !== 4) return null

  // MBTI er altid i rækkefølge: E/I, S/N, T/F, J/P
  // Vi mapper det til vores trait-array (som har samme rækkefølge med byttede sider)
  const letters = mbti.toUpperCase().split('')
  const dichotomies = [
    { letter: letters[0], pair: TRAITS[0] }, // E vs I
    { letter: letters[1], pair: TRAITS[1] }, // N vs S
    { letter: letters[2], pair: TRAITS[2] }, // F vs T
    { letter: letters[3], pair: TRAITS[3] }, // P vs J
  ]

  return (
    <div className="mbti-traits">
      {dichotomies.map((d, i) => {
        const isLeft = d.letter === d.pair.left
        // Prikken placeres ved 25% eller 75% — moderat hældning, ikke ekstrem
        const dotPosition = isLeft ? '25%' : '75%'
        // Fill bar dækker fra centrum til prik
        const fillWidth = '25%'
        return (
          <div key={i} className="mbti-trait">
            <div className="mbti-trait-labels">
              <span className={isLeft ? 'active' : ''}>{d.pair.leftLabel}</span>
              <span className={!isLeft ? 'active' : ''}>{d.pair.rightLabel}</span>
            </div>
            <div className="mbti-trait-bar">
              <div
                className={`mbti-trait-fill ${isLeft ? 'left' : 'right'}`}
                style={{ width: fillWidth } as React.CSSProperties}
              />
              <div className="mbti-trait-dot" style={{ left: dotPosition }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
