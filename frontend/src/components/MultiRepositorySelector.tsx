import React, { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronUp, ChevronDown, X, ChevronDown as DropdownIcon, Check } from 'lucide-react'
import { Repository } from '../types'
import RepoMenuItem from './RepoMenuItem'
import { getRepoCapabilities } from '../utils/repoCapabilities'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface MultiRepositorySelectorProps {
  repositories: Repository[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
  label?: string
  helperText?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  size?: 'small' | 'medium'
  allowReorder?: boolean
  error?: boolean
  filterMode?: 'observe' | null
}

export const MultiRepositorySelector: React.FC<MultiRepositorySelectorProps> = ({
  repositories,
  selectedIds,
  onChange,
  label = 'Repositories',
  helperText,
  placeholder = 'Select repositories...',
  required = false,
  disabled = false,
  allowReorder = false,
  error = false,
  filterMode = null,
}) => {
  const { t } = useTranslation()
  const [touched, setTouched] = React.useState(false)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const safeRepositories = Array.isArray(repositories) ? repositories : []
  const availableRepos = filterMode
    ? safeRepositories.filter((repo) => getRepoCapabilities(repo).canBackup)
    : safeRepositories

  const selectedRepos = selectedIds
    .map((id) => availableRepos.find((r) => r.id === id))
    .filter(Boolean) as Repository[]

  const filteredOptions = availableRepos.filter((repo) =>
    repo.name.toLowerCase().includes(search.toLowerCase()) ||
    repo.path.toLowerCase().includes(search.toLowerCase())
  )

  const handleToggle = (repoId: number) => {
    setTouched(true)
    if (selectedIds.includes(repoId)) {
      onChange(selectedIds.filter((id) => id !== repoId))
    } else {
      onChange([...selectedIds, repoId])
    }
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newIds = [...selectedIds]
    ;[newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]]
    onChange(newIds)
  }

  const handleMoveDown = (index: number) => {
    if (index === selectedIds.length - 1) return
    const newIds = [...selectedIds]
    ;[newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]]
    onChange(newIds)
  }

  const handleRemove = (repoId: number) => {
    onChange(selectedIds.filter((id) => id !== repoId))
  }

  const showError = error || (touched && required && selectedIds.length === 0)

  return (
    <div ref={containerRef}>
      {label && (
        <Label className={cn('mb-1 block', required && "after:content-['*'] after:ml-0.5 after:text-destructive")}>
          {label}
        </Label>
      )}

      {/* Trigger / dropdown */}
      <div className="relative">
        <div
          className={cn(
            'flex items-center min-h-[52px] rounded-md border px-3 py-2 cursor-pointer bg-background gap-2',
            showError ? 'border-destructive' : 'border-input',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onClick={() => { if (!disabled) { setOpen(!open); setTouched(true) } }}
        >
          <div className="flex-1 text-sm text-muted-foreground">
            {selectedIds.length === 0
              ? placeholder
              : t('multiRepositorySelector.searchOrAddMore')}
          </div>
          <DropdownIcon size={16} className="text-muted-foreground flex-shrink-0" />
        </div>

        {open && !disabled && (
          <div className="absolute z-50 w-full mt-1 rounded-md border border-border bg-background shadow-md">
            <div className="p-2 border-b border-border">
              <Input
                autoFocus
                placeholder={t('multiRepositorySelector.searchOrAddMore')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="max-h-[360px] overflow-y-auto py-1">
              {filteredOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground px-3 py-2">{t('multiRepositorySelector.noReposFound') || 'No repositories found'}</p>
              ) : (
                filteredOptions.map((repo) => {
                  const selected = selectedIds.includes(repo.id)
                  return (
                    <div
                      key={repo.id}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-muted transition-colors',
                        selected && 'bg-primary/5'
                      )}
                      onClick={() => handleToggle(repo.id)}
                    >
                      <div className={cn('w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center', selected ? 'bg-primary border-primary' : 'border-border')}>
                        {selected && <Check size={10} className="text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <RepoMenuItem
                          name={repo.name}
                          path={repo.path}
                          borgVersion={repo.borg_version}
                          mode={repo.mode as 'full' | 'observe' | undefined}
                          hasRunningMaintenance={repo.has_running_maintenance}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {showError && required && selectedIds.length === 0 && (
        <p className="text-xs text-destructive mt-1">{t('multiRepositorySelector.required') || 'Required'}</p>
      )}
      {helperText && <p className="text-xs text-muted-foreground mt-1">{helperText}</p>}

      {/* Click outside to close */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Selected list */}
      {selectedRepos.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-2">
            {allowReorder && selectedRepos.length > 1
              ? t('multiRepositorySelector.selectedCountWithOrder', { count: selectedRepos.length })
              : t('multiRepositorySelector.selectedCount', { count: selectedRepos.length })}
          </p>
          <div className="flex flex-col gap-2">
            {selectedRepos.map((repo, index) => (
              <div
                key={repo.id}
                className="flex items-center gap-2 p-3 border border-border rounded-md bg-background hover:bg-muted/30 transition-colors"
              >
                {allowReorder && selectedRepos.length > 1 && (
                  <span className="text-sm font-semibold text-muted-foreground min-w-[24px]">
                    {index + 1}.
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <RepoMenuItem
                    name={repo.name}
                    path={repo.path}
                    borgVersion={repo.borg_version}
                    mode={repo.mode as 'full' | 'observe' | undefined}
                    hasRunningMaintenance={repo.has_running_maintenance}
                  />
                </div>
                <div className="flex items-center gap-0.5">
                  {allowReorder && selectedRepos.length > 1 && (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <button
                              type="button"
                              disabled={index === 0 || disabled}
                              onClick={() => handleMoveUp(index)}
                              className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                            >
                              <ChevronUp size={16} />
                            </button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{t('multiRepositorySelector.moveUp')}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <button
                              type="button"
                              disabled={index === selectedRepos.length - 1 || disabled}
                              onClick={() => handleMoveDown(index)}
                              className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                            >
                              <ChevronDown size={16} />
                            </button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{t('multiRepositorySelector.moveDown')}</TooltipContent>
                      </Tooltip>
                    </>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => handleRemove(repo.id)}
                          className="w-7 h-7 rounded flex items-center justify-center text-destructive/70 hover:text-destructive hover:bg-muted disabled:opacity-30 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{t('multiRepositorySelector.remove')}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default MultiRepositorySelector
