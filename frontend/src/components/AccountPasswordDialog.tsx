import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ResponsiveDialog from './ResponsiveDialog'

interface AccountPasswordDialogProps {
  open: boolean
  currentPassword: string
  newPassword: string
  confirmPassword: string
  isSubmitting: boolean
  onClose: (reason?: 'backdropClick' | 'escapeKeyDown' | 'closeButton') => void
  onFormChange: (
    updates: Partial<{
      current_password: string
      new_password: string
      confirm_password: string
    }>
  ) => void
  onSubmit: () => void
}

export default function AccountPasswordDialog({
  open,
  currentPassword,
  newPassword,
  confirmPassword,
  isSubmitting,
  onClose,
  onFormChange,
  onSubmit,
}: AccountPasswordDialogProps) {
  const passwordsMismatch = confirmPassword !== '' && newPassword !== confirmPassword

  return (
    <ResponsiveDialog open={open} onClose={(_, reason) => onClose(reason)} maxWidth="sm" fullWidth>
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Change password</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <Label>Current password</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => onFormChange({ current_password: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>New password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => onFormChange({ new_password: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Confirm password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => onFormChange({ confirm_password: e.target.value })}
                required
                aria-invalid={passwordsMismatch}
              />
              {passwordsMismatch && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onClose('closeButton')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Saving' : 'Update password'}
            </Button>
          </div>
        </form>
      </div>
    </ResponsiveDialog>
  )
}
