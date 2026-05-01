import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { buildCompressionString, parseCompressionString } from '../utils/compressionUtils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CompressionSettingsProps {
  value: string
  onChange: (compressionString: string) => void
  disabled?: boolean
}

const isValidObfuscateLevel = (val: string): boolean => {
  if (val === '') return true
  const n = parseInt(val, 10)
  if (isNaN(n) || String(n) !== val) return false
  return (n >= 1 && n <= 6) || (n >= 110 && n <= 123) || n === 250
}

export default function CompressionSettings({
  value,
  onChange,
  disabled = false,
}: CompressionSettingsProps) {
  const { t } = useTranslation()
  const parsed = parseCompressionString(value || 'lz4')
  const [algorithm, setAlgorithm] = useState(parsed.algorithm)
  const [level, setLevel] = useState(parsed.level)
  const [autoDetect, setAutoDetect] = useState(parsed.autoDetect)
  const [obfuscate, setObfuscate] = useState(parsed.obfuscate)
  const obfuscateError = !isValidObfuscateLevel(obfuscate)

  useEffect(() => {
    const newCompression = buildCompressionString(algorithm, level, autoDetect, obfuscate)
    onChange(newCompression)
  }, [algorithm, level, autoDetect, obfuscate, onChange])

  useEffect(() => {
    const p = parseCompressionString(value || 'lz4')
    setAlgorithm(p.algorithm)
    setLevel(p.level)
    setAutoDetect(p.autoDetect)
    setObfuscate(p.obfuscate)
  }, [value])

  return (
    <div>
      <p className="text-sm font-semibold mb-3">{t('compressionSettings.title')}</p>

      <div className="flex flex-col gap-4">
        <div>
          <Label htmlFor="compression-algorithm" className="mb-1 block">{t('compressionSettings.algorithmLabel')}</Label>
          <Select value={algorithm} onValueChange={setAlgorithm} disabled={disabled}>
            <SelectTrigger id="compression-algorithm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('compressionSettings.algorithmNone')}</SelectItem>
              <SelectItem value="lz4">{t('compressionSettings.algorithmLz4')}</SelectItem>
              <SelectItem value="zstd">{t('compressionSettings.algorithmZstd')}</SelectItem>
              <SelectItem value="zlib">{t('compressionSettings.algorithmZlib')}</SelectItem>
              <SelectItem value="lzma">{t('compressionSettings.algorithmLzma')}</SelectItem>
              <SelectItem value="auto">{t('compressionSettings.algorithmAuto')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {algorithm !== 'none' && (
          <>
            <div>
              <Label htmlFor="compression-level" className="mb-1 block">{t('compressionSettings.levelLabel')}</Label>
              <Input
                id="compression-level"
                type="number"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder={
                  algorithm === 'zstd' ? t('compressionSettings.levelPlaceholderZstd')
                    : algorithm === 'zlib' ? t('compressionSettings.levelPlaceholderZlib')
                    : algorithm === 'lzma' ? t('compressionSettings.levelPlaceholderLzma')
                    : t('compressionSettings.levelPlaceholderDefault')
                }
                disabled={disabled || algorithm === 'auto'}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {algorithm === 'auto' ? t('compressionSettings.levelHelperAuto')
                  : algorithm === 'zstd' ? t('compressionSettings.levelHelperZstd')
                  : algorithm === 'zlib' ? t('compressionSettings.levelHelperZlib')
                  : algorithm === 'lzma' ? t('compressionSettings.levelHelperLzma')
                  : t('compressionSettings.levelHelperDefault')}
              </p>
            </div>

            {algorithm !== 'auto' && algorithm !== 'obfuscate' && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoDetect}
                  onChange={(e) => setAutoDetect(e.target.checked)}
                  disabled={disabled}
                  className="rounded border-border"
                />
                <div>
                  <span className="text-sm">{t('compressionSettings.autoDetect')}</span>
                  <p className="text-xs text-muted-foreground">{t('compressionSettings.autoDetectDesc')}</p>
                </div>
              </label>
            )}

            <div>
              <Label htmlFor="compression-obfuscate" className="mb-1 block">{t('compressionSettings.obfuscateLabel')}</Label>
              <Input
                id="compression-obfuscate"
                type="number"
                value={obfuscate}
                onChange={(e) => setObfuscate(e.target.value)}
                placeholder={t('compressionSettings.obfuscatePlaceholder')}
                disabled={disabled}
                className={obfuscateError ? 'border-destructive' : ''}
              />
              <p className={`text-xs mt-1 ${obfuscateError ? 'text-destructive' : 'text-muted-foreground'}`}>
                {obfuscateError ? t('compressionSettings.obfuscateErrorInvalid') : t('compressionSettings.obfuscateHelper')}
              </p>
            </div>

            <Alert>
              <AlertDescription>
                {t('compressionSettings.finalSpec')}{' '}
                <strong>{buildCompressionString(algorithm, level, autoDetect, obfuscate)}</strong>
              </AlertDescription>
            </Alert>
          </>
        )}
      </div>
    </div>
  )
}
