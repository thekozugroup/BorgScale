import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FolderOpen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import FileExplorerDialog from './FileExplorerDialog'
import { cn } from '@/lib/utils'

interface PathSelectorFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  helperText?: string
  disabled?: boolean
  required?: boolean
  error?: boolean
  multiSelect?: boolean
  selectMode?: 'directories' | 'files' | 'both'
  connectionType?: 'local' | 'ssh'
  sshConfig?: {
    ssh_key_id: number
    host: string
    username: string
    port: number
  }
  fullWidth?: boolean
  size?: 'small' | 'medium'
}

export default function PathSelectorField({
  label,
  value,
  onChange,
  placeholder = '/path/to/directory',
  helperText,
  disabled = false,
  required = false,
  error = false,
  multiSelect = false,
  selectMode = 'directories',
  connectionType = 'local',
  sshConfig,
}: PathSelectorFieldProps) {
  const { t } = useTranslation()
  const [showFileExplorer, setShowFileExplorer] = useState(false)
  const inputId = 'path-selector-field'

  return (
    <>
      <div className="flex flex-col gap-1 w-full">
        <Label htmlFor={inputId}>
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        <div className="relative">
          <Input
            id={inputId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            aria-invalid={error}
            className="pr-9"
          />
          <button
            type="button"
            onClick={() => setShowFileExplorer(true)}
            disabled={disabled}
            title={t('pathSelectorField.browseFilesystem')}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <FolderOpen size={14} />
          </button>
        </div>
        {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
      </div>

      <FileExplorerDialog
        open={showFileExplorer}
        onClose={() => setShowFileExplorer(false)}
        onSelect={(paths) => {
          if (paths.length > 0) {
            onChange(multiSelect ? paths.join(',') : paths[0])
          }
        }}
        title={
          selectMode === 'directories'
            ? t('pathSelectorField.selectDirectory')
            : selectMode === 'files'
              ? t('pathSelectorField.selectFile')
              : t('pathSelectorField.selectPath')
        }
        initialPath={value || '/'}
        multiSelect={multiSelect}
        connectionType={connectionType}
        sshConfig={sshConfig}
        selectMode={selectMode}
      />
    </>
  )
}
