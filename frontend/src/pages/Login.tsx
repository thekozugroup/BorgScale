import { useCallback, useEffect, useRef, useState } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth.tsx'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import PasswordSetupCard from './FirstLoginPasswordSetup'
import { useAnalytics } from '../hooks/useAnalytics'
import { getApiErrorDetail } from '../utils/apiErrors'
import { translateBackendKey } from '../utils/translateBackendKey'
import { authAPI } from '../services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LoginForm {
  username: string
  password: string
}

function hasErrorName(error: unknown, name: string) {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === name
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Login() {
  const [showPasswordSetupState, setShowPasswordSetup] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [totpCode, setTotpCode] = useState('')
  const [pendingChallengeToken, setPendingChallengeToken] = useState<string | null>(null)
  const [pendingUsername, setPendingUsername] = useState<string | null>(null)
  const conditionalPasskeyAbortRef = useRef<AbortController | null>(null)
  const { login, verifyTotpLogin, loginWithPasskey, mustChangePassword } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  usePageTitle(t('auth.signIn', 'Sign in'))
  const { trackAuth, EventAction } = useAnalytics()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>()

  const handleSuccessfulLogin = useCallback(
    (
      _username: string | null,
      mustChangePassword: boolean,
      method: 'password' | 'totp' | 'passkey' | 'passkey_autofill'
    ) => {
      trackAuth(EventAction.LOGIN, { method, requires_password_setup: mustChangePassword })
      toast.success(t('login.success'))
      if (mustChangePassword) {
        setShowPasswordSetup(true)
      } else {
        navigate('/dashboard')
      }
    },
    [EventAction.LOGIN, navigate, t, trackAuth]
  )

  useEffect(() => {
    if (pendingChallengeToken) return

    let cancelled = false

    const startConditionalPasskey = async () => {
      try {
        const { getConditionalPasskeyAssertion, isConditionalMediationAvailable } =
          await import('../utils/webauthn')
        if (!(await isConditionalMediationAvailable())) {
          return
        }

        const startResponse = await authAPI.beginPasskeyAuthentication()
        if (cancelled) return

        conditionalPasskeyAbortRef.current = new AbortController()
        const credential = await getConditionalPasskeyAssertion(
          startResponse.data.options,
          conditionalPasskeyAbortRef.current.signal
        )
        if (cancelled) return

        setIsLoading(true)
        const finishResponse = await authAPI.finishPasskeyAuthentication(
          startResponse.data.ceremony_token,
          credential
        )
        const { access_token, must_change_password } = finishResponse.data
        if (!access_token) {
          throw new Error('Missing access token')
        }
        localStorage.setItem('access_token', access_token)
        handleSuccessfulLogin(null, must_change_password || false, 'passkey_autofill')
      } catch (error: unknown) {
        if (hasErrorName(error, 'AbortError') || cancelled) {
          return
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void startConditionalPasskey()

    return () => {
      cancelled = true
      conditionalPasskeyAbortRef.current?.abort()
      conditionalPasskeyAbortRef.current = null
    }
  }, [handleSuccessfulLogin, pendingChallengeToken])

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      const result = await login(data.username, data.password)
      if (result.totpRequired) {
        setPendingChallengeToken(result.loginChallengeToken)
        setPendingUsername(data.username)
        setTotpCode('')
        toast.success(t('login.totpRequired'))
      } else {
        handleSuccessfulLogin(data.username, result.mustChangePassword, 'password')
      }
    } catch (error: unknown) {
      toast.error(translateBackendKey(getApiErrorDetail(error)) || t('login.failed'))
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitTotp = async () => {
    if (!pendingChallengeToken || !pendingUsername) return
    setIsLoading(true)
    try {
      const result = await verifyTotpLogin(pendingChallengeToken, totpCode)
      handleSuccessfulLogin(pendingUsername, result.mustChangePassword, 'totp')
    } catch (error: unknown) {
      toast.error(translateBackendKey(getApiErrorDetail(error)) || t('login.failed'))
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitPasskey = async () => {
    setIsLoading(true)
    trackAuth(EventAction.START, { method: 'passkey', surface: 'login' })
    try {
      conditionalPasskeyAbortRef.current?.abort()
      conditionalPasskeyAbortRef.current = null
      const result = await loginWithPasskey()
      handleSuccessfulLogin(null, result.mustChangePassword, 'passkey')
    } catch (error: unknown) {
      if (
        hasErrorName(error, 'NotAllowedError') ||
        hasErrorName(error, 'AbortError') ||
        hasErrorName(error, 'InvalidStateError')
      ) {
        trackAuth('Cancel', { method: 'passkey', surface: 'login' })
        toast.error(t('login.passkeyCancelled'))
      } else {
        trackAuth(EventAction.FAIL, { method: 'passkey', surface: 'login' })
        toast.error(translateBackendKey(getApiErrorDetail(error)) || t('login.failed'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const showPasswordSetup = mustChangePassword || showPasswordSetupState

  if (showPasswordSetup) {
    return <PasswordSetupCard onComplete={() => navigate('/dashboard')} />
  }

  return (
    <>
      {/* Heading */}
      <div className="mb-7">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-1.5">
          {t('login.submit')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('login.subtitle')}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="flex flex-col gap-[18px]">
          {!pendingChallengeToken ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="username">{t('login.username')}</Label>
                <Input
                  {...register('username', {
                    required: t('login.errors.usernameRequired'),
                  })}
                  id="username"
                  type="text"
                  autoComplete="username webauthn"
                  placeholder="admin"
                  aria-invalid={errors.username ? true : undefined}
                />
                {errors.username && (
                  <p className="text-xs text-destructive mt-0.5" role="alert">
                    {errors.username.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">{t('login.password')}</Label>
                <div className="relative">
                  <Input
                    {...register('password', {
                      required: t('login.errors.passwordRequired'),
                    })}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="pr-10"
                    aria-invalid={errors.password ? true : undefined}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive mt-0.5" role="alert">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2.5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('login.totpPrompt')}
              </p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="totp-code">{t('login.totpLabel')}</Label>
                <Input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={totpCode}
                  onChange={(event) => setTotpCode(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">{t('login.totpHint')}</p>
              </div>
            </div>
          )}

          {/* Submit */}
          <Button
            type={pendingChallengeToken ? 'button' : 'submit'}
            onClick={pendingChallengeToken ? () => void onSubmitTotp() : undefined}
            disabled={isLoading}
            className="mt-1 w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={15} />
                {t('login.submitting')}
              </>
            ) : pendingChallengeToken ? (
              t('login.verifyTotp')
            ) : (
              t('login.submit')
            )}
          </Button>

          {pendingChallengeToken && (
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              className="w-full"
              size="lg"
              onClick={() => {
                setPendingChallengeToken(null)
                setPendingUsername(null)
                setTotpCode('')
              }}
            >
              {t('common.buttons.back')}
            </Button>
          )}

          {!pendingChallengeToken && (
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              className="w-full"
              size="lg"
              onClick={() => void onSubmitPasskey()}
            >
              {t('login.passkeySubmit')}
            </Button>
          )}
        </div>
      </form>
    </>
  )
}
