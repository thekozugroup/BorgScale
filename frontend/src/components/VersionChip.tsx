interface VersionChipProps {
  label: string
  version: string
  accent?: boolean
}

export default function VersionChip({ label, version, accent = false }: VersionChipProps) {
  return (
    <span
      className={
        accent
          ? 'inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-primary/10 border border-primary/25'
          : 'inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-muted border border-border'
      }
    >
      <span
        className={
          accent
            ? 'text-primary'
            : 'text-muted-foreground'
        }
        style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.04em', lineHeight: 1 }}
      >
        {label}
      </span>
      <span
        className="font-mono leading-none font-medium text-2xs text-muted-foreground"
      >
        {version}
      </span>
    </span>
  )
}
