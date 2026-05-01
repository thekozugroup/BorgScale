import { useState, useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
} from '@/components/ui/dialog'
import { X } from 'lucide-react'

type DialogCloseReason = 'backdropClick' | 'escapeKeyDown'

type ResponsiveDialogProps = {
  open: boolean
  onClose?: (event: object, reason: DialogCloseReason) => void
  children?: ReactNode
  footer?: ReactNode
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false
  fullWidth?: boolean
  // Unused MUI-only props, accepted for prop compatibility
  PaperProps?: object
  TransitionProps?: object
  disableEnforceFocus?: boolean
  keepMounted?: boolean
}

const MAX_WIDTH_CLASSES: Record<string, string> = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return isMobile
}

export default function ResponsiveDialog({
  open,
  onClose,
  children,
  footer,
  maxWidth = 'sm',
  fullWidth = false,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile()
  const handleClose = () => {
    onClose?.({}, 'backdropClick')
  }

  if (isMobile) {
    // Bottom sheet on mobile
    return (
      <>
        {open && (
          <div
            className="fixed inset-0 z-50 flex items-end"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={handleClose}
          >
            <div
              className="w-full bg-background rounded-t-2xl max-h-[90vh] flex flex-col"
              style={{ boxShadow: '0 -4px 32px rgba(0,0,0,0.25)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle row */}
              <div
                data-testid="drag-handle"
                className="relative flex items-center justify-center h-11 flex-shrink-0"
              >
                <div className="w-8 h-1 rounded-full bg-border" />
                {onClose && (
                  <button
                    onClick={handleClose}
                    aria-label="close"
                    className="absolute right-2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Scrollable content */}
              <div className="overflow-y-auto flex-1 overscroll-contain">{children}</div>

              {/* Sticky footer */}
              {footer && (
                <div
                  data-testid="responsive-dialog-footer"
                  className="flex-shrink-0 border-t border-border"
                  style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                >
                  {footer}
                </div>
              )}
            </div>
          </div>
        )}
      </>
    )
  }

  // Desktop dialog
  const mwClass = maxWidth ? (MAX_WIDTH_CLASSES[maxWidth] ?? 'max-w-sm') : ''

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent
          className={cn(
            mwClass,
            fullWidth ? 'w-full' : '',
            'p-0 gap-0 overflow-hidden'
          )}
          onEscapeKeyDown={() => onClose?.({}, 'escapeKeyDown')}
          onInteractOutside={handleClose}
          // hide the default X button — our dialog contents provide their own close UX
          showCloseButton={false}
        >
          {children}
          {footer}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
