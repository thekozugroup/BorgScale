import React from 'react'
import { Database } from 'lucide-react'
import { Repository } from '../types'
import RepoMenuItem from './RepoMenuItem'
import BorgVersionChip from './BorgVersionChip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface RepoSelectProps {
  repositories: Repository[]
  value: number | string
  onChange: (value: number | string) => void
  loading?: boolean
  /** 'id' returns repo.id as item value; 'path' returns repo.path */
  valueKey?: 'id' | 'path'
  label?: string
  loadingLabel?: string
  placeholderLabel?: string
  fallbackDisplayValue?: string
  maintenanceLabel?: string
  size?: 'small' | 'medium'
  disabled?: boolean
  hidePath?: boolean
  /** Extra items rendered before the repo list (e.g. an "All" option) */
  prefixItems?: React.ReactNode
  fullWidth?: boolean
  // Accept sx but ignore it (for compatibility)
  sx?: object
  className?: string
}

export default function RepoSelect({
  repositories,
  value,
  onChange,
  loading = false,
  valueKey = 'path',
  label = 'Repository',
  loadingLabel = 'Loading…',
  placeholderLabel = 'Select a repository',
  fallbackDisplayValue,
  maintenanceLabel,
  size = 'medium',
  disabled = false,
  hidePath = false,
  prefixItems,
  className,
}: RepoSelectProps) {
  const selectedRepo =
    value && value !== '' && value !== '__placeholder__'
      ? repositories.find((r) => (valueKey === 'id' ? r.id === Number(value) : r.path === value))
      : null

  const strValue = value !== null && value !== undefined && value !== '' ? String(value) : '__placeholder__'

  const renderSelectedValue = () => {
    if (loading) {
      return <span className="text-muted-foreground text-sm">{loadingLabel}</span>
    }
    if (!strValue || !selectedRepo) {
      if (strValue && fallbackDisplayValue) {
        return <span className="text-sm font-semibold text-muted-foreground">{fallbackDisplayValue}</span>
      }
      return <span className="text-sm text-muted-foreground">{placeholderLabel}</span>
    }

    if (size === 'small') {
      return (
        <div className="flex items-center gap-1.5">
          <Database size={13} />
          <span className="text-sm font-medium truncate">{selectedRepo.name}</span>
          <BorgVersionChip borgVersion={selectedRepo.borg_version} compact />
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
        <Database size={16} className="flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold truncate leading-tight">{selectedRepo.name}</span>
            <BorgVersionChip borgVersion={selectedRepo.borg_version} compact />
          </div>
          <p
            className="text-[0.62rem] truncate leading-snug text-muted-foreground"
            style={{ fontFamily: '"JetBrains Mono","Fira Code",ui-monospace,SFMono-Regular,monospace' }}
          >
            {selectedRepo.path}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={className ?? 'w-full'}>
      {label && <Label className="mb-1 block">{label}</Label>}
      <Select
        value={strValue}
        onValueChange={(val) => {
          if (val === '__placeholder__') return
          if (valueKey === 'id') {
            onChange(Number(val))
          } else {
            onChange(val)
          }
        }}
        disabled={disabled || loading}
      >
        <SelectTrigger
          className={size === 'medium' ? 'h-auto min-h-[52px] sm:min-h-[58px]' : 'h-8'}
        >
          {renderSelectedValue()}
        </SelectTrigger>
        <SelectContent>
          {prefixItems}
          {!prefixItems && (
            <SelectItem value="__placeholder__" disabled>
              {loading ? loadingLabel : placeholderLabel}
            </SelectItem>
          )}
          {repositories.map((repo) => {
            const itemValue = String(valueKey === 'id' ? repo.id : repo.path)
            return (
              <SelectItem
                key={repo.id}
                value={itemValue}
                disabled={repo.has_running_maintenance}
              >
                <RepoMenuItem
                  name={repo.name}
                  path={repo.path}
                  borgVersion={repo.borg_version}
                  mode={repo.mode as 'full' | 'observe' | undefined}
                  hasRunningMaintenance={repo.has_running_maintenance}
                  maintenanceLabel={maintenanceLabel}
                  hidePath={hidePath}
                />
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
