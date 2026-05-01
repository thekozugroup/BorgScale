import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FolderOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Archive as ArchiveIcon,
  List,
  Layers,
  ChevronUp,
} from 'lucide-react'
import ArchiveCard from './ArchiveCard'
import ArchiveCardSkeleton from './ArchiveCardSkeleton'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Archive } from '../types'
import {
  groupArchivesByTime,
  getGroupsArray,
  sortArchives,
  filterArchivesByType,
  type SortOption,
  type TimeGroup,
  type FilterType,
} from '../utils/archiveGrouping'

interface ArchivesListProps {
  archives: Archive[]
  repositoryName: string
  loading: boolean
  onViewArchive: (archive: Archive) => void
  onRestoreArchive: (archive: Archive) => void
  onMountArchive: (archive: Archive) => void
  onDeleteArchive: (archiveName: string) => void
  mountDisabled?: boolean
  canDelete?: boolean
  defaultRowsPerPage?: number
  rowsPerPageOptions?: number[]
}

export default function ArchivesList({
  archives,
  loading,
  onViewArchive,
  onRestoreArchive,
  onMountArchive,
  onDeleteArchive,
  mountDisabled = false,
  canDelete = true,
  defaultRowsPerPage = 10,
  rowsPerPageOptions = [5, 10, 25, 50, 100],
}: ArchivesListProps) {
  const getInitialRowsPerPage = () => {
    const saved = localStorage.getItem('archives-list-rows-per-page')
    if (saved) {
      const parsed = parseInt(saved, 10)
      if (rowsPerPageOptions.includes(parsed)) {
        return parsed
      }
    }
    return defaultRowsPerPage
  }

  const getInitialSortBy = (): SortOption => {
    const saved = localStorage.getItem('archives-list-sort-by')
    if (saved && ['date-desc', 'date-asc'].includes(saved)) {
      return saved as SortOption
    }
    return 'date-desc'
  }

  const getInitialGroupingEnabled = (): boolean => {
    const saved = localStorage.getItem('archives-list-grouping-enabled')
    if (saved === 'true') return true
    if (saved === 'false') return false
    return false
  }

  const getInitialExpandedGroups = (): Set<TimeGroup> => {
    const saved = localStorage.getItem('archives-list-expanded-groups')
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as TimeGroup[]
        return new Set(parsed)
      } catch {
        // fall through
      }
    }
    return new Set(['today', 'yesterday'])
  }

  const getInitialFilter = (): FilterType => {
    const saved = localStorage.getItem('archives-list-filter')
    if (saved && ['all', 'scheduled', 'manual'].includes(saved)) {
      return saved as FilterType
    }
    return 'all'
  }

  const { t } = useTranslation()

  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(getInitialRowsPerPage)
  const [sortBy, setSortBy] = useState<SortOption>(getInitialSortBy)
  const [groupingEnabled, setGroupingEnabled] = useState(getInitialGroupingEnabled)
  const [expandedGroups, setExpandedGroups] = useState<Set<TimeGroup>>(getInitialExpandedGroups)
  const [filter, setFilter] = useState<FilterType>(getInitialFilter)

  const sortedArchives = useMemo(() => {
    const filtered = filterArchivesByType(archives, filter)
    const effectiveSortBy = groupingEnabled ? 'date-desc' : sortBy
    return sortArchives(filtered, effectiveSortBy)
  }, [archives, filter, sortBy, groupingEnabled])

  const groupedArchives = useMemo(() => {
    if (!groupingEnabled) return null
    const grouped = groupArchivesByTime(sortedArchives)
    return getGroupsArray(grouped)
  }, [sortedArchives, groupingEnabled])

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (value: string) => {
    const newRowsPerPage = parseInt(value, 10)
    setRowsPerPage(newRowsPerPage)
    setPage(0)
    localStorage.setItem('archives-list-rows-per-page', String(newRowsPerPage))
  }

  const handleSortChange = (value: string) => {
    const newSort = value as SortOption
    setSortBy(newSort)
    setPage(0)
    localStorage.setItem('archives-list-sort-by', newSort)
  }

  const handleToggleGroup = (groupKey: TimeGroup) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey)
    } else {
      newExpanded.add(groupKey)
    }
    setExpandedGroups(newExpanded)
    localStorage.setItem('archives-list-expanded-groups', JSON.stringify(Array.from(newExpanded)))
  }

  const handleViewModeChange = (mode: 'grouped' | 'flat') => {
    const enabled = mode === 'grouped'
    setGroupingEnabled(enabled)
    setPage(0)
    localStorage.setItem('archives-list-grouping-enabled', String(enabled))
  }

  const handleFilterChange = (value: string) => {
    const filterValue = value as FilterType
    setFilter(filterValue)
    setPage(0)
    localStorage.setItem('archives-list-filter', filterValue)
  }

  // Table header for flat view
  const tableHeader = (
    <div
      className={cn(
        'hidden md:grid grid-cols-[minmax(0,1fr)_76px_minmax(180px,220px)_132px] items-center gap-2',
        'px-4 py-2 bg-muted/30',
        'border-b border-border',
        'text-2xs font-semibold uppercase tracking-widest text-muted-foreground'
      )}
    >
      <span>{t('archivesList.columnArchive', 'Archive')}</span>
      <span>{t('archivesList.columnType', 'Type')}</span>
      <span>{t('archivesList.columnDate', 'Date')}</span>
      <span className="text-right">{t('archivesList.columnActions', 'Actions')}</span>
    </div>
  )

  // Loading State
  if (loading) {
    return (
      <div>
        {/* Header skeleton */}
        <div
          className={cn(
            'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-2',
            'px-4 py-[10px] mb-5 rounded-lg',
            'bg-primary/8',
            'border border-primary/15'
          )}
        >
          <div className="flex items-baseline gap-3">
            <Skeleton className="h-[19px] w-16 rounded" />
            <Skeleton className="h-5 w-5.5 rounded" />
          </div>
          <div className="flex gap-1.5 items-center flex-wrap">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-11 rounded-full" />
            <Skeleton className="h-5 w-11 rounded-full" />
          </div>
        </div>
        <div className="rounded-2xl border border-border overflow-hidden">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <ArchiveCardSkeleton key={i} index={i} />
          ))}
        </div>
      </div>
    )
  }

  // Empty State
  if (archives.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-16 text-muted-foreground">
        <FolderOpen size={48} className="mb-4" />
        <p className="text-sm">{t('archivesList.empty')}</p>
      </div>
    )
  }

  // Pill button helper
  const pillCls = (active: boolean, colorActive?: string) =>
    cn(
      'flex items-center gap-1 px-3 py-1 rounded-xl border cursor-pointer select-none text-xs font-semibold transition-all duration-150',
      active
        ? colorActive
          ? colorActive
          : 'border-border bg-accent/50 text-foreground'
        : 'border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
    )

  return (
    <div>
      {/* Panel header */}
      <div
        className={cn(
          'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-2',
          'px-4 py-[10px] mb-5 rounded-lg',
          'bg-primary/8',
          'border border-primary/15'
        )}
      >
        <div className="flex items-baseline gap-3 shrink-0">
          <span className="text-sm font-bold">Archives</span>
          <span
            className={cn(
              'text-xs font-semibold px-1.5 py-0.5 rounded',
              'bg-border text-muted-foreground leading-[1.6]'
            )}
          >
            {filter === 'all' || sortedArchives.length === archives.length
              ? archives.length
              : `${sortedArchives.length}/${archives.length}`}
          </span>
        </div>

        <div className="flex flex-row flex-wrap gap-2 items-center w-full sm:w-auto">
          {/* Sort group — flat view only */}
          {!groupingEnabled && (
            <>
              <div className="flex gap-1 items-center">
                {(['date-desc', 'date-asc'] as SortOption[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSortChange(opt)}
                    className={pillCls(
                      sortBy === opt,
                      'border-primary/35 bg-primary/10 text-primary'
                    )}
                  >
                    {opt === 'date-desc'
                      ? t('archivesList.newestFirst')
                      : t('archivesList.oldestFirst')}
                  </button>
                ))}
              </div>
              <div className="hidden sm:block w-px self-stretch bg-border shrink-0" />
            </>
          )}

          {/* Filter group */}
          <div className="flex gap-1 items-center">
            {(['all', 'scheduled', 'manual'] as FilterType[]).map((opt) => {
              const label =
                opt === 'all'
                  ? t('archivesList.allArchives')
                  : opt === 'scheduled'
                    ? t('archivesList.scheduled')
                    : t('archivesList.manual')
              const activeColor =
                opt === 'scheduled'
                  ? 'border-primary/35 bg-primary/10 text-primary'
                  : opt === 'manual'
                    ? 'border-primary/35 bg-primary/10 text-primary'
                    : undefined
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleFilterChange(opt)}
                  className={pillCls(filter === opt, activeColor)}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div className="hidden sm:block w-px self-stretch bg-border shrink-0" />

          {/* View mode group */}
          <div className="flex gap-1 items-center">
            {(['grouped', 'flat'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleViewModeChange(mode)}
                className={pillCls((groupingEnabled ? 'grouped' : 'flat') === mode)}
              >
                {mode === 'grouped' ? <Layers size={13} /> : <List size={13} />}
                {mode === 'grouped' ? t('archivesList.grouped') : t('archivesList.list')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty filtered state */}
      {sortedArchives.length === 0 && archives.length > 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FolderOpen size={48} className="mb-4" />
          <p className="text-sm">
            {filter === 'scheduled'
              ? t('archivesList.noScheduledArchives')
              : t('archivesList.noManualArchives')}
          </p>
          <p className="text-sm mt-2">{t('archivesList.tryDifferentFilter')}</p>
        </div>
      ) : groupingEnabled && groupedArchives ? (
        /* Grouped view */
        <div className="flex flex-col gap-3">
          {groupedArchives.map((group) => {
            const isExpanded = expandedGroups.has(group.key)
            return (
              <div
                key={group.key}
                className="rounded-lg border border-border overflow-hidden"
              >
                <button
                  type="button"
                  data-testid="accordion-trigger"
                  onClick={() => handleToggleGroup(group.key)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors',
                    'border-b border-transparent',
                    isExpanded && 'border-b-border'
                  )}
                >
                  {group.iconName === 'Calendar' ? (
                    <Calendar size={20} className="text-muted-foreground shrink-0" />
                  ) : (
                    <ArchiveIcon size={20} className="text-muted-foreground shrink-0" />
                  )}
                  <span className="text-base font-semibold flex-1">{group.label}</span>
                  <Badge variant="secondary" className="ml-auto mr-4 text-xs">
                    {group.archives.length}
                  </Badge>
                  {isExpanded ? (
                    <ChevronUp size={20} className="text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown size={20} className="text-muted-foreground shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <div>
                    {group.archives.map((archive) => (
                      <ArchiveCard
                        key={archive.id}
                        archive={archive}
                        onView={onViewArchive}
                        onRestore={onRestoreArchive}
                        onMount={onMountArchive}
                        onDelete={onDeleteArchive}
                        mountDisabled={mountDisabled}
                        canDelete={canDelete}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* Flat view */
        <>
          <div className="rounded-2xl border border-border overflow-hidden mb-4">
            {tableHeader}
            {sortedArchives
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((archive) => (
                <ArchiveCard
                  key={archive.id}
                  archive={archive}
                  onView={onViewArchive}
                  onRestore={onRestoreArchive}
                  onMount={onMountArchive}
                  onDelete={onDeleteArchive}
                  mountDisabled={mountDisabled}
                  canDelete={canDelete}
                />
              ))}
          </div>

          {/* Pagination */}
          {sortedArchives.length > 0 && (
            <div className="flex items-center flex-wrap gap-2 text-sm text-muted-foreground px-1">
              {/* Rows per page */}
              <label htmlFor="rows-per-page-select" className="shrink-0">
                {t('archivesList.archivesPerPage')}
              </label>
              <select
                id="rows-per-page-select"
                aria-label={t('archivesList.archivesPerPage')}
                value={rowsPerPage}
                onChange={(e) => handleChangeRowsPerPage(e.target.value)}
                className={cn(
                  'h-7 rounded-md border border-input bg-background px-2 text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-ring/50'
                )}
              >
                {rowsPerPageOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>

              {/* Display rows */}
              <span className="ml-auto text-sm">
                {page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, sortedArchives.length)}{' '}
                of {sortedArchives.length !== -1 ? sortedArchives.length : `more than ${(page + 1) * rowsPerPage}`}
              </span>

              {/* Prev/Next */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Go to previous page"
                  disabled={page === 0}
                  onClick={(e) => handleChangePage(e, page - 1)}
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Go to next page"
                  disabled={(page + 1) * rowsPerPage >= sortedArchives.length}
                  onClick={(e) => handleChangePage(e, page + 1)}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
