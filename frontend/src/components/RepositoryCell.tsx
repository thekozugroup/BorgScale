import React from 'react'
import { HardDrive } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface RepositoryCellProps {
  repositoryName?: string | null
  repositoryPath?: string | null
  withIcon?: boolean
}

/**
 * Standardized repository display component used across Activity, Schedule, and Dashboard views
 * Shows friendly repository name (from DB) + full path below in monospace (truncated with tooltip)
 */
export const RepositoryCell: React.FC<RepositoryCellProps> = ({
  repositoryName,
  repositoryPath,
  withIcon = true,
}) => {
  const { t } = useTranslation()
  const displayName = repositoryName || repositoryPath || t('common.unknown')
  const displayPath = repositoryPath || ''

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex flex-row gap-2 items-start text-muted-foreground cursor-default">
          {withIcon && <HardDrive size={16} className="flex-shrink-0 mt-0.5" />}
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
            {repositoryPath && (
              <p className="text-xs text-muted-foreground font-mono truncate">{displayPath}</p>
            )}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>{displayPath || t('repositoryCell.noPath')}</TooltipContent>
    </Tooltip>
  )
}

export default RepositoryCell
