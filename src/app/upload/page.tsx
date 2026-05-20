'use client'

import { useState } from 'react'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [detail, setDetail] = useState('')

  async function handleUpload() {
    if (!file) return

    setStatus('uploading')
    setMessage('')
    setDetail('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const text = await res.text()
      let data: Record<string, string> = {}
      try { data = text ? JSON.parse(text) : {} } catch { data = { error: text } }

      if (!res.ok) {
        setStatus('error')
        setMessage(data.error ?? `HTTP ${res.status}`)
        const parts = [data.statusCode, data.details].filter(Boolean)
        if (parts.length) setDetail(parts.join(' — '))
      } else {
        setStatus('success')
        setMessage(`${file.name} blev uploadet.`)
        setFile(null)
      }
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Netværksfejl')
    }
  }

  return (
    <main className="min-h-screen bg-[#f0ede6] flex items-center justify-center p-6">
      <div className="bg-[#e8e4dc] border border-[#ccc8bc] rounded-2xl p-8 w-full max-w-md">
        <h1 className="font-serif text-2xl font-bold text-[#1a1916] mb-1">Upload CV</h1>
        <p className="text-sm text-[#7a7570] mb-6">PDF, DOCX eller TXT</p>

        <label className="block w-full border-2 border-dashed border-[#bab5a8] rounded-xl p-8 text-center cursor-pointer hover:border-[#2a6b4a] transition-colors">
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <span className="text-sm font-medium text-[#1a1916]">{file.name}</span>
          ) : (
            <span className="text-sm text-[#9a9590]">Klik for at vælge fil</span>
          )}
        </label>

        <button
          onClick={handleUpload}
          disabled={!file || status === 'uploading'}
          className="mt-4 w-full py-3 bg-[#1a1916] text-[#f0ede6] rounded-xl text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {status === 'uploading' ? 'Uploader...' : 'Upload'}
        </button>

        {message && (
          <div className={`mt-4 rounded-xl p-3 text-sm ${status === 'error' ? 'bg-[#f0d0d0] text-[#701820]' : 'bg-[#d0ecd8] text-[#1a4a2e]'}`}>
            <p className="font-medium">{message}</p>
            {detail && <p className="mt-1 opacity-75 font-mono text-xs break-all">{detail}</p>}
          </div>
        )}
      </div>
    </main>
  )
}
