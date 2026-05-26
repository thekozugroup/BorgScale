import { useState, ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface Props {
  labelKey?: string
  label?: string
  defaultOpen?: boolean
  forceOpen?: boolean // open from the outside (e.g. when value != default)
  children: ReactNode
  testId?: string
}

/**
 * Collapsible "Advanced settings" disclosure used to hide power-user
 * options from non-technical users. Keeps the underlying form state
 * intact — only the visibility of the controls changes.
 *
 * When `forceOpen` is provided the section is always open (used when a
 * non-default value is present so the user can see it without clicking).
 */
export default function AdvancedDisclosure({
  labelKey,
  label,
  defaultOpen = false,
  forceOpen,
  children,
  testId,
}: Props) {
  const { t } = useTranslation()
  const [openSelf, setOpenSelf] = useState(defaultOpen)
  const open = forceOpen ?? openSelf
  const resolvedLabel = label ?? (labelKey ? t(labelKey) : t('wizard.advanced.label'))
  return (
    <div className="border rounded-md mt-4" data-testid={testId ?? 'advanced-disclosure'}>
      <button
        type="button"
        onClick={() => {
          if (forceOpen === undefined) setOpenSelf((v) => !v)
        }}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-2 px-4 py-3 text-sm font-medium',
          'hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md',
          forceOpen !== undefined && 'cursor-default'
        )}
      >
        <ChevronRight
          className={cn('h-4 w-4 transition-transform', open && 'rotate-90')}
        />
        <span>{resolvedLabel}</span>
      </button>
      {open && <div className="border-t px-4 py-4 space-y-4">{children}</div>}
    </div>
  )
}
