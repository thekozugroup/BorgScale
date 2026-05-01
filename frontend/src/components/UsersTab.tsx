import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users,
  Trash2,
  Plus,
  Edit,
  Key,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  Search,
  Loader2,
} from 'lucide-react'
import { settingsAPI, repositoriesAPI } from '../services/api'
import { toast } from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { useAnalytics } from '../hooks/useAnalytics'
import { useAuthorization } from '../hooks/useAuthorization'
import { formatDateShort } from '../utils/dateUtils'
import { formatRoleLabel, getGlobalRolePresentation } from '../utils/rolePresentation'
import { translateBackendKey } from '../utils/translateBackendKey'
import { Column, ActionButton } from './DataTable'
import DataTable from './DataTable'
import UserPermissionsPanel from './UserPermissionsPanel'
import ResponsiveDialog from './ResponsiveDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface UserType {
  id: number
  username: string
  full_name?: string | null
  email: string
  is_active: boolean
  role: string
  all_repositories_role?: string | null
  created_at: string
  last_login: string | null
  // Legacy fields that may still appear in API responses
  profile_type?: string
  organization_name?: string
}

// Role accent uses CSS variable hex equivalents for the avatar border/bg.
// These are intentional design tokens (foreground-based), not palette colours.
const getRoleAvatarClasses = (role: string): { wrapper: string; text: string } => {
  if (role === 'admin' || role === 'superadmin') return { wrapper: 'border-primary/35 bg-primary/12', text: 'text-primary' }
  if (role === 'operator') return { wrapper: 'border-secondary-foreground/35 bg-secondary-foreground/12', text: 'text-secondary-foreground' }
  return { wrapper: 'border-muted-foreground/35 bg-muted-foreground/12', text: 'text-muted-foreground' }
}

const getInitials = (user: UserType): string => {
  if (user.full_name) {
    const parts = user.full_name.trim().split(/\s+/)
    return parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return user.username.slice(0, 2).toUpperCase()
}

type RoleFilter = 'all' | 'admin' | 'operator' | 'viewer'
type StatusFilter = 'all' | 'active' | 'inactive'

const UsersTab: React.FC = () => {
  const { t } = useTranslation()
  const { hasGlobalPermission } = useAuth()
  const { roleHasGlobalPermission } = useAuthorization()
  const { trackSettings, EventAction } = useAnalytics()
  const queryClient = useQueryClient()
  const canManageUsers = hasGlobalPermission('settings.users.manage')

  const getRolePresentation = useCallback((role: string) => getGlobalRolePresentation(role, t), [t])

  const getRepositoryAccessSummary = (user: UserType) => {
    if (getRolePresentation(user.role).isAdminRole) {
      return t('settings.users.accessSummary.adminRole')
    }
    if (user.all_repositories_role) {
      return t('settings.users.accessSummary.defaultAccess', {
        role: formatRoleLabel(user.all_repositories_role),
      })
    }
    return t('settings.users.accessSummary.restricted')
  }

  // Dialog / mutation state
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [editingUser, setEditingUser] = useState<UserType | null>(null)
  const [showUserPasswordModal, setShowUserPasswordModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [accessUser, setAccessUser] = useState<UserType | null>(null)
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserType | null>(null)

  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'viewer',
    full_name: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    new_password: '',
  })

  // Search + filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: settingsAPI.getUsers,
    enabled: canManageUsers,
  })

  const { data: repositoriesData } = useQuery({
    queryKey: ['repositories'],
    queryFn: repositoriesAPI.getRepositories,
    enabled: canManageUsers,
  })

  const createUserMutation = useMutation({
    mutationFn: settingsAPI.createUser,
    onSuccess: () => {
      toast.success(t('settings.toasts.userCreated'))
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowCreateUser(false)
      trackSettings(EventAction.CREATE, {
        section: 'users',
        role: userForm.role,
      })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        translateBackendKey(error.response?.data?.detail) || t('settings.toasts.failedToCreateUser')
      )
    },
  })

  const updateUserMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ userId, userData }: { userId: number; userData: any }) =>
      settingsAPI.updateUser(userId, userData),
    onSuccess: () => {
      toast.success(t('settings.toasts.userUpdated'))
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditingUser(null)
      trackSettings(EventAction.EDIT, {
        section: 'users',
        role: userForm.role,
      })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        translateBackendKey(error.response?.data?.detail) || t('settings.toasts.failedToUpdateUser')
      )
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: settingsAPI.deleteUser,
    onSuccess: () => {
      toast.success(t('settings.toasts.userDeleted'))
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeleteConfirmUser(null)
      trackSettings(EventAction.DELETE, { section: 'users' })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        translateBackendKey(error.response?.data?.detail) || t('settings.toasts.failedToDeleteUser')
      )
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: number; newPassword: string }) =>
      settingsAPI.resetUserPassword(userId, newPassword),
    onSuccess: () => {
      toast.success(t('settings.toasts.passwordReset'))
      setShowUserPasswordModal(false)
      setSelectedUserId(null)
      trackSettings(EventAction.EDIT, { section: 'users', operation: 'reset_password' })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        translateBackendKey(error.response?.data?.detail) ||
          t('settings.toasts.failedToResetPassword')
      )
    },
  })

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault()
    createUserMutation.mutate(userForm)
  }

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingUser) {
      updateUserMutation.mutate({
        userId: editingUser.id,
        userData: userForm,
      })
    }
  }

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedUserId) {
      resetPasswordMutation.mutate({
        userId: selectedUserId,
        newPassword: passwordForm.new_password,
      })
    }
  }

  const handleDeleteUser = () => {
    if (deleteConfirmUser) {
      deleteUserMutation.mutate(deleteConfirmUser.id)
    }
  }

  const openPasswordModal = (userId: number) => {
    setSelectedUserId(userId)
    setShowUserPasswordModal(true)
    setPasswordForm({ new_password: '' })
  }

  const openEditUser = (userToEdit: UserType) => {
    setEditingUser(userToEdit)
    setUserForm({
      username: userToEdit.username,
      email: userToEdit.email,
      password: '',
      role: userToEdit.role || 'viewer',
      full_name: userToEdit.full_name || '',
    })
  }

  const openCreateUser = () => {
    setShowCreateUser(true)
    setUserForm({
      username: '',
      email: '',
      password: '',
      role: 'viewer',
      full_name: '',
    })
  }

  const users = useMemo<UserType[]>(() => usersData?.data?.users ?? [], [usersData?.data?.users])

  const totalUsers = users.length
  const activeUsers = users.filter((u: UserType) => u.is_active).length
  const adminUsers = users.filter((u: UserType) => getRolePresentation(u.role).isAdminRole).length
  const operatorUsers = users.filter(
    (u: UserType) => getRolePresentation(u.role).isOperatorRole
  ).length
  const viewerUsers = users.length - adminUsers - operatorUsers

  // Filtered users
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return users.filter((user) => {
      if (q) {
        const haystack = [user.username, user.full_name ?? '', user.email].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (roleFilter !== 'all') {
        const presentation = getRolePresentation(user.role)
        if (roleFilter === 'admin' && !presentation.isAdminRole) return false
        if (roleFilter === 'operator' && !presentation.isOperatorRole) return false
        if (roleFilter === 'viewer' && (presentation.isAdminRole || presentation.isOperatorRole))
          return false
      }
      if (statusFilter === 'active' && !user.is_active) return false
      if (statusFilter === 'inactive' && user.is_active) return false
      return true
    })
  }, [users, searchQuery, roleFilter, statusFilter, getRolePresentation])

  // Keep selectedAccessUserId for backward compat with UserPermissionsPanel
  const [selectedAccessUserId, setSelectedAccessUserId] = useState<number | null>(null)
  useEffect(() => {
    if (accessUser) setSelectedAccessUserId(accessUser.id)
  }, [accessUser])

  // Table columns
  const columns: Column<UserType>[] = useMemo(
    () => [
      {
        id: 'user',
        label: t('settings.users.table.user'),
        render: (user) => {
          const avatarCls = getRoleAvatarClasses(user.role)
          return (
            <div className="flex items-center gap-3 py-0.5">
              <div
                className={cn('flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border-[1.5px]', avatarCls.wrapper)}
              >
                <span
                  className={cn('text-2xs font-extrabold leading-none', avatarCls.text)}
                >
                  {getInitials(user)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {user.full_name || user.username}
                </p>
                <p className="text-xs text-muted-foreground truncate leading-[1.4]">
                  {user.email || `@${user.username}`}
                </p>
              </div>
            </div>
          )
        },
      },
      {
        id: 'role',
        label: t('settings.users.table.role'),
        width: '110px',
        render: (user) => {
          const rolePresentation = getRolePresentation(user.role)
          return (
            <Badge variant="secondary" className="text-xs">
              {rolePresentation.label}
            </Badge>
          )
        },
      },
      {
        id: 'status',
        label: t('settings.users.table.status'),
        width: '100px',
        render: (user) => (
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'h-[7px] w-[7px] shrink-0 rounded-full',
                user.is_active ? 'bg-primary' : 'bg-destructive'
              )}
            />
            <span
              className={cn(
                'text-sm font-medium',
                user.is_active ? 'text-foreground' : 'text-destructive'
              )}
            >
              {user.is_active
                ? t('settings.users.status.active')
                : t('settings.users.status.inactive')}
            </span>
          </div>
        ),
      },
      {
        id: 'created',
        label: t('settings.users.table.created'),
        width: '110px',
        render: (user) => (
          <span className="text-sm text-muted-foreground">{formatDateShort(user.created_at)}</span>
        ),
      },
      {
        id: 'lastLogin',
        label: t('settings.users.table.lastLogin'),
        width: '120px',
        render: (user) => (
          <span className="text-sm text-muted-foreground">
            {user.last_login ? formatDateShort(user.last_login) : t('common.never')}
          </span>
        ),
      },
    ],
    [t, getRolePresentation]
  )

  // Table row actions
  const tableActions: ActionButton<UserType>[] = useMemo(
    () => [
      {
        icon: <UserCheck size={15} />,
        label: t('settings.users.actions.manageAccess'),
        onClick: (user) => setAccessUser(user),
        color: 'primary',
        show: () => canManageUsers,
      },
      {
        icon: <Edit size={15} />,
        label: t('settings.users.actions.edit'),
        onClick: (user) => openEditUser(user),
        color: 'default',
        show: () => canManageUsers,
      },
      {
        icon: <Key size={15} />,
        label: t('settings.users.actions.resetPassword'),
        onClick: (user) => openPasswordModal(user.id),
        color: 'warning',
        show: () => canManageUsers,
      },
      {
        icon: <Trash2 size={15} />,
        label: t('settings.users.actions.delete'),
        onClick: (user) => setDeleteConfirmUser(user),
        color: 'error',
        show: () => canManageUsers,
      },
    ],
    [t, canManageUsers]
  )

  const roleFilterOptions: { value: RoleFilter; label: string }[] = [
    { value: 'all', label: t('settings.users.filter.allRoles') },
    { value: 'admin', label: t('settings.users.roles.admin') },
    { value: 'operator', label: t('settings.users.roles.operator') },
    { value: 'viewer', label: t('settings.users.roles.viewer') },
  ]

  const statusFilterOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: t('settings.users.filter.allStatuses') },
    { value: 'active', label: t('settings.users.status.active') },
    { value: 'inactive', label: t('settings.users.status.inactive') },
  ]

  const hasActiveFilters =
    searchQuery.trim() !== '' || roleFilter !== 'all' || statusFilter !== 'all'

  const dotColor = (value: StatusFilter) => {
    if (value === 'active') return 'bg-primary'
    if (value === 'inactive') return 'bg-destructive'
    return null
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-base font-semibold">{t('settings.users.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('settings.users.subtitle')}</p>
          </div>
          <Button onClick={openCreateUser} className="w-full sm:w-auto">
            <Plus size={18} className="mr-1" />
            {t('settings.users.addUser')}
          </Button>
        </div>

        {/* Stat strip */}
        <div className="flex flex-wrap gap-6 sm:gap-8">
          {[
            { label: t('settings.users.stats.total'), value: totalUsers, className: 'text-foreground' },
            { label: t('settings.users.stats.active'), value: activeUsers, className: 'text-foreground' },
            { label: t('settings.users.stats.admins'), value: adminUsers, className: 'text-foreground' },
            { label: t('settings.users.stats.operators'), value: operatorUsers, className: 'text-foreground' },
            { label: t('settings.users.stats.viewers'), value: viewerUsers, className: 'text-muted-foreground' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className={cn('text-lg font-bold leading-none mb-0.5', stat.className)}>
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Search + filter toolbar */}
        {!loadingUsers && users.length > 0 && (
          <div className="space-y-3">
            <div className="flex gap-3 items-center flex-nowrap overflow-hidden">
              {/* Search */}
              <div className="relative w-60 shrink-0">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  className="pl-8 rounded-xl h-8"
                  placeholder={t('settings.users.search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Role filter chips */}
              <div className="flex gap-2 shrink-0">
                {roleFilterOptions.map((opt) => {
                  const isSelected = roleFilter === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRoleFilter(opt.value)}
                      className={cn(
                        'text-xs font-normal rounded-full border px-2.5 py-0.5 transition-all',
                        isSelected
                          ? 'font-semibold bg-foreground/10 border-foreground/20'
                          : 'bg-transparent border-foreground/10 text-muted-foreground hover:bg-foreground/5 hover:border-foreground/20'
                      )}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>

              {/* Status filter chips */}
              <div className="flex gap-2 shrink-0">
                {statusFilterOptions.map((opt) => {
                  const isSelected = statusFilter === opt.value
                  const dot = dotColor(opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatusFilter(opt.value)}
                      className={cn(
                        'text-xs font-normal rounded-full border px-2.5 py-0.5 transition-all flex items-center gap-1.5',
                        isSelected
                          ? 'font-semibold bg-foreground/10 border-foreground/20'
                          : 'bg-transparent border-foreground/10 text-muted-foreground hover:bg-foreground/5'
                      )}
                    >
                      {dot && <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dot)} />}
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Result count */}
            {hasActiveFilters && (
              <p className="text-xs text-muted-foreground pl-0.5">
                {t('settings.users.filter.showing', {
                  count: filteredUsers.length,
                  total: totalUsers,
                })}
              </p>
            )}
          </div>
        )}

        {/* User table */}
        <DataTable<UserType>
          data={filteredUsers}
          columns={columns}
          actions={tableActions}
          getRowKey={(user) => user.id}
          loading={loadingUsers}
          defaultRowsPerPage={25}
          rowsPerPageOptions={[10, 25, 50, 100]}
          tableId="users-tab"
          emptyState={
            hasActiveFilters
              ? {
                  icon: <Search size={36} />,
                  title: t('settings.users.filter.noMatch'),
                  description: t('settings.users.filter.noMatchDescription'),
                }
              : {
                  icon: <Users size={36} />,
                  title: t('settings.users.emptyState.title'),
                  description: t('settings.users.emptyState.description'),
                }
          }
        />
      </div>

      {/* Repository Access Dialog */}
      <ResponsiveDialog
        open={!!accessUser}
        onClose={() => setAccessUser(null)}
        maxWidth="md"
        fullWidth
      >
        <div className="p-4">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold leading-tight">
              {t('settings.users.repositoryAccess.title')}
            </DialogTitle>
            {accessUser && (
              <p className="text-sm text-muted-foreground mt-1">
                {accessUser.full_name || accessUser.username}
              </p>
            )}
          </DialogHeader>
          {accessUser && (
            <div className="space-y-4 pt-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck size={14} className="opacity-60" />
                  <p className="text-sm font-semibold">
                    {getRolePresentation(accessUser.role).label}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {getRepositoryAccessSummary(accessUser)}
                </p>
              </div>
              <Separator />
              {roleHasGlobalPermission(accessUser.role, 'repositories.manage_all') ? (
                <div className="flex items-center gap-3 px-3 py-3.5 rounded-xl border border-border bg-muted/40">
                  <ShieldCheck size={15} className="text-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">
                      {t('settings.users.repositoryAccess.globalAccess')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.users.repositoryAccess.globalAccessDesc')}
                    </p>
                  </div>
                </div>
              ) : (
                <UserPermissionsPanel
                  userId={selectedAccessUserId ?? accessUser.id}
                  canManageAssignments={true}
                  repositories={repositoriesData?.data?.repositories ?? []}
                  targetUserRole={accessUser.role}
                />
              )}
            </div>
          )}
        </div>
      </ResponsiveDialog>

      {/* Create/Edit User Modal */}
      <Dialog
        open={showCreateUser || !!editingUser}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateUser(false)
            setEditingUser(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md" aria-label={editingUser ? t('settings.users.editDialog.title') : t('settings.users.createDialog.title')}>
          <DialogHeader>
            <DialogTitle>
              {editingUser
                ? t('settings.users.editDialog.title')
                : t('settings.users.createDialog.title')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="user-username">{t('settings.users.fields.username')} *</Label>
                <Input
                  id="user-username"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="user-email">{t('settings.users.fields.email')} *</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  required
                />
              </div>

              {!editingUser && (
                <div className="space-y-1.5">
                  <Label htmlFor="user-password">{t('settings.users.fields.password')} *</Label>
                  <Input
                    id="user-password"
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="user-fullname">{t('settings.users.fields.fullName')}</Label>
                <Input
                  id="user-fullname"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="user-role">{t('settings.users.fields.role')}</Label>
                <Select
                  value={userForm.role}
                  onValueChange={(val) => setUserForm({ ...userForm, role: val })}
                >
                  <SelectTrigger id="user-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      {t('settings.users.roles.adminDescription')}
                    </SelectItem>
                    <SelectItem value="operator">
                      {t('settings.users.roles.operatorDescription')}
                    </SelectItem>
                    <SelectItem value="viewer">
                      {t('settings.users.roles.viewerDescription')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateUser(false)
                  setEditingUser(null)
                }}
              >
                {t('settings.users.buttons.cancel')}
              </Button>
              <Button type="submit">
                {editingUser
                  ? t('settings.users.buttons.update')
                  : t('settings.users.buttons.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Reset Modal */}
      <Dialog
        open={showUserPasswordModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowUserPasswordModal(false)
            setSelectedUserId(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md" aria-label={t('settings.users.resetPasswordDialog.title')}>
          <DialogHeader>
            <DialogTitle>{t('settings.users.resetPasswordDialog.title')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword}>
            <div className="space-y-1.5 py-2">
              <Label htmlFor="reset-password">{t('settings.password.new')}</Label>
              <Input
                id="reset-password"
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ new_password: e.target.value })}
                required
              />
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowUserPasswordModal(false)
                  setSelectedUserId(null)
                }}
              >
                {t('settings.users.buttons.cancel')}
              </Button>
              <Button type="submit">{t('settings.users.actions.resetPassword')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmUser}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmUser(null)
        }}
      >
        <DialogContent className="sm:max-w-xs" aria-label={t('settings.users.deleteDialog.title')}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 shrink-0">
                <AlertCircle size={24} className="text-destructive" />
              </div>
              <DialogTitle className="text-base font-semibold">
                {t('settings.users.deleteDialog.title')}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            <p className="text-sm">
              {t('settings.users.deleteDialog.message', {
                username: deleteConfirmUser?.username,
              })}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('settings.users.deleteDialog.warning')}
            </p>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmUser(null)}>
              {t('settings.users.buttons.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? (
                <Loader2 size={16} className="animate-spin mr-1" />
              ) : null}
              {deleteUserMutation.isPending
                ? t('settings.users.deleteDialog.deleting')
                : t('settings.users.deleteDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default UsersTab
