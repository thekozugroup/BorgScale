import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { settingsAPI } from '../services/api'
import { useAnalytics } from '../hooks/useAnalytics'
import SettingsCard from './SettingsCard'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'

const BetaFeaturesTab: React.FC = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { trackSettings, EventAction } = useAnalytics()
  const [bypassLockOnInfo, setBypassLockOnInfo] = useState(false)
  const [bypassLockOnList, setBypassLockOnList] = useState(false)
  const [borg2FastBrowseBetaEnabled, setBorg2FastBrowseBetaEnabled] = useState(false)
  const [mqttBetaEnabled, setMqttBetaEnabled] = useState(false)

  const { data: systemData, isLoading: systemLoading } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: async () => {
      const response = await settingsAPI.getSystemSettings()
      return response.data
    },
  })

  const systemSettings = systemData?.settings

  useEffect(() => {
    if (systemSettings) {
      setBypassLockOnInfo(systemSettings.bypass_lock_on_info ?? false)
      setBypassLockOnList(systemSettings.bypass_lock_on_list ?? false)
      setBorg2FastBrowseBetaEnabled(systemSettings.borg2_fast_browse_beta_enabled ?? false)
      setMqttBetaEnabled(systemSettings.mqtt_beta_enabled ?? false)
    }
  }, [systemSettings])

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: {
      bypass_lock_on_info?: boolean
      bypass_lock_on_list?: boolean
      borg2_fast_browse_beta_enabled?: boolean
      mqtt_beta_enabled?: boolean
    }) => {
      await settingsAPI.updateSystemSettings(settings)
    },
    onSuccess: () => {
      toast.success(t('betaFeatures.settingUpdatedSuccessfully'))
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] })
    },
    onError: (error: Error) => {
      toast.error(t('betaFeatures.failedToUpdateSetting', { message: error.message }))
      if (systemSettings) {
        setBypassLockOnInfo(systemSettings.bypass_lock_on_info ?? false)
        setBypassLockOnList(systemSettings.bypass_lock_on_list ?? false)
        setBorg2FastBrowseBetaEnabled(systemSettings.borg2_fast_browse_beta_enabled ?? false)
        setMqttBetaEnabled(systemSettings.mqtt_beta_enabled ?? false)
      }
    },
  })

  const handleToggle = (checked: boolean) => {
    setBypassLockOnInfo(checked)
    trackSettings(EventAction.EDIT, { section: 'beta_features', feature: 'bypass_lock_on_info', enabled: checked })
    saveSettingsMutation.mutate({ bypass_lock_on_info: checked })
  }

  const handleListToggle = (checked: boolean) => {
    setBypassLockOnList(checked)
    trackSettings(EventAction.EDIT, { section: 'beta_features', feature: 'bypass_lock_on_list', enabled: checked })
    saveSettingsMutation.mutate({ bypass_lock_on_list: checked })
  }

  const handleBorg2FastBrowseToggle = (checked: boolean) => {
    setBorg2FastBrowseBetaEnabled(checked)
    trackSettings(EventAction.EDIT, { section: 'beta_features', feature: 'borg2_fast_browse_beta_enabled', enabled: checked })
    saveSettingsMutation.mutate({ borg2_fast_browse_beta_enabled: checked })
  }

  const handleMQTTBetaToggle = (checked: boolean) => {
    setMqttBetaEnabled(checked)
    trackSettings(EventAction.EDIT, { section: 'beta_features', feature: 'mqtt_beta_enabled', enabled: checked })
    saveSettingsMutation.mutate({ mqtt_beta_enabled: checked })
  }

  if (systemLoading) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: 200 }}>
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  const betaItems = [
    {
      title: t('betaFeatures.bypassLocksInfoTitle'),
      label: t('betaFeatures.enableBypassLocksInfo'),
      description: t('betaFeatures.bypassLocksInfoDescription'),
      checked: bypassLockOnInfo,
      onChange: handleToggle,
    },
    {
      title: t('betaFeatures.bypassLocksListTitle'),
      label: t('betaFeatures.enableBypassLocksList'),
      description: t('betaFeatures.bypassLocksListDescription'),
      checked: bypassLockOnList,
      onChange: handleListToggle,
    },
    {
      title: t('betaFeatures.borg2FastBrowseTitle'),
      label: t('betaFeatures.enableBorg2FastBrowse'),
      description: t('betaFeatures.borg2FastBrowseDescription'),
      checked: borg2FastBrowseBetaEnabled,
      onChange: handleBorg2FastBrowseToggle,
    },
    {
      title: t('betaFeatures.mqttIntegrationTitle'),
      label: t('betaFeatures.enableMqtt'),
      description: t('betaFeatures.mqttIntegrationDescription'),
      checked: mqttBetaEnabled,
      onChange: handleMQTTBetaToggle,
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-1">{t('betaFeatures.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('betaFeatures.description')}</p>
      </div>

      <SettingsCard className="max-w-3xl">
        <div className="flex flex-col gap-6">
          {betaItems.map((item) => (
            <div key={item.title}>
              <p className="text-sm font-semibold mb-3">{item.title}</p>
              <div className="flex items-start gap-3">
                <Switch
                  checked={item.checked}
                  onCheckedChange={item.onChange}
                  disabled={saveSettingsMutation.isPending}
                  className="mt-0.5 flex-shrink-0"
                />
                <div>
                  <p className="text-sm">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SettingsCard>
    </div>
  )
}

export default BetaFeaturesTab
