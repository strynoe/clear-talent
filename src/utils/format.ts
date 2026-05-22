// Generelle helpers til at formatere data

export const initials = (name: string) =>
  name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase()

export const nameFromUrl = (url: string) => {
  const m = url.match(/linkedin\.com\/in\/([^/?]+)/)
  return m ? m[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'LinkedIn Kandidat'
}

export function readFileText(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = e => res(e.target!.result as string)
    r.onerror = () => rej(new Error('Kunne ikke læse filen'))
    r.readAsText(file)
  })
}
