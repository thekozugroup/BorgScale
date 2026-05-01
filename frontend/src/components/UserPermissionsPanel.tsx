import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Plus, Database, ShieldOff, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { permissionsAPI } from '../services/api'
import { useAnalytics } from '../hooks/useAnalytics'
import { useAuth } from '../hooks/useAuth'
import { useAuthorization } from '../hooks/useAuthorization'
import { formatRoleLabel } from '../utils/rolePresentation'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface Permission {
  id: number
  user_id: number
  repository_id: number
  repository_name: string
  role: string
  created_at: string
}

interface Repository {
  id: number
  name: string
}

interface UserPermissionsPanelProps {
  /** If undefined, loads the current user's own permissions (read-only for non-admins) */
  userId?: number
  /** Whether editing controls are shown */
  canManageAssignments?: boolean
  /** Repositories available for assignment — only needed when editing is enabled */
  repositories?: Repository[]
  /** The target user's global role — caps available role options in the selector */
  targetUserRole?: string
  /** Title shown in the header bar */
  title?: string
  /** Subtitle shown below the title */
  subtitle?: string
}

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-destructive/10 text-destructive border-destructive/30',
  operator: 'bg-secondary text-secondary-foreground border-border',
  viewer: 'bg-muted text-muted-foreground border-border',
}

export default function UserPermissionsPanel({
  userId,
  canManageAssignments = false,
  repositories = [],
  targetUserRole = 'operator',
  title,
  subtitle,
}: UserPermissionsPanelProps) {
  const { t } = useTranslation()
  const { assignableRepositoryRolesFor } = useAuthorization()
  const { user: currentUser, refreshUser } = useAuth()
  const availableRoles = assignableRepositoryRolesFor(targetUserRole)
  const queryClient = useQueryClient()
  const { trackSettings, EventAction } = useAnalytics()
  const [addRepoId, setAddRepoId] = useState<number | ''>('')
  const [addRole, setAddRole] = useState('viewer')
  const [wildcardRole, setWildcardRole] = useState<string>('')
  const [scopeMode, setScopeMode] = useState<'all' | 'selected'>('selected')

  const queryKey = userId ? ['user-permissions', userId] : ['my-permissions']
  const scopeQueryKey = userId ? ['user-permission-scope', userId] : ['my-permission-scope']
  const isCurrentUserTarget = userId == null || userId === currentUser?.id

  const syncCurrentUserPermissions = async () => {
    if (!isCurrentUserTarget) return
    queryClient.invalidateQueries({ queryKey: ['my-permissions'] })
    queryClient.invalidateQueries({ queryKey: ['my-permission-scope'] })
    await refreshUser()
  }

  const { data: permissions = [], isLoading } = useQuery<Permission[]>({
    queryKey,
    queryFn: () =>
      userId
        ? permissionsAPI.getUserPermissions(userId).then((r) => r.data)
        : permissionsAPI.getMyPermissions().then((r) => r.data),
  })
  const { data: permissionScope, isLoading: isScopeLoading } = useQuery({
    queryKey: scopeQueryKey,
    queryFn: () =>
      userId
        ? permissionsAPI.getUserPermissionScope(userId).then((r) => r.data)
        : permissionsAPI.getMyPermissionScope().then((r) => r.data),
  })

  const assignMutation = useMutation({
    mutationFn: ({ repoId, role }: { repoId: number; role: string }) =>
      permissionsAPI.assign(userId!, { repository_id: repoId, role }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey })
      setAddRepoId('')
      setAddRole('viewer')
      await syncCurrentUserPermissions()
      toast.success(t('settings.permissions.toasts.assigned'))
      trackSettings(EventAction.EDIT, {
        section: 'users',
        operation: 'assign_repository_permission',
        role: addRole,
      })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || t('settings.permissions.toasts.failedToAssign'))
    },
  })

  const removeMutation = useMutation({
    mutationFn: (repoId: number) => permissionsAPI.remove(userId!, repoId),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey })
      await syncCurrentUserPermissions()
      toast.success(t('settings.permissions.toasts.removed'))
      trackSettings(EventAction.DELETE, {
        section: 'users',
        operation: 'remove_repository_permission',
      })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || t('settings.permissions.toasts.failedToRemove'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ repoId, role }: { repoId: number; role: string }) =>
      permissionsAPI.update(userId!, repoId, role),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey })
      await syncCurrentUserPermissions()
      toast.success(t('settings.permissions.toasts.updated'))
      trackSettings(EventAction.EDIT, {
        section: 'users',
        operation: 'update_repository_permission',
        role: variables.role,
      })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || t('settings.permissions.toasts.failedToUpdate'))
    },
  })

  const updateScopeMutation = useMutation({
    mutationFn: (role: string | null) => permissionsAPI.updateScope(userId!, role),
    onSuccess: async (_, nextRole) => {
      queryClient.invalidateQueries({ queryKey: scopeQueryKey })
      setWildcardRole(nextRole ?? '')
      await syncCurrentUserPermissions()
      toast.success(
        nextRole
          ? t('settings.permissions.toasts.automaticUpdated')
          : t('settings.permissions.toasts.automaticCleared')
      )
      trackSettings(EventAction.EDIT, {
        section: 'users',
        operation: 'update_repository_scope',
        role: nextRole ?? 'none',
      })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        error.response?.data?.detail || t('settings.permissions.toasts.failedToUpdateAutomatic')
      )
    },
  })

  useEffect(() => {
    const nextWildcardRole = permissionScope?.all_repositories_role ?? ''
    setWildcardRole(nextWildcardRole)
    setScopeMode(nextWildcardRole ? 'all' : 'selected')
  }, [permissionScope?.all_repositories_role])

  if (isLoading || isScopeLoading) {
    return (
      <div className="p-4">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  const assignedRepoIds = new Set(permissions.map((p) => p.repository_id))
  const availableRepos = repositories.filter((r) => !assignedRepoIds.has(r.id))
  const allAssigned = repositories.length > 0 && availableRepos.length === 0
  const noReposConfigured = repositories.length === 0
  const wildcardValue = permissionScope?.all_repositories_role ?? null
  const hasAutomaticAccess = Boolean(wildcardValue)
  const defaultRoleForScope = availableRoles[availableRoles.length - 1] ?? 'viewer'
  const effectiveWildcardRole = wildcardRole || defaultRoleForScope
  const scopeRoleToSave = scopeMode === 'all' ? effectiveWildcardRole : null

  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      {title && (
        <div className="px-5 py-4 border-b border-border bg-muted/40">
          <p className="text-sm font-semibold">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      )}

      {/* Scope section */}
      <div className="px-5 py-4 border-b border-border">
        <p className="text-2xs font-bold uppercase tracking-[0.05em] text-muted-foreground mb-3">
          {t('settings.permissions.scope.title')}
        </p>
        {canManageAssignments ? (
          <div className="flex flex-col gap-3">
            {/* Scope toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(['all', 'selected'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={cn(
                    'flex-1 py-1.5 text-xs font-semibold transition-colors duration-150',
                    scopeMode === mode
                      ? 'bg-background text-foreground shadow-sm'
                      : 'bg-muted/40 text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => {
                    setScopeMode(mode)
                    if (mode === 'all' && !wildcardRole) setWildcardRole(defaultRoleForScope)
                  }}
                >
                  {mode === 'all'
                    ? t('settings.permissions.scope.allRepositories')
                    : t('settings.permissions.scope.selectedOnly')}
                </button>
              ))}
            </div>

            {scopeMode === 'all' ? (
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <Select
                  value={effectiveWildcardRole}
                  onValueChange={setWildcardRole}
                >
                  <SelectTrigger className="w-full sm:w-44 h-8 text-sm font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => (
                      <SelectItem key={r} value={r}>{formatRoleLabel(r)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('settings.permissions.scope.autoInheritHint')}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t('settings.permissions.scope.restrictedHint')}
              </p>
            )}
          </div>
        ) : hasAutomaticAccess ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                'px-2 py-0.5 rounded text-xs font-semibold border',
                ROLE_BADGE[wildcardValue ?? 'viewer'] ?? ROLE_BADGE.viewer
              )}
            >
              {t('settings.permissions.scope.automaticAccess', {
                role: formatRoleLabel(wildcardValue),
              })}
            </span>
            <p className="text-xs text-muted-foreground">
              {t('settings.permissions.scope.futureInheritHint')}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('settings.permissions.scope.restrictedAccess')}
          </p>
        )}
      </div>

      {/* Permissions list */}
      <div style={{ minHeight: 160 }}>
        {scopeMode === 'all' ? (
          <div className="px-5 py-5">
            <Alert>
              <AlertDescription>
                {canManageAssignments ? (
                  <>
                    {t('settings.permissions.alert.allAccessPrefix')}{' '}
                    <strong>{effectiveWildcardRole}</strong>
                    {t('settings.permissions.alert.allAccessSuffix')}
                  </>
                ) : (
                  <>
                    {t('settings.permissions.alert.automaticAccessPrefix')}{' '}
                    <strong>{formatRoleLabel(wildcardValue)}</strong>.
                  </>
                )}
              </AlertDescription>
            </Alert>
          </div>
        ) : permissions.length === 0 ? (
          <div className="px-5 py-5 flex items-center gap-3">
            <ShieldOff size={15} className="opacity-35 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              {hasAutomaticAccess
                ? t('settings.permissions.empty.automaticCoverage')
                : t('settings.permissions.empty.noPermissions')}
            </p>
          </div>
        ) : (
          <div>
            {permissions.map((perm) => (
              <div
                key={perm.id}
                className="flex items-center gap-2 px-4 py-3 border-b border-border last:border-b-0"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Database size={13} className="opacity-40 flex-shrink-0" />
                  <span className="text-sm truncate">{perm.repository_name}</span>
                </div>
                {canManageAssignments ? (
                  <Select
                    value={perm.role}
                    onValueChange={(role) =>
                      updateMutation.mutate({ repoId: perm.repository_id, role })
                    }
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger className="w-28 sm:w-32 h-7 text-xs font-semibold flex-shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((r) => (
                        <SelectItem key={r} value={r}>{formatRoleLabel(r)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-xs font-semibold border',
                      ROLE_BADGE[perm.role] ?? ROLE_BADGE.viewer
                    )}
                  >
                    {formatRoleLabel(perm.role)}
                  </span>
                )}
                {canManageAssignments && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => removeMutation.mutate(perm.repository_id)}
                        disabled={removeMutation.isPending}
                        className="flex items-center justify-center w-7 h-7 rounded flex-shrink-0 opacity-45 hover:opacity-100 hover:bg-destructive/12 text-destructive transition-opacity duration-150 disabled:opacity-20"
                      >
                        <Trash2 size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{t('settings.permissions.actions.removeAccess')}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Grant access section */}
        {canManageAssignments && scopeMode === 'selected' && (
          <div className="px-5 py-4 border-t border-border">
            <p className="text-2xs font-bold uppercase tracking-[0.05em] text-muted-foreground mb-3">
              {t('settings.permissions.grantAccess.title')}
            </p>

            {noReposConfigured ? (
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-dashed border-border">
                <Database size={15} className="opacity-35 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  {t('settings.permissions.grantAccess.noRepositories')}
                </p>
              </div>
            ) : allAssigned ? (
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-dashed border-border">
                <ShieldOff size={15} className="opacity-35 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  {t('settings.permissions.grantAccess.allAssigned')}
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <Select
                  value={String(addRepoId)}
                  onValueChange={(v) => setAddRepoId(v === '' ? '' : Number(v))}
                >
                  <SelectTrigger className="flex-1 sm:min-w-40 h-8 text-sm font-semibold">
                    <SelectValue placeholder={t('settings.permissions.grantAccess.selectRepository')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRepos.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Select value={addRole} onValueChange={setAddRole}>
                    <SelectTrigger className="w-28 flex-shrink-0 h-8 text-sm font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((r) => (
                        <SelectItem key={r} value={r}>{formatRoleLabel(r)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 flex-shrink-0 h-8"
                    disabled={!addRepoId || assignMutation.isPending}
                    onClick={() => {
                      if (addRepoId)
                        assignMutation.mutate({ repoId: addRepoId as number, role: addRole })
                    }}
                  >
                    {assignMutation.isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Plus size={14} />
                    )}
                    {t('settings.permissions.grantAccess.assign')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save footer */}
      {canManageAssignments && (
        <div className="px-5 py-3 border-t border-border flex justify-stretch sm:justify-end">
          <Button
            size="sm"
            className="flex-1 sm:flex-none min-w-0 px-4 text-xs font-bold rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={
              updateScopeMutation.isPending ||
              (scopeMode === 'all' ? effectiveWildcardRole : null) === wildcardValue
            }
            onClick={() => updateScopeMutation.mutate(scopeRoleToSave)}
          >
            {t('settings.permissions.saveChanges')}
          </Button>
        </div>
      )}
    </div>
  )
}
