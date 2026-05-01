import React from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, Code, Wrench, Rocket, Database } from 'lucide-react'
import { Repository } from '../../../types'
import { Script } from '../../ScheduleWizard'
import { cn } from '@/lib/utils'

interface WizardStepScheduleReviewProps {
  data: {
    name: string
    description: string
    repositoryIds: number[]
    cronExpression: string
    archiveNameTemplate: string
    preBackupScriptId: number | null
    postBackupScriptId: number | null
    runRepositoryScripts: boolean
    runPruneAfter: boolean
    runCompactAfter: boolean
    pruneKeepHourly: number
    pruneKeepDaily: number
    pruneKeepWeekly: number
    pruneKeepMonthly: number
    pruneKeepQuarterly: number
    pruneKeepYearly: number
  }
  repositories: Repository[]
  scripts: Script[]
}

// Monospace code pill
function CodePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[0.72rem] px-1.5 py-0.5 rounded bg-muted text-foreground max-w-full overflow-hidden text-ellipsis whitespace-nowrap inline-block align-middle cursor-default leading-relaxed">
      {children}
    </span>
  )
}

function AttrRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 min-w-0">
      <span className="text-[0.7rem] text-muted-foreground shrink-0">{label}</span>
      <div className="min-w-0 flex items-center gap-1 flex-wrap justify-end">{children}</div>
    </div>
  )
}

function SectionCard({
  icon,
  label,
  iconClass,
  cardClass,
  children,
}: {
  icon: React.ReactNode
  label: string
  iconClass?: string
  cardClass?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('rounded-lg p-3 flex flex-col gap-2 min-w-0 overflow-hidden', cardClass)}>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
            iconClass
          )}
        >
          {icon}
        </div>
        <span className="text-[0.68rem] text-muted-foreground font-bold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

const WizardStepScheduleReview: React.FC<WizardStepScheduleReviewProps> = ({
  data,
  repositories,
  scripts,
}) => {
  const { t } = useTranslation()

  const selectedRepos = repositories.filter((r) => data.repositoryIds.includes(r.id))
  const preScript = scripts.find((s) => s.id === data.preBackupScriptId)
  const postScript = scripts.find((s) => s.id === data.postBackupScriptId)

  const pruneKeeps = [
    data.pruneKeepHourly > 0 && `${data.pruneKeepHourly}h`,
    `${data.pruneKeepDaily}d`,
    `${data.pruneKeepWeekly}w`,
    `${data.pruneKeepMonthly}m`,
    data.pruneKeepQuarterly > 0 && `${data.pruneKeepQuarterly}q`,
    `${data.pruneKeepYearly}y`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[0.6rem] text-muted-foreground font-bold uppercase tracking-widest">
          {t('scheduleWizard.steps.review')}
        </span>
        <span
          title={t('wizard.scheduleWizard.review.readyToCreate')}
          className="flex items-center gap-1 text-[0.65rem] font-semibold px-2 py-0.5 rounded-full border bg-muted text-foreground border-border cursor-help"
        >
          <Rocket size={10} />
          Ready
        </span>
      </div>

      <Alert>
        <AlertDescription>
          <strong>{t('wizard.scheduleWizard.review.readyToCreate')}</strong>
          <br />
          {t('wizard.scheduleWizard.review.reviewAndConfirm')}
        </AlertDescription>
      </Alert>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0 overflow-hidden">
        {/* Job card */}
        <SectionCard
          icon={<Calendar size={14} />}
          label={t('wizard.scheduleWizard.review.jobSummary')}
          iconClass="bg-muted text-muted-foreground"
          cardClass="bg-muted/20"
        >
          <AttrRow label={t('wizard.scheduleWizard.review.name')}>
            <span className="text-sm font-bold">{data.name}</span>
          </AttrRow>
          {data.description && (
            <AttrRow label={t('wizard.scheduleWizard.basicInfo.descriptionLabel')}>
              <span className="text-sm text-muted-foreground text-right">{data.description}</span>
            </AttrRow>
          )}
          <AttrRow label={t('wizard.scheduleWizard.review.schedule')}>
            <CodePill>{data.cronExpression}</CodePill>
          </AttrRow>
          <AttrRow label={t('wizard.scheduleWizard.review.archiveNameTemplate')}>
            <CodePill>{data.archiveNameTemplate}</CodePill>
          </AttrRow>
        </SectionCard>

        {/* Repositories card */}
        <SectionCard
          icon={<Database size={14} />}
          label={t('wizard.scheduleWizard.review.repositories', { count: selectedRepos.length })}
          iconClass="bg-muted text-muted-foreground"
          cardClass="bg-muted/20"
        >
          {selectedRepos.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              {t('wizard.scheduleWizard.review.none')}
            </span>
          ) : (
            selectedRepos.map((repo, index) => (
              <AttrRow key={repo.id} label={`${index + 1}`}>
                <span className="text-[0.65rem] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-foreground">
                  {repo.name}
                </span>
                <CodePill>{repo.path}</CodePill>
              </AttrRow>
            ))
          )}
        </SectionCard>

        {/* Scripts card */}
        <SectionCard
          icon={<Code size={14} />}
          label={t('wizard.scheduleWizard.review.scriptsConfiguration')}
          iconClass="bg-muted text-muted-foreground"
          cardClass="bg-muted/20"
        >
          <AttrRow label={t('wizard.scheduleWizard.review.preBackupScript')}>
            {preScript ? (
              <span className="text-sm font-medium">{preScript.name}</span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {t('wizard.scheduleWizard.review.none')}
              </span>
            )}
          </AttrRow>
          <AttrRow label={t('wizard.scheduleWizard.review.postBackupScript')}>
            {postScript ? (
              <span className="text-sm font-medium">{postScript.name}</span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {t('wizard.scheduleWizard.review.none')}
              </span>
            )}
          </AttrRow>
          <AttrRow label={t('wizard.scheduleWizard.review.repositoryLevelScripts')}>
            <span
              className={cn(
                'text-[0.62rem] font-semibold px-1.5 py-0.5 rounded-full',
                data.runRepositoryScripts
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {data.runRepositoryScripts
                ? t('wizard.scheduleWizard.review.enabled')
                : t('wizard.scheduleWizard.review.disabled')}
            </span>
          </AttrRow>
        </SectionCard>

        {/* Maintenance card */}
        <SectionCard
          icon={<Wrench size={14} />}
          label={t('wizard.scheduleWizard.review.maintenanceSettings')}
          iconClass="bg-muted text-muted-foreground"
          cardClass="bg-muted/20"
        >
          <AttrRow label={t('wizard.scheduleWizard.review.pruneAfterBackup')}>
            <span
              className={cn(
                'text-[0.62rem] font-semibold px-1.5 py-0.5 rounded-full',
                data.runPruneAfter
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {data.runPruneAfter
                ? t('wizard.scheduleWizard.review.enabled')
                : t('wizard.scheduleWizard.review.disabled')}
            </span>
          </AttrRow>
          {data.runPruneAfter && (
            <AttrRow label="Keep:">
              <CodePill>{pruneKeeps}</CodePill>
            </AttrRow>
          )}
          <AttrRow label={t('wizard.scheduleWizard.review.compactAfterPrune')}>
            <span
              className={cn(
                'text-[0.62rem] font-semibold px-1.5 py-0.5 rounded-full',
                data.runCompactAfter
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {data.runCompactAfter
                ? t('wizard.scheduleWizard.review.enabled')
                : t('wizard.scheduleWizard.review.disabled')}
            </span>
          </AttrRow>
        </SectionCard>
      </div>
    </div>
  )
}

export default WizardStepScheduleReview
