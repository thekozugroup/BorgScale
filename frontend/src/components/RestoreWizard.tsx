import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Files, HardDrive, CheckCircle } from 'lucide-react'
import {
  WizardStepIndicator,
  WizardStepRestoreFiles,
  WizardStepRestoreDestination,
  WizardStepRestoreReview,
} from './wizard'
import FileExplorerDialog from './FileExplorerDialog'
import { sshKeysAPI } from '../services/api'
import type { Archive, Repository } from '../types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface SSHConnection {
  id: number
  host: string
  username: string
  port: number
  ssh_key_id: number
  default_path?: string
  mount_point?: string
  status: string
}

interface ArchiveFile {
  path: string
  mode: string
  user: string
  group: string
  size: number
  mtime: string
  healthy: boolean
}

interface RestoreWizardProps {
  open: boolean
  onClose: () => void
  archive: Pick<Archive, 'id' | 'name'>
  repository: Repository
  repositoryType: string
  onRestore: (data: RestoreData) => void
}

export interface RestoreData {
  selected_paths: string[]
  destination_type: 'local' | 'ssh'
  destination_connection_id: number | null
  restore_strategy: 'original' | 'custom'
  custom_path: string | null
}

interface WizardState {
  selectedPaths: string[]
  destinationType: 'local' | 'ssh'
  destinationConnectionId: number | ''
  restoreStrategy: 'original' | 'custom'
  customPath: string
}

const initialState: WizardState = {
  selectedPaths: [],
  destinationType: 'local',
  destinationConnectionId: '',
  restoreStrategy: 'original',
  customPath: '',
}

const RestoreWizard = ({
  open,
  onClose,
  archive,
  repository,
  repositoryType,
  onRestore,
}: RestoreWizardProps) => {
  const { t } = useTranslation()
  const [activeStep, setActiveStep] = useState(0)
  const [wizardState, setWizardState] = useState<WizardState>(initialState)
  const [sshConnections, setSshConnections] = useState<SSHConnection[]>([])
  const wasOpenRef = useRef(false)

  const [showPathExplorer, setShowPathExplorer] = useState(false)

  const steps = useMemo(
    () => [
      { key: 'files', label: t('restoreWizard.steps.files'), icon: <Files size={14} /> },
      {
        key: 'destination',
        label: t('restoreWizard.steps.destination'),
        icon: <HardDrive size={14} />,
      },
      { key: 'review', label: t('restoreWizard.steps.review'), icon: <CheckCircle size={14} /> },
    ],
    [t]
  )

  const loadSshConnections = async () => {
    try {
      const connectionsRes = await sshKeysAPI.getSSHConnections()
      const connections = connectionsRes.data?.connections || []
      setSshConnections(Array.isArray(connections) ? connections : [])
    } catch (error) {
      console.error('Failed to load SSH connections:', error)
      setSshConnections([])
    }
  }

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setActiveStep(0)
      setWizardState(initialState)
      loadSshConnections()
      wasOpenRef.current = true
    } else if (!open && wasOpenRef.current) {
      wasOpenRef.current = false
    }
  }, [open])

  useEffect(() => {
    if (open && repositoryType === 'ssh' && wizardState.destinationType === 'ssh') {
      setWizardState((prev) => ({
        ...prev,
        destinationType: 'local',
        destinationConnectionId: '',
      }))
    }
  }, [open, repositoryType, wizardState.destinationType])

  const handleStateChange = (updates: Partial<WizardState>) => {
    if (repositoryType === 'ssh' && updates.destinationType === 'ssh') {
      return
    }
    setWizardState((prev) => ({ ...prev, ...updates }))
  }

  const handleSshConnectionSelect = (connectionId: number) => {
    const connection = sshConnections.find((c) => c.id === connectionId)
    if (connection) {
      handleStateChange({
        destinationConnectionId: connectionId,
        customPath: connection.default_path || wizardState.customPath,
      })
    }
  }

  const canProceed = () => {
    const currentStepKey = steps[activeStep]?.key

    switch (currentStepKey) {
      case 'files':
        return wizardState.selectedPaths.length > 0

      case 'destination':
        if (wizardState.destinationType === 'ssh' && !wizardState.destinationConnectionId) {
          return false
        }
        if (wizardState.restoreStrategy === 'custom' && !wizardState.customPath.trim()) {
          return false
        }
        return true

      case 'review':
        return true

      default:
        return true
    }
  }

  const handleNext = () => {
    setActiveStep((prev) => prev + 1)
  }

  const handleBack = () => {
    setActiveStep((prev) => prev - 1)
  }

  const handleSubmit = () => {
    const data: RestoreData = {
      selected_paths: wizardState.selectedPaths,
      destination_type: wizardState.destinationType,
      destination_connection_id:
        wizardState.destinationType === 'ssh' && wizardState.destinationConnectionId
          ? (wizardState.destinationConnectionId as number)
          : null,
      restore_strategy: wizardState.restoreStrategy,
      custom_path: wizardState.restoreStrategy === 'custom' ? wizardState.customPath : null,
    }

    onRestore(data)
  }

  const renderStepContent = () => {
    const currentStepKey = steps[activeStep]?.key

    const selectedFiles: ArchiveFile[] = wizardState.selectedPaths.map((path) => ({
      path,
      mode: '',
      user: '',
      group: '',
      size: 0,
      mtime: '',
      healthy: true,
    }))

    switch (currentStepKey) {
      case 'files':
        return (
          <WizardStepRestoreFiles
            repository={repository}
            archive={archive}
            data={{
              selectedPaths: wizardState.selectedPaths,
            }}
            onChange={handleStateChange}
          />
        )

      case 'destination':
        return (
          <WizardStepRestoreDestination
            data={{
              destinationType: wizardState.destinationType,
              destinationConnectionId: wizardState.destinationConnectionId,
              restoreStrategy: wizardState.restoreStrategy,
              customPath: wizardState.customPath,
            }}
            sshConnections={sshConnections}
            repositoryType={repositoryType}
            onChange={(updates) => {
              if (
                updates.destinationConnectionId &&
                updates.destinationConnectionId !== wizardState.destinationConnectionId
              ) {
                handleSshConnectionSelect(updates.destinationConnectionId as number)
              } else {
                handleStateChange(updates)
              }
            }}
            onBrowsePath={() => setShowPathExplorer(true)}
          />
        )

      case 'review':
        return (
          <WizardStepRestoreReview
            data={{
              destinationType: wizardState.destinationType,
              destinationConnectionId: wizardState.destinationConnectionId,
              restoreStrategy: wizardState.restoreStrategy,
              customPath: wizardState.customPath,
            }}
            selectedFiles={selectedFiles}
            sshConnections={sshConnections}
            archiveName={archive.name}
          />
        )

      default:
        return null
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
        <DialogContent
          showCloseButton={false}
          className="max-w-2xl w-full p-0 gap-0 overflow-hidden rounded-2xl"
        >
          <DialogHeader className="px-6 pt-5 pb-3">
            <DialogTitle className="text-xl font-bold">
              {t('restoreWizard.title')}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t('restoreWizard.fromArchive', { archiveName: archive.name })}
            </p>
          </DialogHeader>

          <div className="px-6 pb-4">
            {/* Step Indicator */}
            <WizardStepIndicator
              steps={steps}
              currentStep={activeStep}
              onStepClick={setActiveStep}
            />

            {/* Step Content */}
            <div className="h-[450px] overflow-auto">
              {activeStep === 0 ? (
                <div className="h-full px-3 py-2">{renderStepContent()}</div>
              ) : (
                <div className="px-3 py-2">{renderStepContent()}</div>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 pb-5 flex-row gap-2">
            <Button variant="ghost" onClick={onClose}>
              {t('common.buttons.cancel')}
            </Button>
            <div className="flex-1" />
            <Button variant="outline" disabled={activeStep === 0} onClick={handleBack}>
              {t('common.buttons.back')}
            </Button>
            {activeStep < steps.length - 1 ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                {t('common.buttons.next')}
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canProceed()}>
                {t('restoreWizard.buttons.restore')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Explorer Dialog for custom path */}
      {showPathExplorer && (
        <FileExplorerDialog
          key={`path-explorer-${wizardState.destinationType}-${wizardState.destinationConnectionId}`}
          open={showPathExplorer}
          onClose={() => setShowPathExplorer(false)}
          onSelect={(paths) => {
            if (paths.length > 0) {
              handleStateChange({ customPath: paths[0] })
            }
            setShowPathExplorer(false)
          }}
          title={t('restoreWizard.fileExplorer.selectRestoreDestination')}
          initialPath={
            wizardState.destinationType === 'ssh' && wizardState.destinationConnectionId
              ? sshConnections.find((c) => c.id === wizardState.destinationConnectionId)
                  ?.default_path || '/'
              : '/'
          }
          multiSelect={false}
          connectionType={wizardState.destinationType === 'local' ? 'local' : 'ssh'}
          sshConfig={
            wizardState.destinationType === 'ssh' && wizardState.destinationConnectionId
              ? (() => {
                  const conn = sshConnections.find(
                    (c) => c.id === wizardState.destinationConnectionId
                  )
                  return conn
                    ? {
                        ssh_key_id: conn.ssh_key_id,
                        host: conn.host,
                        username: conn.username,
                        port: conn.port,
                      }
                    : undefined
                })()
              : undefined
          }
          selectMode="directories"
          showSshMountPoints={false}
        />
      )}
    </>
  )
}

export default RestoreWizard
