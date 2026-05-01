import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import ResponsiveDialog from './ResponsiveDialog'
import { AlertCircle, Loader2, Trash2 } from 'lucide-react'

interface ScheduledJob {
  id: number
  name: string
  cron_expression: string
  repository: string | null
  repository_id: number | null
  repository_ids: number[] | null
  enabled: boolean
  last_run: string | null
  next_run: string | null
  created_at: string
  updated_at: string | null
  description: string | null
  archive_name_template: string | null
  run_repository_scripts: boolean
  pre_backup_script_id: number | null
  post_backup_script_id: number | null
  run_prune_after: boolean
  run_compact_after: boolean
  prune_keep_hourly: number
  prune_keep_daily: number
  prune_keep_weekly: number
  prune_keep_monthly: number
  prune_keep_quarterly: number
  prune_keep_yearly: number
  last_prune: string | null
  last_compact: string | null
}

interface DeleteScheduleDialogProps {
  open: boolean
  job: ScheduledJob | null
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
}

const DeleteScheduleDialog: React.FC<DeleteScheduleDialogProps> = ({
  open,
  job,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  const { t } = useTranslation()
  return (
    <ResponsiveDialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle size={24} className="text-destructive" />
          </div>
          <h3 className="text-lg font-semibold">{t('dialogs.deleteSchedule.title')}</h3>
        </div>
        <p className="text-sm mb-2">
          {t('dialogs.deleteSchedule.message')} <strong>"{job?.name}"</strong>
        </p>
        <p className="text-sm text-muted-foreground mb-6">{t('dialogs.deleteSchedule.warning')}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t('common.buttons.cancel')}</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Trash2 size={16} className="mr-2" />}
            {isDeleting ? t('dialogs.deleteSchedule.deleting') : t('dialogs.deleteSchedule.confirm')}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  )
}

export default DeleteScheduleDialog
