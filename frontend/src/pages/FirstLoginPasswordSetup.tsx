import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-hot-toast'
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAnalytics } from '../hooks/useAnalytics'
import { getApiErrorDetail } from '../utils/apiErrors'
import { translateBackendKey } from '../utils/translateBackendKey'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Card content shown inside the Login page's AuthLayout when the user
 * needs to set a new password after first login. Not a standalone page.
 */
export default function PasswordSetupCard({ onComplete }: { onComplete: () => void }) {
  const { t } = useTranslation()
  const { canChangePasswordFromRecentLogin, changePasswordFromRecentLogin, skipPasswordSetup } =
    useAuth()
  const { trackAuth, EventAction } = useAnalytics()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    trackAuth(EventAction.VIEW, { surface: 'first_login_password_setup' })
  }, [EventAction.VIEW, trackAuth])

  const changePasswordMutation = useMutation({
    mutationFn: async () => changePasswordFromRecentLogin(newPassword),
    onSuccess: () => {
      trackAuth(EventAction.COMPLETE, {
        surface: 'first_login_password_setup',
        operation: 'change_password',
      })
      toast.success(t('settings.toasts.passwordChanged'))
      onComplete()
    },
    onError: (error: unknown) => {
      trackAuth(EventAction.FAIL, {
        surface: 'first_login_password_setup',
        operation: 'change_password',
      })
      toast.error(
        translateBackendKey(getApiErrorDetail(error)) || t('settings.toasts.failedToChangePassword')
      )
    },
  })

  const skipSetupMutation = useMutation({
    mutationFn: async () => skipPasswordSetup(),
    onSuccess: () => {
      trackAuth('Skip', {
        surface: 'first_login_password_setup',
        operation: 'change_password',
      })
      onComplete()
    },
    onError: (error: unknown) => {
      trackAuth(EventAction.FAIL, {
        surface: 'first_login_password_setup',
        operation: 'skip_password_change',
      })
      toast.error(
        translateBackendKey(getApiErrorDetail(error)) || t('common.errors.unexpectedError')
      )
    },
  })

  const passwordsMismatch = confirmPassword !== '' && newPassword !== confirmPassword
  const isLoading = changePasswordMutation.isPending || skipSetupMutation.isPending
  const canSubmit =
    !isLoading && canChangePasswordFromRecentLogin && !!newPassword && !!confirmPassword

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordsMismatch) {
      trackAuth(EventAction.FAIL, {
        surface: 'first_login_password_setup',
        operation: 'change_password_validation',
        reason: 'password_mismatch',
      })
      toast.error(t('settings.toasts.passwordsDoNotMatch'))
      return
    }
    void changePasswordMutation.mutateAsync()
  }

  const handleSkip = () => {
    void skipSetupMutation.mutateAsync()
  }

  return (
    <>
      {/* Heading */}
      <div className="mb-7">
        <h2 className="text-[1.375rem] font-semibold tracking-tight text-foreground mb-1.5">
          {t('firstLoginSetup.title')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('firstLoginSetup.description')}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-[18px]">
          {/* New password */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password">{t('settings.password.new')}</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowNewPassword((v) => !v)}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </div>
          </div>

          {/* Confirm password */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-password">{t('settings.password.confirm')}</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-10"
                aria-invalid={passwordsMismatch ? true : undefined}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </div>
            {passwordsMismatch && (
              <p className="text-xs text-destructive mt-0.5" role="alert">
                {t('settings.password.noMatch')}
              </p>
            )}
          </div>

          {/* Primary action */}
          <Button
            type="submit"
            disabled={!canSubmit}
            className="mt-1 w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={15} />
                {t('login.submitting')}
              </>
            ) : (
              <>
                {t('common.buttons.next')}
                <ArrowRight size={15} />
              </>
            )}
          </Button>

          {/* Skip */}
          <Button
            type="button"
            variant="outline"
            onClick={handleSkip}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {skipSetupMutation.isPending ? (
              <>
                <Loader2 className="animate-spin" size={15} />
                {t('login.submitting')}
              </>
            ) : (
              t('firstLoginSetup.skip')
            )}
          </Button>
        </div>
      </form>

      {/* Skip hint */}
      <p className="mt-4 text-xs text-muted-foreground text-center">
        {t('firstLoginSetup.skipHint')}
      </p>
    </>
  )
}
