import { useState } from 'react'
import { Shield, Key, FileKey, Upload, FileText, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'

export interface SecurityStepData {
  encryption: string
  passphrase: string
  remotePath: string
  selectedKeyfile: File | null
}

const BORG1_ENCRYPTION_OPTIONS = [
  { value: 'repokey', label: 'Repository Key', desc: 'Key stored in repository (recommended)' },
  { value: 'repokey-blake2', label: 'Repository Key (BLAKE2)', desc: 'Faster hashing variant' },
  { value: 'keyfile', label: 'Key File', desc: 'Key stored in a separate file' },
  { value: 'keyfile-blake2', label: 'Key File (BLAKE2)', desc: 'Key file with faster hashing' },
  { value: 'none', label: 'None', desc: 'No encryption (not recommended)' },
]

const BORG2_ENCRYPTION_OPTIONS = [
  {
    value: 'repokey-aes-ocb',
    label: 'Repository Key (AES-OCB)',
    desc: 'Default for Borg 2 · recommended',
  },
  {
    value: 'repokey-chacha20-poly1305',
    label: 'Repository Key (ChaCha20)',
    desc: 'Alternative AEAD cipher',
  },
  { value: 'keyfile-aes-ocb', label: 'Key File (AES-OCB)', desc: 'Key stored in a separate file' },
  {
    value: 'keyfile-chacha20-poly1305',
    label: 'Key File (ChaCha20)',
    desc: 'Key file with ChaCha20',
  },
  { value: 'none', label: 'None', desc: 'No encryption (not recommended)' },
]

interface WizardStepSecurityProps {
  mode: 'create' | 'edit' | 'import'
  borgVersion?: 1 | 2
  data: SecurityStepData
  onChange: (data: Partial<SecurityStepData>) => void
}

export default function WizardStepSecurity({
  mode,
  borgVersion = 1,
  data,
  onChange,
}: WizardStepSecurityProps) {
  const { t } = useTranslation()
  const [keyfileMode, setKeyfileMode] = useState<'file' | 'paste'>('file')
  const [keyfileText, setKeyfileText] = useState('')
  const [showPassphrase, setShowPassphrase] = useState(false)

  const handleKeyfileTextChange = (text: string) => {
    setKeyfileText(text)
    if (text.trim()) {
      const file = new File([text], 'borg_keyfile', { type: 'text/plain' })
      onChange({ selectedKeyfile: file })
    } else {
      onChange({ selectedKeyfile: null })
    }
  }

  const encryptionOptions =
    borgVersion === 2 ? BORG2_ENCRYPTION_OPTIONS : BORG1_ENCRYPTION_OPTIONS
  const isKeyfileEncryption = data.encryption.includes('keyfile')

  return (
    <div className="flex flex-col gap-4">
      {/* Encryption Selection - create and import mode */}
      {(mode === 'create' || mode === 'import') && (
        <>
          <div className="flex flex-col gap-1.5">
            {mode === 'create' && (
              <Label htmlFor="encryption-method">
                {t('wizard.security.encryptionMethodLabel')}
              </Label>
            )}
            <Select
              value={data.encryption}
              onValueChange={(v) => onChange({ encryption: v })}
            >
              <SelectTrigger id={mode === 'create' ? 'encryption-method' : undefined} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {encryptionOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div>
                      <div className="text-sm font-semibold">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.desc}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {data.encryption === 'none' && (
            <Alert variant="destructive">
              <AlertTitle>{t('wizard.security.securityWarningTitle')}</AlertTitle>
              <AlertDescription>{t('wizard.security.securityWarningBody')}</AlertDescription>
            </Alert>
          )}
        </>
      )}

      {/* Encryption info for edit mode only */}
      {mode === 'edit' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield size={14} className="opacity-45 shrink-0" />
          <span>{t('wizard.security.encryptionReadonly')}</span>
        </div>
      )}

      {/* Passphrase Input */}
      {data.encryption !== 'none' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="passphrase">
            {mode === 'edit'
              ? t('wizard.security.passphraseOptional')
              : t('wizard.security.passphraseRequired')}
          </Label>
          <div className="relative flex items-center">
            <span className="absolute left-2.5 text-muted-foreground pointer-events-none">
              <Key size={16} />
            </span>
            <Input
              id="passphrase"
              type={showPassphrase ? 'text' : 'password'}
              value={data.passphrase}
              onChange={(e) => onChange({ passphrase: e.target.value })}
              placeholder={
                mode === 'edit'
                  ? t('wizard.security.passphrasePlaceholderEdit')
                  : t('wizard.security.passphrasePlaceholderCreate')
              }
              required={mode !== 'edit'}
              className="pl-8 pr-9"
              aria-label={
                mode === 'edit'
                  ? t('wizard.security.passphraseOptional')
                  : t('wizard.security.passphraseRequired')
              }
            />
            <button
              type="button"
              aria-label={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
              onClick={() => setShowPassphrase((v) => !v)}
              className="absolute right-2.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassphrase ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {mode === 'edit'
              ? t('wizard.security.passphraseHelperEdit')
              : t('wizard.security.passphraseHelperCreate')}
          </p>
        </div>
      )}

      {/* Keyfile Upload - import mode only, and only when encryption is keyfile-based */}
      {mode === 'import' && isKeyfileEncryption && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileKey size={16} />
            <span>{t('wizard.security.borgKeyfileTitle')}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t('wizard.security.borgKeyfileDesc')}</p>

          {/* Toggle buttons: Upload File / Paste Content */}
          <div className="flex p-0.5 bg-muted rounded-lg gap-0.5 w-fit">
            {(['file', 'paste'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setKeyfileMode(m)
                  setKeyfileText('')
                  onChange({ selectedKeyfile: null })
                }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-all',
                  keyfileMode === m
                    ? 'bg-background text-foreground shadow font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {m === 'file' ? (
                  <>
                    <Upload size={14} />
                    {t('wizard.security.uploadFile')}
                  </>
                ) : (
                  <>
                    <FileText size={14} />
                    {t('wizard.security.pasteContent')}
                  </>
                )}
              </button>
            ))}
          </div>

          {keyfileMode === 'file' ? (
            <label
              className={cn(
                'flex items-center gap-2 px-3 py-3 border-2 border-dashed rounded-lg cursor-pointer text-sm',
                'text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors'
              )}
            >
              <FileKey size={18} />
              <span>
                {data.selectedKeyfile
                  ? t('wizard.security.selectedKeyfile', { name: data.selectedKeyfile.name })
                  : t('wizard.security.chooseKeyfile')}
              </span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onChange({ selectedKeyfile: e.target.files[0] })
                  }
                }}
              />
            </label>
          ) : (
            <Textarea
              rows={6}
              placeholder="BORG_KEY ..."
              value={keyfileText}
              onChange={(e) => handleKeyfileTextChange(e.target.value)}
              className="font-mono text-xs"
            />
          )}

          {data.selectedKeyfile && (
            <Alert>
              <AlertDescription>
                {keyfileMode === 'file'
                  ? t('wizard.security.keyfileUploadNote')
                  : t('wizard.security.keyfileContentNote')}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Remote Path */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="remote-borg-path">{t('wizard.security.remoteBorgPath')}</Label>
        <Input
          id="remote-borg-path"
          value={data.remotePath}
          onChange={(e) => onChange({ remotePath: e.target.value })}
          placeholder={borgVersion === 2 ? '/usr/local/bin/borg2' : '/usr/local/bin/borg'}
          aria-label={t('wizard.security.remoteBorgPath')}
        />
        <p className="text-xs text-muted-foreground">{t('wizard.security.remoteBorgPathHelper')}</p>
      </div>
    </div>
  )
}
