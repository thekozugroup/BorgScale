import { useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-hot-toast'
import { Fingerprint, ShieldCheck, Zap, KeyRound, Loader2 } from 'lucide-react'
import { getApiErrorDetail } from '../utils/apiErrors'
import { translateBackendKey } from '../utils/translateBackendKey'
import { useAuth } from '../hooks/useAuth'
import { useAnalytics } from '../hooks/useAnalytics'
import ResponsiveDialog from './ResponsiveDialog'
import { Button } from '@/components/ui/button'

interface PasskeyEnrollmentPromptProps {
  open: boolean
  onSnooze: () => void
  onIgnore: () => void
  onSuccess: () => Promise<void> | void
}

const BENEFITS = [
  {
    icon: Zap,
    titleKey: 'settings.account.security.passkeyBenefitFastTitle',
    descKey: 'settings.account.security.passkeyBenefitFastDesc',
  },
  {
    icon: ShieldCheck,
    titleKey: 'settings.account.security.passkeyBenefitSecureTitle',
    descKey: 'settings.account.security.passkeyBenefitSecureDesc',
  },
  {
    icon: KeyRound,
    titleKey: 'settings.account.security.passkeyBenefitNoPasswordTitle',
    descKey: 'settings.account.security.passkeyBenefitNoPasswordDesc',
  },
] as const

export default function PasskeyEnrollmentPrompt({
  open,
  onSnooze,
  onIgnore,
  onSuccess,
}: PasskeyEnrollmentPromptProps) {
  const { t } = useTranslation()
  const { enrollPasskeyFromRecentLogin } = useAuth()
  const { trackAuth, EventAction } = useAnalytics()

  useEffect(() => {
    if (!open) return
    trackAuth(EventAction.VIEW, { surface: 'post_login_passkey_prompt' })
  }, [EventAction.VIEW, open, trackAuth])

  const addPasskeyMutation = useMutation({
    mutationFn: async () => enrollPasskeyFromRecentLogin(),
    onSuccess: async () => {
      trackAuth(EventAction.COMPLETE, {
        surface: 'post_login_passkey_prompt',
        operation: 'enroll_passkey',
      })
      toast.success(t('settings.account.security.passkeyAddedToast'))
      await onSuccess()
    },
    onError: (error: unknown) => {
      trackAuth(EventAction.FAIL, {
        surface: 'post_login_passkey_prompt',
        operation: 'enroll_passkey',
      })
      toast.error(
        translateBackendKey(getApiErrorDetail(error)) ||
          t('settings.account.security.passkeyAddFailed')
      )
    },
  })

  const isPending = addPasskeyMutation.isPending

  const handleClose = () => {
    if (isPending) return
    trackAuth('Snooze', { surface: 'post_login_passkey_prompt' })
    onSnooze()
  }

  const handleIgnore = () => {
    if (isPending) return
    trackAuth('Ignore', { surface: 'post_login_passkey_prompt' })
    onIgnore()
  }

  const handleSubmit = () => {
    trackAuth(EventAction.START, {
      surface: 'post_login_passkey_prompt',
      operation: 'enroll_passkey',
    })
    void addPasskeyMutation.mutateAsync()
  }

  return (
    <ResponsiveDialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      {/* Hero section */}
      <div className="pt-8 pb-5 px-6 flex flex-col items-center text-center relative overflow-hidden">
        {/* Fingerprint icon */}
        <div className="relative mb-5 flex items-center justify-center">
          <div
            aria-hidden="true"
            className="absolute w-24 h-24 rounded-full border border-border animate-ping"
            style={{ animationDuration: '2.4s' }}
          />
          <div
            aria-hidden="true"
            className="absolute w-20 h-20 rounded-full border border-border"
          />
          <div className="w-16 h-16 rounded-full flex items-center justify-center relative z-10 bg-muted border border-border">
            <Fingerprint size={28} className="text-primary" strokeWidth={1.5} />
          </div>
        </div>

        <h3 className="text-lg font-bold tracking-tight mb-2">
          {t('settings.account.security.passkeyPromptTitle')}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-[300px]">
          {t('settings.account.security.passkeyPromptDescription')}
        </p>
      </div>

      {/* Benefits */}
      <div className="flex flex-col gap-2 px-6 pb-4">
        {BENEFITS.map(({ icon: Icon, titleKey, descKey }) => (
          <div
            key={titleKey}
            className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30"
          >
            <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 bg-muted">
              <Icon size={16} className="text-foreground" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-[0.8125rem] font-semibold leading-tight mb-0.5">{t(titleKey)}</p>
              <p className="text-xs text-muted-foreground leading-snug">{t(descKey)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="px-6 pb-6 pt-1">
        <Button
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full mb-3 h-12 text-base font-semibold"
        >
          {isPending ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              {t('settings.account.security.passkeyPromptConfirm')}
            </>
          ) : (
            <>
              <Fingerprint size={18} className="mr-2" />
              {t('settings.account.security.passkeyPromptConfirm')}
            </>
          )}
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
            className="flex-1 h-10 text-[0.8125rem]"
          >
            {t('settings.account.security.passkeyPromptSnooze')}
          </Button>
          <Button
            variant="ghost"
            onClick={handleIgnore}
            disabled={isPending}
            className="flex-1 h-10 text-[0.8125rem] text-muted-foreground"
          >
            {t('settings.account.security.passkeyPromptIgnore')}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  )
}
