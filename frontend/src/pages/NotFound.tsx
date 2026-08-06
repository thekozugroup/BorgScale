import { Link, useLocation } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

/**
 * Terminal route for any URL that matches no page.
 *
 * Without this the router renders nothing and the user is left on a blank
 * surface with no way back other than the browser's back button.
 */
export default function NotFound() {
  const { pathname } = useLocation()
  const { t } = useTranslation()

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-muted/40">
        <Compass className="size-6 text-muted-foreground" aria-hidden="true" />
      </div>

      <h1 className="mt-5 text-xl font-semibold text-foreground">
        {t('notFound.title', 'This page does not exist')}
      </h1>

      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {t('notFound.description', 'Nothing is served at')}{' '}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
          {pathname}
        </code>
        . {t('notFound.hint', 'The link may be outdated, or the page may have moved.')}
      </p>

      <Button asChild className="mt-6">
        <Link to="/dashboard">{t('notFound.action', 'Back to dashboard')}</Link>
      </Button>
    </div>
  )
}
