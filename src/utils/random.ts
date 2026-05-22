// Helpers til tilfældighed (bruges af mock-data og bar-generering)

export const rnd = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

export const shuffle = <T>(a: T[]) => [...a].sort(() => Math.random() - 0.5)
