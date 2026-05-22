// Helpers til at oversætte score-tal til CSS-klasser og labels

export const scoreClass = (s: number) => (s >= 80 ? 's-ok' : s >= 60 ? 's-warn' : 's-bad')

export const verdictFromScore = (s: number) =>
  s >= 80 ? 'Anbefalet' : s >= 60 ? 'Forsigtighed' : 'Frarådet'

export const vbarCls = (v: string) =>
  v === 'Anbefalet' ? 'vbar-ok' : v === 'Forsigtighed' ? 'vbar-warn' : 'vbar-bad'

export const vtxtCls = (v: string) =>
  v === 'Anbefalet' ? 'vtxt-ok' : v === 'Forsigtighed' ? 'vtxt-warn' : 'vtxt-bad'

export const barCls = (v: number) =>
  v >= 75 ? 'bf-g' : v >= 55 ? 'bf-b' : v >= 38 ? 'bf-w' : 'bf-d'

export const valCls = (v: number) => (v < 38 ? 'v-bad' : v < 55 ? 'v-warn' : '')
