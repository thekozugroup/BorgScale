import React from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import MultiRepositorySelector from '../../MultiRepositorySelector'
import { Repository } from '../../../types'

interface WizardStepBasicInfoData {
  name: string
  description: string
  repositoryIds: number[]
}

interface WizardStepBasicInfoProps {
  data: WizardStepBasicInfoData
  repositories: Repository[]
  onChange: (updates: Partial<WizardStepBasicInfoData>) => void
}

const WizardStepBasicInfo: React.FC<WizardStepBasicInfoProps> = ({
  data,
  repositories,
  onChange,
}) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="job-name">
          {t('wizard.scheduleWizard.basicInfo.jobNameLabel')} *
        </Label>
        <Input
          id="job-name"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          required
          placeholder={t('wizard.scheduleWizard.basicInfo.jobNamePlaceholder')}
          className="text-base"
          aria-label={t('wizard.scheduleWizard.basicInfo.jobNameLabel')}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="job-description">
          {t('wizard.scheduleWizard.basicInfo.descriptionLabel')}
        </Label>
        <Textarea
          id="job-description"
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={t('wizard.scheduleWizard.basicInfo.descriptionPlaceholder')}
          rows={2}
          className="text-base resize-none"
        />
      </div>

      <MultiRepositorySelector
        repositories={repositories}
        selectedIds={data.repositoryIds}
        onChange={(ids) => onChange({ repositoryIds: ids })}
        label={t('wizard.scheduleWizard.basicInfo.repositoriesLabel')}
        placeholder={t('wizard.scheduleWizard.basicInfo.repositoriesPlaceholder')}
        helperText={t('wizard.scheduleWizard.basicInfo.repositoriesHelper')}
        required
        size="medium"
        allowReorder={true}
        filterMode="observe"
      />

      {data.repositoryIds.length === 0 && (
        <Alert>
          <AlertDescription>
            {t('wizard.scheduleWizard.basicInfo.selectAtLeastOne')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default WizardStepBasicInfo
