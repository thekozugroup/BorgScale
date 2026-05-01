import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, FolderOpen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface ExcludePatternInputProps {
  patterns: string[]
  onChange: (patterns: string[]) => void
  onBrowseClick?: () => void
  disabled?: boolean
}

export default function ExcludePatternInput({
  patterns,
  onChange,
  onBrowseClick,
  disabled = false,
}: ExcludePatternInputProps) {
  const { t } = useTranslation()
  const [newPattern, setNewPattern] = useState('')

  const handleAdd = () => {
    if (newPattern.trim()) {
      onChange([...patterns, newPattern.trim()])
      setNewPattern('')
    }
  }

  const handleRemove = (index: number) => {
    onChange(patterns.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold mb-1">{t('excludePatterns.title')}</p>
      <p className="text-xs text-muted-foreground mb-3">{t('excludePatterns.hint')}</p>

      {patterns.length > 0 && (
        <div className="flex flex-col gap-1 mb-3">
          {patterns.map((pattern, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="font-mono text-sm flex-1 truncate">{pattern}</span>
              <button
                type="button"
                aria-label={`Remove ${pattern}`}
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
            value={newPattern}
            onChange={(e) => setNewPattern(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('excludePatterns.placeholder')}
            disabled={disabled}
            className={onBrowseClick ? 'pr-9' : ''}
          />
          {onBrowseClick && (
            <button
              type="button"
              onClick={onBrowseClick}
              disabled={disabled}
              title={t('excludePatterns.browseToExclude')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              <FolderOpen size={16} />
            </button>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleAdd} disabled={disabled}>
          {t('excludePatterns.add')}
        </Button>
      </div>
    </div>
  )
}
