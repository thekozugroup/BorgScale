import { useState } from 'react'
import { HardDrive, Copy, Check, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

interface MountSuccessToastProps {
  toastId: string
  command: string
}

export default function MountSuccessToast({ toastId, command }: MountSuccessToastProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex flex-col gap-3 p-3 rounded-lg max-w-[480px] w-full border border-border bg-background shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary">
          <HardDrive size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">{t('mountToast.archiveMounted')}</p>
          <p className="text-xs text-muted-foreground">{t('mountToast.openInTerminal')}</p>
        </div>
        <button
          onClick={() => toast.dismiss(toastId)}
          className="size-11 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          <X size={13} />
        </button>
      </div>

      {/* Command block */}
      <div className="flex items-center gap-2 px-3 py-2 rounded border border-border bg-muted/40">
        <code
          className="flex-1 text-xs break-all leading-relaxed font-mono text-foreground"
        >
          {command}
        </code>
        <button
          onClick={handleCopy}
          title={copied ? 'Copied!' : 'Copy command'}
          className={`size-11 inline-flex items-center justify-center flex-shrink-0 rounded transition-colors ${copied ? 'text-primary' : 'text-muted-foreground'}`}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
    </div>
  )
}
