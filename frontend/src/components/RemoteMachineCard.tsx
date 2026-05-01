import { useTranslation } from 'react-i18next'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit,
  Trash2,
  RefreshCw,
  HardDrive,
  Network,
  Key,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTheme } from '../context/ThemeContext'

interface StorageInfo {
  total: number
  total_formatted: string
  used: number
  used_formatted: string
  available: number
  available_formatted: string
  percent_used: number
  last_check?: string | null
}

interface RemoteMachine {
  id: number
  ssh_key_id: number
  ssh_key_name: string
  host: string
  username: string
  port: number
  use_sftp_mode: boolean
  use_sudo: boolean
  default_path?: string
  mount_point?: string
  status: string
  last_test?: string
  last_success?: string
  error_message?: string
  storage?: StorageInfo | null
  created_at: string
}

interface RemoteMachineCardProps {
  machine: RemoteMachine
  onEdit: (machine: RemoteMachine) => void
  onDelete: (machine: RemoteMachine) => void
  onRefreshStorage: (machine: RemoteMachine) => void
  onTestConnection: (machine: RemoteMachine) => void
  onDeployKey: (machine: RemoteMachine) => void
  canManageConnections?: boolean
}

const STATUS_ACCENT: Record<string, string> = {
  connected: '#059669',
  failed: '#ef4444',
  testing: '#f59e0b',
}

const getStatusAccent = (status: string) => STATUS_ACCENT[status] ?? '#6b7280'

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'connected':
      return <CheckCircle size={13} />
    case 'failed':
      return <XCircle size={13} />
    default:
      return <AlertTriangle size={13} />
  }
}

const getStorageBarColor = (pct: number): string => {
  if (pct > 90) return '#ef4444'
  if (pct > 75) return '#f59e0b'
  return '#22c55e'
}

export default function RemoteMachineCard({
  machine,
  onEdit,
  onDelete,
  onRefreshStorage,
  onTestConnection,
  onDeployKey,
  canManageConnections = true,
}: RemoteMachineCardProps) {
  const { t } = useTranslation()
  const { effectiveMode } = useTheme()
  const isDark = effectiveMode === 'dark'
  const accent = getStatusAccent(machine.status)

  const borderColorSoft = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'

  const iconBtnBase =
    'flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-lg transition-colors duration-150 text-muted-foreground hover:text-foreground'

  const hasMeta =
    machine.default_path || (machine.mount_point && machine.mount_point !== machine.host)

  return (
    <div
      className="w-full flex flex-col rounded-2xl bg-background transition-all duration-200"
      style={{
        boxShadow: isDark
          ? `0 0 0 1px rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.25)`
          : `0 0 0 1px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.07)`,
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = isDark
          ? `0 0 0 1px ${accent}66, 0 8px 24px rgba(0,0,0,0.3), 0 2px 8px ${accent}1a`
          : `0 0 0 1px ${accent}4d, 0 8px 24px rgba(0,0,0,0.12), 0 2px 8px ${accent}14`
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.transform = ''
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = isDark
          ? `0 0 0 1px rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.25)`
          : `0 0 0 1px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.07)`
      }}
    >
      <div className="flex-1 flex flex-col px-4 sm:px-5 pt-4 sm:pt-5 pb-3.5 sm:pb-4">

        {/* ── Header ── */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <span style={{ color: accent, display: 'flex', alignItems: 'center' }}>
                {getStatusIcon(machine.status)}
              </span>
              <span
                className="text-[0.6rem] font-bold uppercase tracking-[0.08em] leading-none"
                style={{ color: `${accent}e6` }}
              >
                {machine.status}
              </span>
            </div>
            <span className="text-[0.58rem] font-medium text-muted-foreground flex-shrink-0">
              {machine.ssh_key_name}
            </span>
          </div>

          <p
            className="font-bold text-base leading-tight truncate mb-0.5"
            title={machine.mount_point || machine.host}
          >
            {machine.mount_point || machine.host}
          </p>

          <p
            className="text-[0.7rem] text-muted-foreground truncate"
            style={{ fontFamily: '"JetBrains Mono","Fira Code",ui-monospace,monospace' }}
            title={`${machine.username}@${machine.host}:${machine.port}`}
          >
            {machine.username}@{machine.host}:{machine.port}
          </p>
        </div>

        {/* ── Storage Stats Band ── */}
        {machine.storage ? (
          <div
            className="rounded-xl overflow-hidden mb-3"
            style={{
              border: `1px solid ${borderColorSoft}`,
              background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.018)',
            }}
          >
            {/* Two-column stats */}
            <div className="grid grid-cols-2">
              {[
                { label: t('remoteMachine.used'), value: machine.storage.used_formatted, color: '#f59e0b' },
                { label: t('remoteMachine.free'), value: machine.storage.available_formatted, color: '#22c55e' },
              ].map((col, i) => (
                <div
                  key={col.label}
                  className="px-4 sm:px-5 py-3 sm:py-2.5 min-w-0"
                  style={{ borderRight: i === 0 ? `1px solid ${borderColorSoft}` : 'none' }}
                >
                  <p
                    className="text-[0.6rem] font-bold uppercase tracking-[0.06em] leading-none mb-1 truncate"
                    style={{ color: `${col.color}bf` }}
                  >
                    {col.label}
                  </p>
                  <p className="text-sm sm:text-[0.85rem] font-semibold tabular-nums leading-tight truncate">
                    {col.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Usage bar */}
            <div
              className="px-4 sm:px-5 pb-2.5 pt-1.5 border-t"
              style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[0.58rem] text-muted-foreground leading-none">
                  {machine.storage.percent_used.toFixed(1)}% used
                </span>
                <span className="text-[0.58rem] text-muted-foreground leading-none tabular-nums">
                  {machine.storage.total_formatted} total
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, machine.storage.percent_used)}%`,
                    background: getStorageBarColor(machine.storage.percent_used),
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div
            className="flex items-center gap-2 px-3 py-2.5 mb-3 rounded-xl"
            style={{
              border: `1px solid ${borderColorSoft}`,
              background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.018)',
            }}
          >
            <HardDrive size={14} className="opacity-40 flex-shrink-0" />
            <span className="text-sm text-muted-foreground flex-1 truncate">
              {t('remoteMachine.noStorageInfo')}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={t('remoteMachine.refreshStorage')}
                  onClick={() => onRefreshStorage(machine)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent>{t('remoteMachine.refreshStorage')}</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* ── Secondary Metadata ── */}
        {hasMeta && (
          <div className="flex flex-col gap-1 mb-3 px-0.5">
            {machine.default_path && (
              <div className="flex items-baseline gap-1 min-w-0">
                <span className="text-[0.68rem] text-muted-foreground leading-none flex-shrink-0">
                  {t('remoteMachine.defaultPath')}:
                </span>
                <span
                  className="text-[0.68rem] font-semibold text-foreground truncate min-w-0"
                  style={{ fontFamily: 'monospace' }}
                >
                  {machine.default_path}
                </span>
              </div>
            )}
            {machine.mount_point && machine.mount_point !== machine.host && (
              <div className="flex items-baseline gap-1 min-w-0">
                <span className="text-[0.68rem] text-muted-foreground leading-none flex-shrink-0">
                  {t('remoteMachineCard.mountPoint')}:
                </span>
                <span
                  className="text-[0.68rem] font-semibold text-primary truncate min-w-0"
                  style={{ fontFamily: 'monospace' }}
                >
                  {machine.mount_point}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Error Message ── */}
        {machine.error_message && (
          <div
            className="mb-3 px-3 py-2.5 rounded-xl border"
            style={{
              background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)',
              borderColor: 'rgba(239,68,68,0.25)',
            }}
          >
            <p className="text-[0.7rem] text-destructive break-words leading-snug">
              {machine.error_message}
            </p>
          </div>
        )}

        {/* ── Action Bar ── */}
        <div
          className="mt-auto flex items-center gap-2 sm:gap-1.5 pt-3 sm:pt-2.5 border-t"
          style={{ borderColor: borderColorSoft }}
        >
          {/* Left cluster */}
          <div className="flex items-center gap-1 sm:gap-0.5 flex-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={t('remoteMachine.actions.testConnection')}
                  onClick={() => onTestConnection(machine)}
                  className={`${iconBtnBase} text-blue-500/60 hover:text-blue-500 hover:bg-blue-500/10`}
                >
                  <Network size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>{t('remoteMachine.actions.testConnection')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={t('remoteMachine.actions.refreshStorage')}
                  onClick={() => onRefreshStorage(machine)}
                  className={`${iconBtnBase} text-cyan-500/60 hover:text-cyan-500 hover:bg-cyan-500/10`}
                >
                  <RefreshCw size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>{t('remoteMachine.actions.refreshStorage')}</TooltipContent>
            </Tooltip>
            {canManageConnections && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={t('remoteMachineCard.actions.deploy')}
                    onClick={() => onDeployKey(machine)}
                    className={`${iconBtnBase} text-green-500/60 hover:text-green-500 hover:bg-green-500/10`}
                  >
                    <Key size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{t('remoteMachineCard.actions.deploy')}</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Right cluster — edit / delete */}
          {canManageConnections && (
            <div className="flex items-center gap-1 sm:gap-0.5">
              <div
                className="w-px h-4.5 flex-shrink-0 mx-0.5"
                style={{ background: borderColorSoft, height: 18 }}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={t('remoteMachineCard.actions.edit')}
                    onClick={() => onEdit(machine)}
                    className={iconBtnBase}
                  >
                    <Edit size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{t('remoteMachineCard.actions.edit')}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={t('remoteMachineCard.actions.delete')}
                    onClick={() => onDelete(machine)}
                    className={`${iconBtnBase} text-destructive/60 hover:text-destructive hover:bg-destructive/10`}
                  >
                    <Trash2 size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{t('remoteMachineCard.actions.delete')}</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
