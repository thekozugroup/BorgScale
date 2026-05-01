import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Wifi, Lock, Key, Shield, AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react'
import SettingsCard from './SettingsCard'
import { toast } from 'react-hot-toast'
import { settingsAPI } from '../services/api'
import { translateBackendKey } from '../utils/translateBackendKey'
import { useAnalytics } from '../hooks/useAnalytics'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MqttSettingsTab: React.FC = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { trackSystem, EventAction } = useAnalytics()

  const [mqttEnabled, setMqttEnabled] = useState(false)
  const [mqttBrokerUrl, setMqttBrokerUrl] = useState('')
  const [mqttBrokerPort, setMqttBrokerPort] = useState(1883)
  const [mqttUsername, setMqttUsername] = useState('')
  const [mqttPassword, setMqttPassword] = useState('')
  const [mqttClientId, setMqttClientId] = useState('borgscale')
  const [mqttQos, setMqttQos] = useState(1)
  const [mqttRetain, setMqttRetain] = useState(false)
  const [mqttTlsEnabled, setMqttTlsEnabled] = useState(false)
  const [mqttTlsCaCert, setMqttTlsCaCert] = useState('')
  const [mqttTlsClientCert, setMqttTlsClientCert] = useState('')
  const [mqttTlsClientKey, setMqttTlsClientKey] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [passwordChanged, setPasswordChanged] = useState(false)

  const { data: systemData, isLoading } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: async () => {
      const response = await settingsAPI.getSystemSettings()
      return response.data
    },
  })

  const systemSettings = systemData?.settings

  useEffect(() => {
    if (systemSettings) {
      setMqttEnabled(systemSettings.mqtt_enabled || false)
      setMqttBrokerUrl(systemSettings.mqtt_broker_url || '')
      setMqttBrokerPort(systemSettings.mqtt_broker_port || 1883)
      setMqttUsername(systemSettings.mqtt_username || '')
      setMqttClientId(systemSettings.mqtt_client_id || 'borgscale')
      setMqttQos(systemSettings.mqtt_qos || 1)
      setMqttRetain(systemSettings.mqtt_retain || false)
      setMqttTlsEnabled(systemSettings.mqtt_tls_enabled || false)
      setMqttTlsCaCert(systemSettings.mqtt_tls_ca_cert || '')
      setMqttTlsClientCert(systemSettings.mqtt_tls_client_cert || '')
      setMqttTlsClientKey(systemSettings.mqtt_tls_client_key || '')
      setPasswordChanged(false)
      setHasChanges(false)
    }
  }, [systemSettings])

  useEffect(() => {
    if (systemSettings) {
      const changesDetected =
        mqttEnabled !== (systemSettings.mqtt_enabled || false) ||
        mqttBrokerUrl !== (systemSettings.mqtt_broker_url || '') ||
        mqttBrokerPort !== (systemSettings.mqtt_broker_port || 1883) ||
        mqttUsername !== (systemSettings.mqtt_username || '') ||
        mqttClientId !== (systemSettings.mqtt_client_id || 'borgscale') ||
        mqttQos !== (systemSettings.mqtt_qos || 1) ||
        mqttRetain !== (systemSettings.mqtt_retain || false) ||
        mqttTlsEnabled !== (systemSettings.mqtt_tls_enabled || false) ||
        mqttTlsCaCert !== (systemSettings.mqtt_tls_ca_cert || '') ||
        mqttTlsClientCert !== (systemSettings.mqtt_tls_client_cert || '') ||
        mqttTlsClientKey !== (systemSettings.mqtt_tls_client_key || '') ||
        passwordChanged

      setHasChanges(changesDetected)
    }
  }, [
    mqttEnabled, mqttBrokerUrl, mqttBrokerPort, mqttUsername, mqttClientId,
    mqttQos, mqttRetain, mqttTlsEnabled, mqttTlsCaCert, mqttTlsClientCert,
    mqttTlsClientKey, passwordChanged, systemSettings,
  ])

  const saveMqttSettingsMutation = useMutation({
    mutationFn: async () => {
      return await settingsAPI.updateSystemSettings({
        mqtt_enabled: mqttEnabled,
        mqtt_broker_url: mqttBrokerUrl || null,
        mqtt_broker_port: mqttBrokerPort,
        mqtt_username: mqttUsername || null,
        mqtt_password: passwordChanged ? mqttPassword : undefined,
        mqtt_client_id: mqttClientId,
        mqtt_qos: mqttQos,
        mqtt_retain: mqttRetain,
        mqtt_tls_enabled: mqttTlsEnabled,
        mqtt_tls_ca_cert: mqttTlsCaCert || null,
        mqtt_tls_client_cert: mqttTlsClientCert || null,
        mqtt_tls_client_key: mqttTlsClientKey || null,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] })
      toast.success(t('mqttSettings.savedSuccessfully'))
      setHasChanges(false)
      setPasswordChanged(false)
      trackSystem(EventAction.EDIT, {
        section: 'mqtt',
        enabled: mqttEnabled,
        tls_enabled: mqttTlsEnabled,
        qos: mqttQos,
        retain: mqttRetain,
      })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      const data = error.response?.data
      let errorMsg = t('mqtt.failedToSaveMqttSettings')
      if (Array.isArray(data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorMsg = data.map((e: any) => e.msg).join(', ')
      } else if (data?.detail) {
        errorMsg = translateBackendKey(data.detail)
      }
      toast.error(errorMsg)
    },
  })

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMqttPassword(e.target.value)
    setPasswordChanged(true)
  }

  const isSaving = saveMqttSettingsMutation.isPending

  if (isLoading) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: 400 }}>
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <p className="text-lg font-bold mb-1">{t('mqttSettings.title')}</p>
          <p className="text-sm text-muted-foreground">{t('mqtt.subtitle')}</p>
        </div>
        <Button
          onClick={() => saveMqttSettingsMutation.mutate()}
          disabled={!hasChanges || isSaving}
          className="w-full sm:w-auto gap-1.5"
        >
          {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {isSaving ? t('mqttSettings.saving') : t('mqttSettings.save')}
        </Button>
      </div>

      {/* Connection Card */}
      <SettingsCard>
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wifi size={20} />
              <p className="text-sm font-semibold">{t('mqtt.connectionTitle')}</p>
            </div>
            <p className="text-sm text-muted-foreground">{t('mqtt.connectionDescription')}</p>
          </div>

          <div className="border-t border-border" />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={mqttEnabled}
              onChange={(e) => setMqttEnabled(e.target.checked)}
            />
            <span className="text-sm">{t('mqtt.enableMqttPublishing')}</span>
          </label>

          {mqttEnabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mqtt-broker-url" className="text-xs font-semibold mb-1.5 block">{t('mqtt.brokerUrlLabel')}</Label>
                  <Input
                    id="mqtt-broker-url"
                    placeholder={t('mqtt.brokerUrlPlaceholder')}
                    value={mqttBrokerUrl}
                    onChange={(e) => setMqttBrokerUrl(e.target.value)}
                    required
                    className="h-9 text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('mqtt.brokerUrlHelper')}</p>
                </div>

                <div>
                  <Label htmlFor="mqtt-broker-port" className="text-xs font-semibold mb-1.5 block">{t('mqtt.brokerPortLabel')}</Label>
                  <Input
                    id="mqtt-broker-port"
                    type="number"
                    value={mqttBrokerPort}
                    onChange={(e) => setMqttBrokerPort(Number(e.target.value))}
                    min={1}
                    max={65535}
                    step={1}
                    className="h-9 text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('mqtt.brokerPortHelper')}</p>
                </div>

                <div>
                  <Label htmlFor="mqtt-username" className="text-xs font-semibold mb-1.5 block">{t('mqtt.usernameLabel')}</Label>
                  <div className="relative">
                    <Key size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="mqtt-username"
                      placeholder={t('mqtt.usernamePlaceholder')}
                      value={mqttUsername}
                      onChange={(e) => setMqttUsername(e.target.value)}
                      className="h-9 text-sm pl-8"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t('mqtt.usernameHelper')}</p>
                </div>

                <div>
                  <Label htmlFor="mqtt-password" className="text-xs font-semibold mb-1.5 block">{t('mqtt.passwordLabel')}</Label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="mqtt-password"
                      type={showPassword ? 'text' : 'password'}
                      value={mqttPassword}
                      onChange={handlePasswordChange}
                      className="h-9 text-sm pl-8 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {systemSettings?.mqtt_password_set ? t('mqtt.passwordIsSet') : t('mqtt.passwordHelper')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="mqtt-client-id" className="text-xs font-semibold mb-1.5 block">{t('mqtt.clientIdLabel')}</Label>
                  <Input
                    id="mqtt-client-id"
                    value={mqttClientId}
                    onChange={(e) => setMqttClientId(e.target.value)}
                    className="h-9 text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('mqtt.clientIdHelper')}</p>
                </div>

                <div>
                  <Label htmlFor="mqtt-qos" className="text-xs font-semibold mb-1.5 block">{t('mqtt.qosLevelLabel')}</Label>
                  <Input
                    id="mqtt-qos"
                    type="number"
                    value={mqttQos}
                    onChange={(e) => setMqttQos(Math.min(Math.max(0, Number(e.target.value)), 2))}
                    min={0}
                    max={2}
                    step={1}
                    className="h-9 text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('mqtt.qosLevelHelper')}</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mqttRetain}
                  onChange={(e) => setMqttRetain(e.target.checked)}
                />
                <span className="text-sm">{t('mqtt.retainMessages')}</span>
              </label>
            </>
          )}
        </div>
      </SettingsCard>

      {/* TLS/SSL Card */}
      {mqttEnabled && (
        <SettingsCard>
          <div className="flex flex-col gap-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield size={20} />
                <p className="text-sm font-semibold">{t('mqtt.tlsConfigTitle')}</p>
              </div>
              <p className="text-sm text-muted-foreground">{t('mqtt.tlsConfigDescription')}</p>
            </div>

            <div className="border-t border-border" />

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mqttTlsEnabled}
                onChange={(e) => setMqttTlsEnabled(e.target.checked)}
              />
              <span className="text-sm">{t('mqtt.enableTls')}</span>
            </label>

            {mqttTlsEnabled && (
              <div className="flex flex-col gap-4">
                <div>
                  <Label htmlFor="mqtt-ca-cert" className="text-xs font-semibold mb-1.5 block">{t('mqtt.caCertPathLabel')}</Label>
                  <Input
                    id="mqtt-ca-cert"
                    placeholder="/path/to/ca.crt"
                    value={mqttTlsCaCert}
                    onChange={(e) => setMqttTlsCaCert(e.target.value)}
                    className="h-9 text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('mqtt.caCertPathHelper')}</p>
                </div>

                <div>
                  <Label htmlFor="mqtt-client-cert" className="text-xs font-semibold mb-1.5 block">{t('mqtt.clientCertPathLabel')}</Label>
                  <Input
                    id="mqtt-client-cert"
                    placeholder="/path/to/client.crt"
                    value={mqttTlsClientCert}
                    onChange={(e) => setMqttTlsClientCert(e.target.value)}
                    className="h-9 text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('mqtt.clientCertPathHelper')}</p>
                </div>

                <div>
                  <Label htmlFor="mqtt-client-key" className="text-xs font-semibold mb-1.5 block">{t('mqtt.clientKeyPathLabel')}</Label>
                  <Input
                    id="mqtt-client-key"
                    placeholder="/path/to/client.key"
                    value={mqttTlsClientKey}
                    onChange={(e) => setMqttTlsClientKey(e.target.value)}
                    className="h-9 text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('mqtt.clientKeyPathHelper')}</p>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-xl text-sm bg-muted border border-border text-muted-foreground">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>{t('mqtt.noteLabel')}</strong> {t('mqtt.dockerVolumesWarning')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </SettingsCard>
      )}
    </div>
  )
}

export default MqttSettingsTab
