import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ── Hoisted pagination bar ─────────────────────────────────────────────────
// Must live outside DataTable to avoid react-hooks/static-components lint error.
interface PaginationBarProps {
  page: number
  rowsPerPage: number
  dataLength: number
  totalPages: number
  rowsPerPageOptions: number[]
  onPageChange: (updater: (p: number) => number) => void
  onRowsPerPageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
}

export function PaginationBar({
  page,
  rowsPerPage,
  dataLength,
  totalPages,
  rowsPerPageOptions,
  onPageChange,
  onRowsPerPageChange,
}: PaginationBarProps) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between px-3 py-2 border-t border-border text-sm text-muted-foreground flex-wrap gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs">{t('dataTable.rowsPerPage')}</span>
        <select
          className="text-xs bg-background border border-border rounded px-1 py-0.5 focus:outline-none"
          value={rowsPerPage}
          onChange={onRowsPerPageChange}
        >
          {rowsPerPageOptions.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs">
          {page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, dataLength)} of {dataLength}
        </span>
        <button
          className="w-7 h-7 rounded flex items-center justify-center hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          disabled={page === 0}
          onClick={() => onPageChange((p) => p - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          className="w-7 h-7 rounded flex items-center justify-center hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange((p) => p + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

export interface Column<T> {
  id: string
  label: string
  align?: 'left' | 'right' | 'center'
  width?: string
  minWidth?: string
  fontWeight?: number
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  /** Span both columns in the mobile 2-col grid */
  mobileFullWidth?: boolean
}

export interface ActionButton<T> {
  icon: React.ReactNode
  label: string
  onClick: (row: T) => void
  color?: 'primary' | 'error' | 'warning' | 'success' | 'info' | 'default'
  disabled?: (row: T) => boolean
  show?: (row: T) => boolean
  tooltip?: string | ((row: T) => string)
}

export interface DataTableProps<T> {
  // Data
  data: T[]
  columns: Column<T>[]

  // Actions
  actions?: ActionButton<T>[]

  // Row behavior
  onRowClick?: (row: T) => void
  getRowKey: (row: T) => string | number

  // Styling
  headerBgColor?: string
  enableHover?: boolean
  enablePointer?: boolean
  stickyHeader?: boolean

  // States
  loading?: boolean
  emptyState?: {
    icon: React.ReactNode
    title: string
    description?: string
  }

  // Table wrapper
  variant?: 'outlined' | 'elevation'
  borderRadius?: number
  maxHeight?: string | number

  // Pagination
  defaultRowsPerPage?: number
  rowsPerPageOptions?: number[]
  tableId?: string

  // Additional features (accepted for compat, unused)
  sx?: object

  // Mobile rendering
  mobileBreakpoint?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const ACTION_COLORS: Record<string, string> = {
  primary: '#3b82f6',
  error: '#ef4444',
  warning: '#f97316',
  success: '#22c55e',
  info: '#0ea5e9',
}

const BREAKPOINT_PX: Record<string, number> = {
  xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280,
}

function useIsMobileWidth(bp: string) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const px = BREAKPOINT_PX[bp] ?? 640
    const mq = window.matchMedia(`(max-width: ${px - 1}px)`)
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [bp])
  return isMobile
}

export default function DataTable<T>({
  data,
  columns,
  actions,
  onRowClick,
  getRowKey,
  enableHover = true,
  enablePointer = false,
  stickyHeader = false,
  loading = false,
  emptyState,
  variant = 'outlined',
  borderRadius = 2,
  maxHeight,
  defaultRowsPerPage = 10,
  rowsPerPageOptions = [5, 10, 25, 50, 100],
  tableId,
  mobileBreakpoint = 'sm',
}: DataTableProps<T>) {
  const { t } = useTranslation()

  const getInitialRowsPerPage = () => {
    if (!tableId) return defaultRowsPerPage
    const saved = localStorage.getItem(`table-rows-per-page-${tableId}`)
    if (saved) {
      const parsed = parseInt(saved, 10)
      if (rowsPerPageOptions.includes(parsed)) return parsed
    }
    return defaultRowsPerPage
  }

  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(getInitialRowsPerPage)
  const isMobile = useIsMobileWidth(mobileBreakpoint)

  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(e.target.value, 10)
    setRowsPerPage(val)
    setPage(0)
    if (tableId) localStorage.setItem(`table-rows-per-page-${tableId}`, String(val))
  }

  const paginatedData = data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  const totalPages = Math.ceil(data.length / rowsPerPage)

  const borderClass = variant === 'outlined' ? 'border border-border' : 'shadow-md'
  const radiusStyle = { borderRadius: borderRadius * 4 }

  // --- Loading skeleton ---
  const skeletonRows = 5
  const rowWidths = [
    [55, 70, 45, 60, 50],
    [70, 50, 65, 40, 55],
    [45, 65, 55, 70, 60],
    [60, 40, 70, 55, 45],
    [50, 60, 45, 65, 70],
  ]

  if (loading) {
    if (isMobile) {
      return (
        <div className={cn('overflow-hidden bg-background', borderClass)} style={radiusStyle}>
          {Array.from({ length: skeletonRows }).map((_, i) => (
            <div
              key={i}
              className="p-3 border-b border-border last:border-0"
              style={{ opacity: Math.max(0.25, 1 - i * 0.15) }}
            >
              <div className="grid grid-cols-2 gap-3">
                {columns.map((col, ci) => (
                  <div
                    key={col.id}
                    className={cn('min-w-0', col.mobileFullWidth ? 'col-span-2' : '')}
                  >
                    <Skeleton className="h-2 mb-1.5 rounded" style={{ width: 48 }} />
                    <Skeleton className="h-4 rounded" style={{ width: `${rowWidths[i][ci % 5]}%` }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )
    }
    return (
      <div
        className={cn('overflow-auto bg-background', borderClass)}
        style={{ ...radiusStyle, maxHeight }}
      >
        <table className="w-full table-fixed border-collapse">
          <thead className={stickyHeader ? 'sticky top-0 z-10 bg-background' : ''}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className="px-3 py-2 text-left text-[0.7rem] font-bold uppercase tracking-[0.05em] text-muted-foreground whitespace-nowrap border-b border-border"
                  style={{ width: col.width, minWidth: col.minWidth }}
                >
                  {col.label}
                </th>
              ))}
              {actions && actions.length > 0 && (
                <th className="px-3 py-2 text-right text-[0.7rem] font-bold uppercase tracking-[0.05em] text-muted-foreground border-b border-border" style={{ width: 152 }}>
                  {t('dataTable.actions')}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={i} style={{ opacity: Math.max(0.2, 1 - i * 0.15) }}>
                {columns.map((col, ci) => (
                  <td key={col.id} className="px-3 py-2.5 border-b border-border last:border-0">
                    <Skeleton className="h-4 rounded" style={{ width: `${rowWidths[i][ci % 5]}%` }} />
                  </td>
                ))}
                {actions && actions.length > 0 && (
                  <td className="px-3 py-2.5 border-b border-border last:border-0">
                    <div className="flex justify-end gap-1">
                      {actions.slice(0, 3).map((_, ai) => (
                        <Skeleton key={ai} className="w-7 h-7 rounded" />
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // --- Empty state ---
  if (data.length === 0 && emptyState) {
    return (
      <div className={cn('bg-background', borderClass)} style={radiusStyle}>
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="mb-4 text-muted-foreground opacity-60">{emptyState.icon}</div>
          <p className="text-base font-semibold mb-1">{emptyState.title}</p>
          {emptyState.description && (
            <p className="text-sm text-muted-foreground">{emptyState.description}</p>
          )}
        </div>
      </div>
    )
  }

  // --- Render actions helper ---
  const renderActions = (
    row: T,
    iconOpacity = 0.45,
    justify: 'start' | 'end' = 'end'
  ) => (
    <div className={cn('flex gap-1 flex-nowrap', justify === 'end' ? 'justify-end' : 'justify-start')}>
      {actions?.map((action, idx) => {
        const shouldShow = action.show ? action.show(row) : true
        if (!shouldShow) return null
        const isDisabled = action.disabled ? action.disabled(row) : false
        const tooltipText =
          typeof action.tooltip === 'function' ? action.tooltip(row) : action.tooltip || action.label
        const actionColor = action.color && action.color !== 'default' ? ACTION_COLORS[action.color] : undefined

        return (
          <Tooltip key={idx}>
            <TooltipTrigger asChild>
              <span>
                <button
                  aria-label={tooltipText}
                  disabled={isDisabled}
                  onClick={(e) => {
                    e.stopPropagation()
                    action.onClick(row)
                  }}
                  className="w-7 h-7 rounded flex items-center justify-center transition-all duration-150 disabled:opacity-20 disabled:cursor-not-allowed"
                  style={{ opacity: isDisabled ? 0.2 : iconOpacity, color: actionColor }}
                  onMouseEnter={(e) => {
                    if (!isDisabled) {
                      ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
                      if (actionColor) (e.currentTarget as HTMLButtonElement).style.background = actionColor + '1f'
                      else (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDisabled) {
                      ;(e.currentTarget as HTMLButtonElement).style.opacity = String(iconOpacity)
                      ;(e.currentTarget as HTMLButtonElement).style.background = ''
                    }
                  }}
                >
                  {action.icon}
                </button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{tooltipText}</TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )

  // --- Mobile card layout ---
  if (isMobile) {
    return (
      <div className={cn('overflow-hidden bg-background', borderClass)} style={radiusStyle}>
        {paginatedData.map((row) => (
          <div
            key={getRowKey(row)}
            className={cn(
              'p-3 border-b border-border last:border-0 transition-colors duration-180',
              enableHover && 'hover:bg-foreground/[0.02]',
              enablePointer && onRowClick && 'cursor-pointer'
            )}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            <div className="grid grid-cols-2 gap-3">
              {columns.map((column) => (
                <div
                  key={column.id}
                  className={cn('min-w-0 overflow-hidden', column.mobileFullWidth && 'col-span-2')}
                >
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.03em] text-muted-foreground mb-0.5">
                    {column.label}
                  </p>
                  <div className="min-w-0 overflow-hidden">
                    {column.render
                      ? column.render(row)
                      : ((row as Record<string, unknown>)[column.id] as React.ReactNode)}
                  </div>
                </div>
              ))}
              {actions && actions.length > 0 && (
                <div className="min-w-0">
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.03em] text-muted-foreground mb-0.5">
                    {t('dataTable.actions')}
                  </p>
                  {renderActions(row, 0.7, 'start')}
                </div>
              )}
            </div>
          </div>
        ))}
        {data.length > 0 && (
          <PaginationBar
            page={page}
            rowsPerPage={rowsPerPage}
            dataLength={data.length}
            totalPages={totalPages}
            rowsPerPageOptions={rowsPerPageOptions}
            onPageChange={setPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        )}
      </div>
    )
  }

  // --- Desktop table ---
  return (
    <div className={cn('bg-background', borderClass)} style={radiusStyle}>
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full table-fixed border-collapse">
          <thead className={stickyHeader ? 'sticky top-0 z-10 bg-background' : ''}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={cn(
                    'px-3 py-2 text-[0.7rem] font-bold uppercase tracking-[0.05em] text-muted-foreground whitespace-nowrap border-b border-border',
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  )}
                  style={{ width: col.width, minWidth: col.minWidth, maxWidth: col.width }}
                >
                  {col.label}
                </th>
              ))}
              {actions && actions.length > 0 && (
                <th
                  className="px-3 py-2 text-right text-[0.7rem] font-bold uppercase tracking-[0.05em] text-muted-foreground whitespace-nowrap border-b border-border"
                  style={{ width: 152, minWidth: 152, maxWidth: 152 }}
                >
                  {t('dataTable.actions')}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row) => (
              <tr
                key={getRowKey(row)}
                className={cn(
                  'transition-colors duration-180 border-b border-border last:border-0',
                  enableHover && 'hover:bg-foreground/[0.03]',
                  enablePointer && onRowClick && 'cursor-pointer'
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={cn(
                      'px-3 py-2.5 overflow-hidden text-ellipsis',
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    )}
                    style={{ width: col.width, minWidth: col.minWidth, maxWidth: col.width, fontWeight: col.fontWeight }}
                  >
                    {col.render
                      ? col.render(row)
                      : ((row as Record<string, unknown>)[col.id] as React.ReactNode)}
                  </td>
                ))}
                {actions && actions.length > 0 && (
                  <td className="px-3 py-2.5 text-right" style={{ width: 130, minWidth: 130, maxWidth: 130 }}>
                    {renderActions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length > 0 && (
        <PaginationBar
          page={page}
          rowsPerPage={rowsPerPage}
          dataLength={data.length}
          totalPages={totalPages}
          rowsPerPageOptions={rowsPerPageOptions}
          onPageChange={setPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      )}
    </div>
  )
}
