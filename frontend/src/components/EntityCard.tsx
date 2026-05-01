import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'

export interface StatItem {
  icon: ReactNode
  label: string
  value: string
  tooltip?: string
  color?: 'primary' | 'success' | 'warning' | 'info' | 'secondary'
}

export interface MetaItem {
  label: string
  value: string
  tooltip?: string
}

export interface ActionItem {
  icon: ReactNode
  tooltip: string
  onClick: () => void
  color?: 'default' | 'primary' | 'error' | 'warning' | 'success'
  sx?: object
  disabled?: boolean
  hidden?: boolean
}

export interface PrimaryAction {
  label: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
  color?: string
}

export interface EntityCardProps {
  title: string
  subtitle?: string
  badge?: ReactNode
  stats: StatItem[]
  meta?: MetaItem[]
  tags?: ReactNode
  actions: ActionItem[]
  primaryAction?: PrimaryAction
  accentColor?: string
  isHighlighted?: boolean
}

// Stat colours map to semantic tokens
const STAT_COLORS: Record<string, string> = {
  primary: 'hsl(var(--primary))',
  success: 'hsl(var(--primary))',
  warning: 'hsl(var(--muted-foreground))',
  info: 'hsl(var(--secondary-foreground))',
  secondary: 'hsl(var(--muted-foreground))',
}


export default function EntityCard({
  title,
  subtitle,
  badge,
  stats,
  meta,
  tags,
  actions,
  primaryAction,
}: EntityCardProps) {
  return (
    <div
      className="relative rounded-lg border border-border bg-card text-card-foreground overflow-hidden max-w-full min-w-0 transition-shadow duration-200 hover:shadow-md shadow-sm"
    >
      <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3.5 sm:pb-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate leading-tight">{title}</p>
            {subtitle && (
              <p className="text-xs truncate leading-snug text-muted-foreground/60">
                {subtitle}
              </p>
            )}
          </div>
          {badge && <div className="flex-shrink-0">{badge}</div>}
        </div>

        {/* Stats grid */}
        <div
          className="grid rounded-md overflow-hidden mb-3 border border-border bg-muted/30"
          style={{
            gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)`,
          }}
        >
          {stats.map((stat, i) => {
            const statColor = stat.color ? STAT_COLORS[stat.color] : undefined
            const isLast = i === stats.length - 1

            return (
              <Tooltip key={stat.label}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'px-3 py-2.5',
                      stat.tooltip ? 'cursor-help' : 'cursor-default',
                      !isLast && 'border-r border-border'
                    )}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <span className="flex items-center text-muted-foreground/60" style={statColor ? { color: statColor } : undefined}>
                        {stat.icon}
                      </span>
                      <span
                        className="text-3xs font-bold uppercase tracking-widest leading-none text-muted-foreground/60"
                        style={statColor ? { color: statColor } : undefined}
                      >
                        {stat.label}
                      </span>
                    </div>
                    <p className="text-sm font-semibold truncate tabular-nums">{stat.value}</p>
                  </div>
                </TooltipTrigger>
                {stat.tooltip && <TooltipContent>{stat.tooltip}</TooltipContent>}
              </Tooltip>
            )
          })}
        </div>

        {/* Meta */}
        {meta && meta.length > 0 && (
          <div className="flex flex-wrap gap-3 sm:gap-4 mb-3 px-0.5">
            {meta.map((m) => (
              <Tooltip key={m.label}>
                <TooltipTrigger asChild>
                  <div
                    className={cn('flex items-center gap-1', m.tooltip ? 'cursor-help' : '')}
                  >
                    <span className="text-2xs leading-none text-muted-foreground/60">
                      {m.label}:
                    </span>
                    <span className="text-2xs font-semibold text-muted-foreground leading-none">{m.value}</span>
                  </div>
                </TooltipTrigger>
                {m.tooltip && <TooltipContent>{m.tooltip}</TooltipContent>}
              </Tooltip>
            ))}
          </div>
        )}

        {/* Tags */}
        {tags && <div className="mb-3">{tags}</div>}

        {/* Footer actions */}
        <div
          className="flex items-center gap-1 pt-3 border-t border-border"
        >
          <div className="flex items-center gap-0.5">
            {actions
              .filter((a) => !a.hidden)
              .map((action, i) => {
                return (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <button
                        aria-label={action.tooltip}
                        onClick={action.onClick}
                        disabled={action.disabled}
                        className={cn(
                          'w-8 h-8 rounded-md flex items-center justify-center transition-colors',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                      >
                        {action.icon}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{action.tooltip}</TooltipContent>
                  </Tooltip>
                )
              })}
          </div>

          {primaryAction && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="ml-auto">
                  <Button
                    size="sm"
                    onClick={primaryAction.onClick}
                    disabled={primaryAction.disabled}
                    className="h-7 px-2 sm:px-3 text-xs gap-1 min-w-0"
                  >
                    <span className="flex-shrink-0">{primaryAction.icon}</span>
                    <span className="hidden sm:inline">{primaryAction.label}</span>
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>{primaryAction.label}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  )
}
