import { ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { useTabEnablement, useAppState } from '../context/AppContext'
import { useTranslation } from 'react-i18next'
import { Database } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProtectedRouteProps {
  children: ReactElement
  requiredTab:
    | 'dashboard'
    | 'sshKeys'
    | 'connections'
    | 'repositories'
    | 'backups'
    | 'archives'
    | 'restore'
    | 'schedule'
    | 'settings'
}

function RouteGate({ reason }: { reason: string }) {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-screen-xl">
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <div className="rounded-full bg-muted p-4">
          <Database size={32} className="text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          {t('protectedRoute.gateTitle', 'Feature unavailable')}
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm">{reason}</p>
        <Button asChild variant="default" size="sm">
          <Link to="/repositories">
            {t('protectedRoute.createRepositoryCTA', 'Add a repository')}
          </Link>
        </Button>
      </div>
    </div>
  )
}

export default function ProtectedRoute({ children, requiredTab }: ProtectedRouteProps) {
  const { tabEnablement, getTabDisabledReason } = useTabEnablement()
  const appState = useAppState()
  const isEnabled = tabEnablement[requiredTab]

  // While app state is still loading, render nothing (avoids flash)
  if (appState.isLoading) {
    return null
  }

  if (!isEnabled) {
    const reason = getTabDisabledReason(requiredTab) ?? 'Please create a repository first'
    return <RouteGate reason={reason} />
  }

  return children
}
