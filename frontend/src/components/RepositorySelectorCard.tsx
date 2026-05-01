import { useTranslation } from 'react-i18next'
import { Repository } from '../types'
import RepoSelect from './RepoSelect'

interface RepositorySelectorCardProps {
  title?: string
  repositories: Repository[]
  value: number | string | null
  onChange: (value: number | string) => void
  loading?: boolean
  valueKey?: 'id' | 'path'
  className?: string
}

export default function RepositorySelectorCard({
  repositories,
  value,
  onChange,
  loading = false,
  valueKey = 'id',
  className,
}: RepositorySelectorCardProps) {
  const { t } = useTranslation()
  return (
    <div className={className ?? 'mb-6'}>
      <RepoSelect
        repositories={repositories}
        value={value ?? ''}
        onChange={onChange}
        loading={loading}
        valueKey={valueKey}
        label={t('common.repository')}
        loadingLabel={t('repositorySelectorCard.loading')}
        placeholderLabel={t('repositorySelectorCard.placeholder')}
        maintenanceLabel={t('repositorySelectorCard.maintenanceRunning')}
      />
    </div>
  )
}
