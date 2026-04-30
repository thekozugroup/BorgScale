import { useEffect, useState } from 'react'

interface AboutPayload {
  name: string
  version: string
  source: string
  license: string
  license_url: string
  upstream: string
}

export function Footer() {
  const [info, setInfo] = useState<AboutPayload | null>(null)
  useEffect(() => {
    let alive = true
    fetch('/api/about')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setInfo(d))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  if (!info) return null
  return (
    <footer
      style={{
        textAlign: 'center',
        padding: '8px 12px',
        fontSize: 12,
        opacity: 0.7,
        borderTop: '1px solid var(--border, rgba(0,0,0,0.08))',
      }}
    >
      {info.name} v{info.version} ·{' '}
      <a href={info.source} target="_blank" rel="noreferrer">Source (AGPL)</a>
      {' · '}
      <a href={info.license_url} target="_blank" rel="noreferrer">{info.license}</a>
    </footer>
  )
}
