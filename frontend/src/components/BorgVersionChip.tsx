import { Badge } from '@/components/ui/badge'

interface BorgVersionChipProps {
  borgVersion: number | undefined
  /** Use compact sizing for dense contexts like dropdown menus */
  compact?: boolean
}

export default function BorgVersionChip({ borgVersion, compact = false }: BorgVersionChipProps) {
  if (borgVersion !== 2) return null

  return (
    <Badge
      className="font-mono font-bold bg-primary text-primary-foreground border-transparent"
      style={{
        height: compact ? '16px' : '18px',
        fontSize: compact ? '0.6rem' : '0.65rem',
        letterSpacing: '0.5px',
        paddingLeft: compact ? '3px' : '6px',
        paddingRight: compact ? '3px' : '6px',
      }}
    >
      v2
    </Badge>
  )
}
