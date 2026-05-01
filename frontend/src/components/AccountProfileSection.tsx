import { User, Building2, Pencil, ShieldCheck, KeyRound, Calendar, Fingerprint, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import AccountSecuritySection from './AccountSecuritySection'
import { formatDateShort } from '../utils/dateUtils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface AccountProfileFormData {
  username: string
  email: string
  full_name: string
}

export interface DeploymentProfileFormData {
  deployment_type: 'individual' | 'enterprise'
  enterprise_name: string
}

interface AccountProfileSectionProps {
  canManageSystem: boolean
  profileForm: AccountProfileFormData
  deploymentForm: DeploymentProfileFormData
  isSavingProfile: boolean
  isSavingDeployment: boolean
  onProfileFormChange: (updates: Partial<AccountProfileFormData>) => void
  onDeploymentFormChange: (updates: Partial<DeploymentProfileFormData>) => void
  onSaveProfile: () => void
  onSaveDeployment: () => void
  onOpenChangePassword: () => void
  onOpenEditProfile: () => void
  roleLabel: string
  isAdmin: boolean
  isOperator: boolean
  createdAt: string
  totpEnabled: boolean
  passkeyCount: number
}

export default function AccountProfileSection({
  canManageSystem,
  profileForm,
  deploymentForm,
  isSavingDeployment,
  onDeploymentFormChange,
  onSaveDeployment,
  onOpenChangePassword,
  onOpenEditProfile,
  roleLabel,
  isAdmin,
  isOperator,
  createdAt,
  totpEnabled,
  passkeyCount,
}: AccountProfileSectionProps) {
  const { t } = useTranslation()

  const RoleIcon = isAdmin ? ShieldCheck : isOperator ? KeyRound : User

  return (
    <div className="flex flex-col gap-7">
      {/* ── Info banner ── */}
      <div className="px-4 md:px-6 py-5 md:py-6 rounded-2xl border border-border bg-muted/20">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-muted border border-border">
                <User size={16} />
              </div>
              <div>
                <p className="text-2xs font-bold uppercase tracking-[0.08em] mb-0.5 text-muted-foreground">
                  {t('settings.account.profile.title')}
                </p>
                <p className="text-lg font-bold leading-tight">
                  {profileForm.full_name || profileForm.username}
                </p>
              </div>
            </div>

            {/* ── Badges ── */}
            <div className="flex flex-wrap gap-1.5">
              {/* Role badge */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border border-border bg-muted text-foreground">
                <RoleIcon size={12} />
                {roleLabel}
              </span>

              {totpEnabled && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border border-border bg-primary/10 text-foreground">
                  <ShieldCheck size={12} />
                  {t('settings.account.profile.badges.totpActive')}
                </span>
              )}

              {passkeyCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border border-border bg-muted text-foreground">
                  <Fingerprint size={12} />
                  {t('settings.account.profile.badges.passkeyActive', { count: passkeyCount })}
                </span>
              )}

              {createdAt && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-muted-foreground border border-border bg-muted/40">
                  <Calendar size={12} style={{ opacity: 0.8 }} />
                  {t('settings.account.profile.badges.memberSince', { date: formatDateShort(createdAt) })}
                </span>
              )}
            </div>
          </div>

          <p className="text-sm md:text-sm text-muted-foreground max-w-2xl">
            {t('settings.account.profile.description')}
          </p>

          {/* Highlights grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: t('settings.users.fields.username'), value: profileForm.username || '—' },
              { label: t('settings.users.fields.email'), value: profileForm.email || '—' },
              { label: t('settings.users.fields.fullName'), value: profileForm.full_name || '—' },
            ].map((item) => (
              <div
                key={item.label}
                className="p-3.5 rounded-2xl border border-border bg-muted/30"
              >
                <p className="text-2xs font-bold uppercase tracking-[0.06em] text-muted-foreground mb-1.5">
                  {item.label}
                </p>
                <p className="text-sm font-bold truncate">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Two-column grid: Edit Profile card + Password card ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Edit profile — clickable card */}
        <div>
          <button
            type="button"
            onClick={onOpenEditProfile}
            aria-label={t('settings.account.editProfile')}
            className="w-full flex items-center justify-between gap-4 px-5 py-4 rounded-2xl cursor-pointer transition-all duration-150 border border-border hover:border-border/80 hover:bg-muted/20"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center border border-border bg-muted/30">
                <Pencil size={16} style={{ opacity: 0.45 }} />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold truncate">{t('settings.account.editProfile')}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {profileForm.username} · {profileForm.email}
                </p>
              </div>
            </div>
            <span className="text-sm font-semibold text-muted-foreground flex-shrink-0">→</span>
          </button>
        </div>

        {/* Password section */}
        <div>
          <AccountSecuritySection onOpenChangePassword={onOpenChangePassword} />
        </div>
      </div>

      {/* ── Deployment profile (admin only) ── */}
      {canManageSystem && (
        <div>
          <p className="text-sm font-bold mb-1">{t('settings.account.profile.deployment.title')}</p>
          <p className="text-sm text-muted-foreground mb-4">{t('settings.account.profile.deployment.description')}</p>

          <div
            className="p-5 rounded-2xl border border-border"
          >
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {([
                  {
                    key: 'individual',
                    title: t('settings.account.profile.deployment.individual'),
                    body: t('settings.account.profile.deployment.individualDesc'),
                    icon: <User size={16} />,
                  },
                  {
                    key: 'enterprise',
                    title: t('settings.account.profile.deployment.enterprise'),
                    body: t('settings.account.profile.deployment.enterpriseDesc'),
                    icon: <Building2 size={16} />,
                  },
                ] as const).map((option) => {
                  const isSelected = deploymentForm.deployment_type === option.key
                  return (
                    <button
                      type="button"
                      key={option.key}
                      onClick={() => onDeploymentFormChange({ deployment_type: option.key })}
                      className={`p-4 rounded-2xl text-left transition-all duration-150 border ${isSelected ? 'border-border bg-primary/5' : 'border-border'}`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border border-border ${isSelected ? 'bg-primary/10' : 'bg-muted/30'}`}>
                          {option.icon}
                        </div>
                        <p className="text-sm font-bold">{option.title}</p>
                      </div>
                      <p className="text-sm text-muted-foreground pl-11">{option.body}</p>
                    </button>
                  )
                })}
              </div>

              {deploymentForm.deployment_type === 'enterprise' && (
                <div>
                  <Label htmlFor="deployment-org-name" className="text-xs font-semibold mb-1.5 block">
                    {t('settings.account.profile.deployment.orgName')}
                  </Label>
                  <Input
                    id="deployment-org-name"
                    value={deploymentForm.enterprise_name}
                    onChange={(e) => onDeploymentFormChange({ enterprise_name: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              )}

              <div>
                <Button
                  disabled={
                    isSavingDeployment ||
                    (deploymentForm.deployment_type === 'enterprise' &&
                      !deploymentForm.enterprise_name.trim())
                  }
                  className="gap-1.5"
                  onClick={onSaveDeployment}
                >
                  {isSavingDeployment && <Loader2 size={14} className="animate-spin" />}
                  {isSavingDeployment
                    ? t('settings.account.profile.saving')
                    : t('settings.account.profile.deployment.saveButton')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
