import { useTranslation } from 'react-i18next'
import { HardDrive, Info, Loader2 } from 'lucide-react'
import { Archive } from '../types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface MountArchiveDialogProps {
  open: boolean
  archive: Archive | null
  mountPoint: string
  onMountPointChange: (value: string) => void
  onClose: () => void
  onConfirm: () => void
  mounting?: boolean
}

export default function MountArchiveDialog({
  open,
  archive,
  mountPoint,
  onMountPointChange,
  onClose,
  onConfirm,
  mounting = false,
}: MountArchiveDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent showCloseButton={false} className="max-w-sm sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <HardDrive size={24} className="text-muted-foreground shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <DialogTitle className="text-base font-semibold">
                  {t('dialogs.mountArchive.title')}
                </DialogTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="text-muted-foreground cursor-help flex items-center"
                        aria-label={t('dialogs.mount.readOnlyInfo')}
                      >
                        <Info size={16} />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('dialogs.mount.readOnlyInfo')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {archive && (
                <p className="text-sm text-muted-foreground mt-0.5">{archive.name}</p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="mount-point-input">
              {t('dialogs.mountArchive.mountPoint')}
            </Label>
            <Input
              id="mount-point-input"
              value={mountPoint}
              onChange={(e) => onMountPointChange(e.target.value)}
              placeholder={t('dialogs.mount.mountPointPlaceholder')}
            />
            <p className="text-xs text-muted-foreground">
              {t('dialogs.mount.mountPointHint', {
                path: `/data/mounts/${mountPoint || '<name>'}`,
              })}
            </p>
          </div>
        </div>

        <DialogFooter className="-mx-4 -mb-4 border-t bg-muted/50 px-4 py-3 rounded-b-xl flex-row justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {t('dialogs.mountArchive.cancel')}
          </Button>
          <Button onClick={onConfirm} disabled={mounting}>
            {mounting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t('dialogs.mountArchive.mounting')}
              </>
            ) : (
              <>
                <HardDrive size={18} />
                {t('dialogs.mountArchive.mount')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
