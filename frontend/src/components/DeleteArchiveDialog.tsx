import { useTranslation } from 'react-i18next'
import { AlertCircle, Trash2, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface DeleteArchiveDialogProps {
  open: boolean
  archiveName: string | null
  onClose: () => void
  onConfirm: (archiveName: string) => void
  deleting?: boolean
}

export default function DeleteArchiveDialog({
  open,
  archiveName,
  onClose,
  onConfirm,
  deleting = false,
}: DeleteArchiveDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent showCloseButton={false} className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertCircle size={24} className="text-destructive" />
            </div>
            <DialogTitle className="text-base font-semibold">
              {t('dialogs.deleteArchive.title')}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
            <p className="text-sm text-muted-foreground">
              {t('dialogs.deleteArchive.warning')}
            </p>
          </div>
          <p className="text-sm">
            {t('dialogs.deleteArchive.subtitle')}{' '}
            <strong>&quot;{archiveName}&quot;</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            {t('dialogs.deleteArchive.archiveName', { name: archiveName })}
          </p>
        </div>

        <DialogFooter className="-mx-4 -mb-4 border-t bg-muted/50 px-4 py-3 rounded-b-xl flex-row justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {t('common.buttons.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => archiveName && onConfirm(archiveName)}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t('dialogs.deleteArchive.deleting')}
              </>
            ) : (
              <>
                <Trash2 size={16} />
                {t('dialogs.deleteArchive.confirm')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
