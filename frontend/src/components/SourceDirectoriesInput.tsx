import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, FolderOpen, Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface SourceDirectoriesInputProps {
  directories: string[]
  onChange: (directories: string[]) => void
  onBrowseClick?: () => void
  disabled?: boolean
  required?: boolean
}

export default function SourceDirectoriesInput({
  directories,
  onChange,
  onBrowseClick,
  disabled = false,
  required = true,
}: SourceDirectoriesInputProps) {
  const { t } = useTranslation()
  const [newDir, setNewDir] = useState('')

  const handleAdd = () => {
    if (newDir.trim()) {
      onChange([...directories, newDir.trim()])
      setNewDir('')
    }
  }

  const handleRemove = (index: number) => {
    onChange(directories.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <p className="text-sm font-semibold">
          {t('sourceDirectories.title')}
          {required && <span className="text-destructive"> *</span>}
        </p>
        {required && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={t('sourceDirectories.titleHelp')}
                className="p-0.5 text-muted-foreground hover:text-foreground"
              >
                <Info size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent>{t('sourceDirectories.warning')}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        {t('sourceDirectories.subtitle')}
        {required ? t('sourceDirectories.atLeastOneRequired') : t('sourceDirectories.optionalSuffix')}
      </p>

      {directories.length > 0 && (
        <div className="flex flex-col gap-1 mb-3">
          {directories.map((dir, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="font-mono text-sm flex-1 truncate">{dir}</span>
              <button
                type="button"
                aria-label={`Remove ${dir}`}
                onClick={() => handleRemove(index)}
                disabled={disabled}
                className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted transition-colors disabled:opacity-40"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={newDir}
            onChange={(e) => setNewDir(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('sourceDirectories.placeholder')}
            disabled={disabled}
            className={onBrowseClick ? 'pr-9' : ''}
          />
          {onBrowseClick && (
            <button
              type="button"
              onClick={onBrowseClick}
              disabled={disabled}
              title={t('sourceDirectories.browseTitle')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              <FolderOpen size={16} />
            </button>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleAdd} disabled={disabled}>
          {t('sourceDirectories.add')}
        </Button>
      </div>
    </div>
  )
}
