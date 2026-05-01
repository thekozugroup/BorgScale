import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { useTheme } from '../context/ThemeContext'

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

// EntityCard uses semantic accent only for hover box-shadow on the card.
// Stat and action colours now map to semantic tokens.
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
  accentColor: _accentColor,
  isHighlighted: _isHighlighted,
}: EntityCardProps) {
  const { effectiveMode } = useTheme()
  const isDark = effectiveMode === 'dark'

  const borderBase = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'
  const innerBg = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.018)'

  return (
    <div
      className="relative rounded-lg bg-background overflow-hidden max-w-full min-w-0 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        boxShadow: isDark
          ? `0 0 0 1px rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.25)`
          : `0 0 0 1px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.07)`,
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = isDark
          ? `0 0 0 1px rgba(255,255,255,0.12), 0 8px 24px rgba(0,0,0,0.3)`
          : `0 0 0 1px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.12)`
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = isDark
          ? `0 0 0 1px rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.25)`
          : `0 0 0 1px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.07)`
      }}
    >
      <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3.5 sm:pb-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate leading-tight">{title}</p>
            {subtitle && (
              <p className="text-[0.7rem] truncate leading-snug text-muted-foreground/60">
                {subtitle}
              </p>
            )}
          </div>
          {badge && <div className="flex-shrink-0">{badge}</div>}
        </div>

        {/* Stats grid */}
        <div
          className="grid rounded-md overflow-hidden mb-3 border"
          style={{
            gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)`,
            borderColor: borderBase,
            background: innerBg,
          }}
        >
          {stats.map((stat, i) => {
            const statColor = stat.color ? STAT_COLORS[stat.color] : undefined
            const isLast = i === stats.length - 1

            return (
              <Tooltip key={stat.label}>
                <TooltipTrigger asChild>
                  <div
                    className={cn('px-3 py-2.5', stat.tooltip ? 'cursor-help' : 'cursor-default')}
                    style={{
                      borderRight: isLast ? 'none' : `1px solid ${borderBase}`,
                    }}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <span className="flex items-center text-muted-foreground/60" style={statColor ? { color: statColor } : undefined}>
                        {stat.icon}
                      </span>
                      <span
                        className="text-[0.58rem] font-bold uppercase tracking-widest leading-none text-muted-foreground/60"
                        style={statColor ? { color: statColor } : undefined}
                      >
                        {stat.label}
                      </span>
                    </div>
                    <p className="text-[0.85rem] font-semibold truncate tabular-nums">{stat.value}</p>
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
                    <span className="text-[0.68rem] leading-none text-muted-foreground/60">
                      {m.label}:
                    </span>
                    <span className="text-[0.68rem] font-semibold text-muted-foreground leading-none">{m.value}</span>
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
          className="flex items-center gap-1 pt-3 border-t"
          style={{ borderColor: borderBase }}
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
                    className="h-7 px-2 sm:px-3 text-[0.78rem] gap-1 min-w-0"
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
