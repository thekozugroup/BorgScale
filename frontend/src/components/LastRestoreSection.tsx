import { RotateCcw, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import RestoreJobCard from './RestoreJobCard'
import { Button } from '@/components/ui/button'
import { useTheme } from '../context/ThemeContext'

interface RestoreJob {
  id: number
  repository: string
  archive: string
  destination: string
  status: string
  started_at?: string
  completed_at?: string
  progress?: number
  error_message?: string
  progress_details?: {
    nfiles: number
    current_file: string
    progress_percent: number
    restore_speed: number
    estimated_time_remaining: number
  }
}

interface LastRestoreSectionProps {
  restoreJob: RestoreJob | null
}

export default function LastRestoreSection({ restoreJob }: LastRestoreSectionProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { effectiveMode } = useTheme()
  const isDark = effectiveMode === 'dark'

  if (!restoreJob) {
    return (
      <div className="flex items-center gap-2">
        <RotateCcw size={14} style={{ color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)' }} />
        <span className="text-[0.78rem] text-muted-foreground">{t('lastRestoreSection.noRestores')}</span>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <RotateCcw size={15} className="text-secondary" />
          <p className="text-[0.82rem] font-semibold">{t('lastRestoreSection.title')}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs px-2.5 gap-1 text-muted-foreground"
          onClick={() => navigate('/activity')}
        >
          <ExternalLink size={12} />
          {t('lastRestoreSection.viewAll')}
        </Button>
      </div>
      <RestoreJobCard job={restoreJob} showJobId={false} />
    </div>
  )
}
