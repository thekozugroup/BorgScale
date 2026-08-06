import { useEffect, useState } from 'react'
import { BASE_PATH } from '@/utils/basePath'

interface AboutPayload {
  name: string
  version: string
  source: string
  license: string
  license_url: string
}

/**
 * AGPL-3.0 §13 source-disclosure notice.
 *
 * A hosted instance must offer its source to everyone who interacts with it
 * over the network, which includes visitors who never sign in. This renders on
 * the authenticated shell and on the sign-in and auth-error screens alike.
 */
export function Footer() {
  const [info, setInfo] = useState<AboutPayload | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    // BASE_PATH-relative: a sub-path reverse-proxy deployment serves the API
    // under the prefix, and an absolute /api/about 404s there — which used to
    // make the whole notice disappear silently.
    fetch(`${BASE_PATH}/api/about`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setInfo(d))
      .catch(() => {})
    return () => controller.abort()
  }, [])

  // Never return null: the source link is a licence obligation, so it renders
  // even when /api/about is unreachable.
  const source = info?.source ?? 'https://github.com/thekozugroup/BorgScale'
  const licenseUrl = info?.license_url ?? 'https://www.gnu.org/licenses/agpl-3.0.html'
  const license = info?.license ?? 'AGPL-3.0'

  return (
    <footer className="border-t border-border px-3 py-2 text-center text-xs text-muted-foreground">
      {info ? `${info.name} v${info.version} · ` : null}
      <a
        className="underline-offset-2 hover:underline"
        href={source}
        target="_blank"
        rel="noreferrer"
      >
        Source (AGPL)
      </a>
      {' · '}
      <a
        className="underline-offset-2 hover:underline"
        href={licenseUrl}
        target="_blank"
        rel="noreferrer"
      >
        {license}
      </a>
    </footer>
  )
}
