import { Database } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import BorgVersionChip from './BorgVersionChip'

interface RepoMenuItemProps {
  name: string
  path: string
  borgVersion?: number
  mode?: 'full' | 'observe'
  hasRunningMaintenance?: boolean
  maintenanceLabel?: string
  /** Hide the monospace path line (e.g. compact filter dropdowns) */
  hidePath?: boolean
}

export default function RepoMenuItem({
  name,
  path,
  borgVersion,
  mode,
  hasRunningMaintenance,
  maintenanceLabel = 'maintenance running',
  hidePath = false,
}: RepoMenuItemProps) {
  return (
    <div className="flex flex-row gap-2 items-center min-w-0 overflow-hidden">
      <Database size={16} className="flex-shrink-0" />
      <div className="min-w-0 overflow-hidden">
        <div className="flex flex-row gap-1.5 items-center">
          <span className="text-sm font-medium">{name}</span>
          <BorgVersionChip borgVersion={borgVersion} compact />
          {mode === 'observe' && (
            <Badge
              variant="secondary"
              className="h-4 text-2xs font-semibold px-1 border-none"
            >
              Observe Only
            </Badge>
          )}
          {hasRunningMaintenance && (
            <span className="text-xs text-muted-foreground">{maintenanceLabel}</span>
          )}
        </div>
        {!hidePath && (
          <p
            className="text-xs text-muted-foreground truncate font-mono"
          >
            {path}
          </p>
        )}
      </div>
    </div>
  )
}
