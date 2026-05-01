import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery } from '@tanstack/react-query'
import { authAPI, settingsAPI } from '../services/api'
import { toast } from 'react-hot-toast'
import QRCode from 'qrcode'
import { useAuth } from '../hooks/useAuth'
import { useAnalytics } from '../hooks/useAnalytics'
import { getApiErrorDetail } from '../utils/apiErrors'
import { getGlobalRolePresentation } from '../utils/rolePresentation'
import { translateBackendKey } from '../utils/translateBackendKey'
import AccountTabHeader from './AccountTabHeader'
import AccountProfileSection, {
  AccountProfileFormData,
  DeploymentProfileFormData,
} from './AccountProfileSection'
import AccountAccessSection from './AccountAccessSection'
import AccountPasswordDialog from './AccountPasswordDialog'
import AccountTabNavigation, { AccountView } from './AccountTabNavigation'
import { createPasskeyCredential } from '../utils/webauthn'
import { getDefaultPasskeyDeviceName } from '../utils/passkeyDeviceName'
import AccountSecuritySettingsSection from './AccountSecuritySettingsSection'
import ResponsiveDialog from './ResponsiveDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

const AccountTab: React.FC = () => {
  const { t } = useTranslation()
  const {
    user,
    hasGlobalPermission,
    refreshUser,
    proxyAuthEnabled,
    markRecentPasswordConfirmation,
  } = useAuth()
  const { trackSettings, EventAction } = useAnalytics()
  const canManageSystem = hasGlobalPermission('settings.system.manage')
  const hasGlobalRepositoryAccess = hasGlobalPermission('repositories.manage_all')

  const [accountView, setAccountView] = useState<AccountView>('profile')
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false)
  const [showEditProfileDialog, setShowEditProfileDialog] = useState(false)
  const [changePasswordForm, setChangePasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [profileForm, setProfileForm] = useState<AccountProfileFormData>({
    username: '',
    email: '',
    full_name: '',
  })
  const [deploymentForm, setDeploymentForm] = useState<DeploymentProfileFormData>({
    deployment_type: 'individual' as 'individual' | 'enterprise',
    enterprise_name: '',
  })
  const [showTotpSetupDialog, setShowTotpSetupDialog] = useState(false)
  const [showTotpDisableDialog, setShowTotpDisableDialog] = useState(false)
  const [totpSetupPassword, setTotpSetupPassword] = useState('')
  const [totpSetupToken, setTotpSetupToken] = useState<string | null>(null)
  const [totpSecret, setTotpSecret] = useState('')
  const [totpOtpAuthUri, setTotpOtpAuthUri] = useState('')
  const [totpQrCodeDataUrl, setTotpQrCodeDataUrl] = useState('')
  const [totpRecoveryCodes, setTotpRecoveryCodes] = useState<string[]>([])
  const [totpVerificationCode, setTotpVerificationCode] = useState('')
  const [totpDisablePassword, setTotpDisablePassword] = useState('')
  const [totpDisableCode, setTotpDisableCode] = useState('')
  const [showPasskeyDialog, setShowPasskeyDialog] = useState(false)
  const [passkeyPassword, setPasskeyPassword] = useState('')
  const { data: totpStatus, refetch: refetchTotpStatus } = useQuery({
    queryKey: ['auth', 'totp-status'],
    queryFn: async () => {
      const response = await authAPI.getTotpStatus()
      return response.data
    },
    enabled: !!user && !proxyAuthEnabled,
  })

  const { data: passkeys = [], refetch: refetchPasskeys } = useQuery({
    queryKey: ['auth', 'passkeys'],
    queryFn: async () => {
      const response = await authAPI.listPasskeys()
      return response.data
    },
    enabled: !!user && !proxyAuthEnabled,
  })

  const changePasswordMutation = useMutation({
    mutationFn: (passwordData: { current_password: string; new_password: string }) =>
      settingsAPI.changePassword(passwordData),
    onSuccess: async () => {
      toast.success(t('settings.toasts.passwordChanged'))
      markRecentPasswordConfirmation(changePasswordForm.new_password)
      setChangePasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      setShowChangePasswordDialog(false)
      await refreshUser()
      trackSettings(EventAction.EDIT, { section: 'account', operation: 'change_password' })
    },
    onError: (error: unknown) => {
      toast.error(
        translateBackendKey(getApiErrorDetail(error)) || t('settings.toasts.failedToChangePassword')
      )
    },
  })

  const beginTotpSetupMutation = useMutation({
    mutationFn: (currentPassword: string) => authAPI.beginTotpSetup(currentPassword),
    onSuccess: ({ data }) => {
      setTotpSetupToken(data.setup_token)
      setTotpSecret(data.secret)
      setTotpOtpAuthUri(data.otpauth_uri)
      setTotpRecoveryCodes(data.recovery_codes)
      toast.success(t('settings.account.security.totpSetupStarted'))
    },
    onError: (error: unknown) => {
      toast.error(
        translateBackendKey(getApiErrorDetail(error)) ||
          t('settings.account.security.totpSetupFailed')
      )
    },
  })

  const enableTotpMutation = useMutation({
    mutationFn: () => {
      if (!totpSetupToken) throw new Error('Missing setup token')
      return authAPI.enableTotp(totpSetupToken, totpVerificationCode)
    },
    onSuccess: async ({ data }) => {
      toast.success(t('settings.account.security.totpEnabledToast'))
      setTotpRecoveryCodes(data.recovery_codes)
      await refreshUser()
      await refetchTotpStatus()
    },
    onError: (error: unknown) => {
      toast.error(
        translateBackendKey(getApiErrorDetail(error)) ||
          t('settings.account.security.totpEnableFailed')
      )
    },
  })

  const disableTotpMutation = useMutation({
    mutationFn: () => authAPI.disableTotp(totpDisablePassword, totpDisableCode),
    onSuccess: async () => {
      toast.success(t('settings.account.security.totpDisabledToast'))
      setShowTotpDisableDialog(false)
      setTotpDisablePassword('')
      setTotpDisableCode('')
      setTotpRecoveryCodes([])
      await refreshUser()
      await refetchTotpStatus()
    },
    onError: (error: unknown) => {
      toast.error(
        translateBackendKey(getApiErrorDetail(error)) ||
          t('settings.account.security.totpDisableFailed')
      )
    },
  })

  const addPasskeyMutation = useMutation({
    mutationFn: async () => {
      const beginResponse = await authAPI.beginPasskeyRegistration(passkeyPassword)
      const credential = await createPasskeyCredential(beginResponse.data.options)
      return authAPI.finishPasskeyRegistration(
        beginResponse.data.ceremony_token,
        credential,
        getDefaultPasskeyDeviceName()
      )
    },
    onSuccess: async () => {
      toast.success(t('settings.account.security.passkeyAddedToast'))
      setShowPasskeyDialog(false)
      setPasskeyPassword('')
      await refreshUser()
      await refetchPasskeys()
      trackSettings(EventAction.CREATE, {
        section: 'account',
        operation: 'add_passkey',
        surface: 'security',
      })
    },
    onError: (error: unknown) => {
      toast.error(
        translateBackendKey(getApiErrorDetail(error)) ||
          t('settings.account.security.passkeyAddFailed')
      )
    },
  })

  const deletePasskeyMutation = useMutation({
    mutationFn: (passkeyId: number) => authAPI.deletePasskey(passkeyId),
    onSuccess: async () => {
      toast.success(t('settings.account.security.passkeyDeletedToast'))
      await refreshUser()
      await refetchPasskeys()
      trackSettings(EventAction.DELETE, {
        section: 'account',
        operation: 'delete_passkey',
        surface: 'security',
      })
    },
    onError: (error: unknown) => {
      toast.error(
        translateBackendKey(getApiErrorDetail(error)) ||
          t('settings.account.security.passkeyDeleteFailed')
      )
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (data: AccountProfileFormData) => {
      await settingsAPI.updateProfile({
        username: data.username,
        email: data.email,
        full_name: data.full_name,
      })
    },
    onSuccess: async () => {
      toast.success(t('settings.account.toasts.profileUpdated'))
      await refreshUser()
      trackSettings(EventAction.EDIT, { section: 'account', operation: 'update_personal_profile' })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        translateBackendKey(error.response?.data?.detail) ||
          t('settings.account.toasts.failedToUpdateProfile')
      )
    },
  })

  const updateDeploymentMutation = useMutation({
    mutationFn: async (data: DeploymentProfileFormData) => {
      await settingsAPI.updateSystemSettings({
        deployment_type: data.deployment_type,
        enterprise_name: data.deployment_type === 'enterprise' ? data.enterprise_name : null,
      } as Parameters<typeof settingsAPI.updateSystemSettings>[0])
    },
    onSuccess: async () => {
      toast.success(t('settings.account.toasts.deploymentUpdated'))
      await refreshUser()
      trackSettings(EventAction.EDIT, {
        section: 'account',
        operation: 'update_deployment_profile',
      })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        translateBackendKey(error.response?.data?.detail) ||
          t('settings.account.toasts.failedToUpdateDeployment')
      )
    },
  })

  const setAccountSurface = (view: AccountView) => {
    setAccountView(view)
    trackSettings(EventAction.VIEW, { section: 'account', surface: view })
  }

  const username = user?.username || ''
  const email = user?.email || ''
  const fullName = user?.full_name || ''
  const userId = user?.id
  const deploymentType = user?.deployment_type === 'enterprise' ? 'enterprise' : 'individual'
  const enterpriseName = user?.enterprise_name || ''

  const currentUserRolePresentation = getGlobalRolePresentation(user?.role, t)
  const showSecurityTab = !proxyAuthEnabled

  useEffect(() => {
    if (!userId) return
    setProfileForm({ username, email, full_name: fullName })
    setDeploymentForm({ deployment_type: deploymentType, enterprise_name: enterpriseName })
  }, [deploymentType, email, enterpriseName, fullName, userId, username])

  useEffect(() => {
    let cancelled = false
    if (!totpOtpAuthUri) { setTotpQrCodeDataUrl(''); return }
    QRCode.toDataURL(totpOtpAuthUri, { width: 220, margin: 1, errorCorrectionLevel: 'M' })
      .then((dataUrl: string) => { if (!cancelled) setTotpQrCodeDataUrl(dataUrl) })
      .catch(() => { if (!cancelled) setTotpQrCodeDataUrl('') })
    return () => { cancelled = true }
  }, [totpOtpAuthUri])

  useEffect(() => {
    if (!showSecurityTab && accountView === 'security') setAccountView('profile')
  }, [accountView, showSecurityTab])

  const closeTotpSetupDialog = () => {
    setShowTotpSetupDialog(false)
    setTotpSetupPassword('')
    setTotpSetupToken(null)
    setTotpSecret('')
    setTotpOtpAuthUri('')
    setTotpQrCodeDataUrl('')
    setTotpVerificationCode('')
    setTotpRecoveryCodes([])
  }

  const dialogFooter = (onCancel: () => void, onConfirm: () => void, confirmLabel: string, confirmDisabled: boolean, confirmLoading?: boolean) => (
    <div className="flex items-center justify-end gap-2 px-5 py-3">
      <Button variant="outline" size="sm" onClick={onCancel}>{t('common.buttons.cancel')}</Button>
      <Button size="sm" disabled={confirmDisabled} onClick={onConfirm} className="gap-1.5">
        {confirmLoading && <Loader2 size={13} className="animate-spin" />}
        {confirmLabel}
      </Button>
    </div>
  )

  return (
    <>
      <div className="flex flex-col gap-6">
        <AccountTabHeader />

        <div className="border border-border rounded-2xl overflow-hidden">
          <AccountTabNavigation
            value={accountView}
            onChange={setAccountSurface}
            showSecurityTab={showSecurityTab}
          />
          <div className="p-4 md:p-5">
            {accountView === 'profile' && (
              <AccountProfileSection
                canManageSystem={canManageSystem}
                profileForm={profileForm}
                deploymentForm={deploymentForm}
                isSavingProfile={updateProfileMutation.isPending}
                isSavingDeployment={updateDeploymentMutation.isPending}
                roleLabel={currentUserRolePresentation.label}
                isAdmin={currentUserRolePresentation.isAdminRole}
                isOperator={currentUserRolePresentation.isOperatorRole}
                createdAt={user?.created_at || ''}
                totpEnabled={!!user?.totp_enabled}
                passkeyCount={user?.passkey_count ?? 0}
                onProfileFormChange={(updates) => setProfileForm((c) => ({ ...c, ...updates }))}
                onDeploymentFormChange={(updates) => setDeploymentForm((c) => ({ ...c, ...updates }))}
                onSaveProfile={() => updateProfileMutation.mutate(profileForm)}
                onSaveDeployment={() => updateDeploymentMutation.mutate(deploymentForm)}
                onOpenChangePassword={() => {
                  setShowChangePasswordDialog(true)
                  trackSettings(EventAction.VIEW, { section: 'account', operation: 'open_change_password_dialog' })
                }}
                onOpenEditProfile={() => {
                  setShowEditProfileDialog(true)
                  trackSettings(EventAction.VIEW, { section: 'account', operation: 'open_edit_profile_dialog' })
                }}
              />
            )}

            {accountView === 'security' && showSecurityTab && (
              <AccountSecuritySettingsSection
                totpEnabled={!!user?.totp_enabled}
                recoveryCodesRemaining={totpStatus?.recovery_codes_remaining ?? 0}
                totpLoading={
                  beginTotpSetupMutation.isPending ||
                  enableTotpMutation.isPending ||
                  disableTotpMutation.isPending
                }
                onEnableTotp={() => setShowTotpSetupDialog(true)}
                onDisableTotp={() => setShowTotpDisableDialog(true)}
                passkeys={passkeys}
                passkeysLoading={addPasskeyMutation.isPending || deletePasskeyMutation.isPending}
                onAddPasskey={() => setShowPasskeyDialog(true)}
                onDeletePasskey={(passkeyId) => deletePasskeyMutation.mutate(passkeyId)}
              />
            )}

            {accountView === 'access' && (
              <AccountAccessSection hasGlobalRepositoryAccess={hasGlobalRepositoryAccess} />
            )}
          </div>
        </div>
      </div>

      <AccountPasswordDialog
        open={showChangePasswordDialog}
        currentPassword={changePasswordForm.current_password}
        newPassword={changePasswordForm.new_password}
        confirmPassword={changePasswordForm.confirm_password}
        isSubmitting={changePasswordMutation.isPending}
        onClose={() => setShowChangePasswordDialog(false)}
        onFormChange={(updates) => setChangePasswordForm((c) => ({ ...c, ...updates }))}
        onSubmit={() => {
          if (changePasswordForm.new_password !== changePasswordForm.confirm_password) {
            toast.error(t('settings.toasts.passwordsDoNotMatch'))
            return
          }
          changePasswordMutation.mutate({
            current_password: changePasswordForm.current_password,
            new_password: changePasswordForm.new_password,
          })
        }}
      />

      {/* Edit profile dialog */}
      <ResponsiveDialog
        open={showEditProfileDialog}
        onClose={() => setShowEditProfileDialog(false)}
        fullWidth
        maxWidth="sm"
        footer={dialogFooter(
          () => setShowEditProfileDialog(false),
          () => updateProfileMutation.mutate(profileForm, { onSuccess: () => setShowEditProfileDialog(false) }),
          updateProfileMutation.isPending ? t('settings.account.profile.saving') : t('settings.account.profile.saveButton'),
          updateProfileMutation.isPending,
          updateProfileMutation.isPending
        )}
      >
        <div className="px-5 pt-5 pb-4">
          <p className="text-base font-semibold mb-1">{t('settings.account.profile.title')}</p>
          <p className="text-sm text-muted-foreground mb-4">{t('settings.account.profile.description')}</p>
          <div className="flex flex-col gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">{t('settings.users.fields.username')} *</Label>
              <Input value={profileForm.username} onChange={(e) => setProfileForm((c) => ({ ...c, username: e.target.value }))} className="h-9 text-sm" required />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">{t('settings.users.fields.email')} *</Label>
              <Input type="email" value={profileForm.email} onChange={(e) => setProfileForm((c) => ({ ...c, email: e.target.value }))} className="h-9 text-sm" required />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">{t('settings.users.fields.fullName')}</Label>
              <Input value={profileForm.full_name} onChange={(e) => setProfileForm((c) => ({ ...c, full_name: e.target.value }))} className="h-9 text-sm" />
            </div>
          </div>
        </div>
      </ResponsiveDialog>

      {/* TOTP setup dialog */}
      <ResponsiveDialog
        open={showTotpSetupDialog}
        onClose={closeTotpSetupDialog}
        fullWidth
        maxWidth="sm"
        footer={
          <div className="flex items-center justify-end gap-2 px-5 py-3">
            <Button variant="outline" size="sm" onClick={closeTotpSetupDialog}>{t('common.buttons.cancel')}</Button>
            {!totpSetupToken ? (
              <Button size="sm" disabled={!totpSetupPassword || beginTotpSetupMutation.isPending} onClick={() => beginTotpSetupMutation.mutate(totpSetupPassword)} className="gap-1.5">
                {beginTotpSetupMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                {t('common.buttons.next')}
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={!totpVerificationCode || enableTotpMutation.isPending}
                onClick={() => enableTotpMutation.mutate(undefined, {
                  onSuccess: () => {
                    setShowTotpSetupDialog(false)
                    setTotpSetupPassword('')
                    setTotpSetupToken(null)
                    setTotpSecret('')
                    setTotpOtpAuthUri('')
                    setTotpQrCodeDataUrl('')
                    setTotpVerificationCode('')
                  },
                })}
                className="gap-1.5"
              >
                {enableTotpMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                {t('settings.account.security.enableTotp')}
              </Button>
            )}
          </div>
        }
      >
        <div className="px-5 pt-5 pb-4">
          <p className="text-base font-semibold mb-4">{t('settings.account.security.enableTotp')}</p>
          {!totpSetupToken ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">{t('settings.account.security.totpSetupIntro')}</p>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">{t('settings.account.security.currentPasswordLabel')}</Label>
                <Input type="password" value={totpSetupPassword} onChange={(e) => setTotpSetupPassword(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">{t('settings.account.security.totpSetupInstructions')}</p>
              {totpQrCodeDataUrl && (
                <div className="p-4 rounded-xl bg-muted flex flex-col items-center gap-3">
                  <img src={totpQrCodeDataUrl} alt={t('settings.account.security.totpQrCodeAlt')} className="w-56 max-w-full rounded-xl bg-white p-2" />
                  <p className="text-xs text-muted-foreground text-center">{t('settings.account.security.totpQrCodeHint')}</p>
                </div>
              )}
              <div className="p-3 rounded-xl bg-muted">
                <p className="text-xs text-muted-foreground mb-1">{t('settings.account.security.manualSecret')}</p>
                <p className="text-sm font-bold break-all" style={{ fontFamily: 'monospace' }}>{totpSecret}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted">
                <p className="text-xs text-muted-foreground mb-2">{t('settings.account.security.recoveryCodesTitle')}</p>
                <div className="flex flex-wrap gap-2">
                  {totpRecoveryCodes.map((code) => (
                    <span key={code} className="px-2 py-1 rounded bg-background text-xs font-mono">{code}</span>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">{t('settings.account.security.totpVerificationLabel')}</Label>
                <Input value={totpVerificationCode} onChange={(e) => setTotpVerificationCode(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
          )}
        </div>
      </ResponsiveDialog>

      {/* TOTP disable dialog */}
      <ResponsiveDialog
        open={showTotpDisableDialog}
        onClose={() => setShowTotpDisableDialog(false)}
        fullWidth
        maxWidth="sm"
        footer={
          <div className="flex items-center justify-end gap-2 px-5 py-3">
            <Button variant="outline" size="sm" onClick={() => setShowTotpDisableDialog(false)}>{t('common.buttons.cancel')}</Button>
            <Button size="sm" variant="destructive" disabled={!totpDisablePassword || !totpDisableCode || disableTotpMutation.isPending} onClick={() => disableTotpMutation.mutate()} className="gap-1.5">
              {disableTotpMutation.isPending && <Loader2 size={13} className="animate-spin" />}
              {t('settings.account.security.disableTotp')}
            </Button>
          </div>
        }
      >
        <div className="px-5 pt-5 pb-4">
          <p className="text-base font-semibold mb-4">{t('settings.account.security.disableTotp')}</p>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{t('settings.account.security.totpDisableIntro')}</p>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">{t('settings.account.security.currentPasswordLabel')}</Label>
              <Input type="password" value={totpDisablePassword} onChange={(e) => setTotpDisablePassword(e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">{t('settings.account.security.totpVerificationLabel')}</Label>
              <Input value={totpDisableCode} onChange={(e) => setTotpDisableCode(e.target.value)} className="h-9 text-sm" />
              <p className="text-xs text-muted-foreground mt-1">{t('settings.account.security.totpDisableHint')}</p>
            </div>
          </div>
        </div>
      </ResponsiveDialog>

      {/* Add passkey dialog */}
      <ResponsiveDialog
        open={showPasskeyDialog}
        onClose={() => setShowPasskeyDialog(false)}
        fullWidth
        maxWidth="sm"
        footer={
          <div className="flex items-center justify-end gap-2 px-5 py-3">
            <Button variant="outline" size="sm" onClick={() => setShowPasskeyDialog(false)}>{t('common.buttons.cancel')}</Button>
            <Button size="sm" disabled={!passkeyPassword || addPasskeyMutation.isPending} onClick={() => addPasskeyMutation.mutate()} className="gap-1.5">
              {addPasskeyMutation.isPending && <Loader2 size={13} className="animate-spin" />}
              {t('settings.account.security.addPasskey')}
            </Button>
          </div>
        }
      >
        <div className="px-5 pt-5 pb-4">
          <p className="text-base font-semibold mb-4">{t('settings.account.security.addPasskey')}</p>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{t('settings.account.security.passkeySetupIntro')}</p>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">{t('settings.account.security.currentPasswordLabel')}</Label>
              <Input type="password" value={passkeyPassword} onChange={(e) => setPasskeyPassword(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
        </div>
      </ResponsiveDialog>
    </>
  )
}

export default AccountTab
