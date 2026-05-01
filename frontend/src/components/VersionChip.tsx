import { useTheme } from '../context/ThemeContext'

interface VersionChipProps {
  label: string
  version: string
  accent?: boolean
}

export default function VersionChip({ label, version, accent = false }: VersionChipProps) {
  const { effectiveMode } = useTheme()
  const isDark = effectiveMode === 'dark'

  return (
    <span
      className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded"
      style={{
        background: accent
          ? isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)'
          : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        border: `1px solid ${accent
          ? isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.25)'
          : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
      }}
    >
      <span
        style={{
          fontSize: '0.6rem',
          fontWeight: 700,
          color: accent ? 'rgb(99,102,241)' : isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
          letterSpacing: '0.04em',
          lineHeight: 1,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '0.6rem',
          fontWeight: 500,
          fontFamily: 'monospace',
          lineHeight: 1,
          color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
        }}
      >
        {version}
      </span>
    </span>
  )
}
