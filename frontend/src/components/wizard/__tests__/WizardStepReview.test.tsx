import { describe, expect, it, vi } from 'vitest'
import { screen, renderWithProviders } from '../../../test/test-utils'
import WizardStepReview, { WizardReviewData } from '../WizardStepReview'

// Mock CommandPreview
vi.mock('../../CommandPreview', () => ({
  default: ({ mode }: { mode: string }) => (
    <div data-testid="command-preview">Command Preview - {mode}</div>
  ),
}))

// Mock BackupFlowPreview
vi.mock('../BackupFlowPreview', () => ({
  default: ({
    repositoryLocation,
    dataSource,
  }: {
    repositoryLocation: string
    dataSource: string
  }) => (
    <div data-testid="backup-flow-preview">
      Flow: {dataSource} to {repositoryLocation}
    </div>
  ),
}))

const mockSshConnections = [
  {
    id: 1,
    host: 'backup.server.com',
    username: 'backupuser',
    port: 22,
    ssh_key_id: 1,
  },
]

const defaultData: WizardReviewData = {
  name: 'My Repository',
  repositoryMode: 'full',
  repositoryLocation: 'local',
  path: '/backups/myrepo',
  repoSshConnectionId: '',
  dataSource: 'local',
  sourceSshConnectionId: '',
  sourceDirs: ['/home/user', '/var/data'],
  encryption: 'repokey',
  passphrase: 'secret123',
  compression: 'lz4',
  excludePatterns: ['*.tmp', '*.log'],
  customFlags: '',
  remotePath: '',
}

describe('WizardStepReview', () => {
  describe('Configuration Summary', () => {
    it('renders configuration summary header', () => {
      renderWithProviders(
        <WizardStepReview mode="create" data={defaultData} sshConnections={mockSshConnections} />
      )

      expect(screen.getByText('Configuration Summary')).toBeInTheDocument()
    })

    it('shows repository name', () => {
      renderWithProviders(
        <WizardStepReview mode="create" data={defaultData} sshConnections={mockSshConnections} />
      )

      expect(screen.getByText('My Repository')).toBeInTheDocument()
    })

    it('shows repository path', () => {
      renderWithProviders(
        <WizardStepReview mode="create" data={defaultData} sshConnections={mockSshConnections} />
      )

      expect(screen.getByText('/backups/myrepo')).toBeInTheDocument()
    })

    it('shows Full mode chip', () => {
      renderWithProviders(
        <WizardStepReview mode="create" data={defaultData} sshConnections={mockSshConnections} />
      )

      expect(screen.getByText('Full')).toBeInTheDocument()
    })

    it('shows Observe Only mode chip', () => {
      const observeData = { ...defaultData, repositoryMode: 'observe' as const }

      renderWithProviders(
        <WizardStepReview mode="create" data={observeData} sshConnections={mockSshConnections} />
      )

      expect(screen.getByText('Observe Only')).toBeInTheDocument()
    })

    it('shows BorgScale Server for local location', () => {
      renderWithProviders(
        <WizardStepReview mode="create" data={defaultData} sshConnections={mockSshConnections} />
      )

      // Multiple instances: location summary and data source
      const borgUIServers = screen.getAllByText('BorgScale Server')
      expect(borgUIServers.length).toBeGreaterThanOrEqual(1)
    })

    it('shows SSH Remote for ssh location', () => {
      const sshData = { ...defaultData, repositoryLocation: 'ssh' as const }

      renderWithProviders(<WizardStepReview mode="create" data={sshData} sshConnections={mockSshConnections} />)

      expect(screen.getByText('SSH Remote')).toBeInTheDocument()
    })
  })

  describe('Data Source Section', () => {
    it('shows data source section for full mode', () => {
      renderWithProviders(
        <WizardStepReview mode="create" data={defaultData} sshConnections={mockSshConnections} />
      )

      expect(screen.getByText('DATA SOURCE')).toBeInTheDocument()
    })

    it('hides data source section for observe mode', () => {
      const observeData = { ...defaultData, repositoryMode: 'observe' as const }

      renderWithProviders(
        <WizardStepReview mode="create" data={observeData} sshConnections={mockSshConnections} />
      )

      expect(screen.queryByText('DATA SOURCE')).not.toBeInTheDocument()
    })

    it('shows Remote Client for remote data source', () => {
      const remoteData = { ...defaultData, dataSource: 'remote' as const, sourceSshConnectionId: 1 }

      renderWithProviders(
        <WizardStepReview mode="create" data={remoteData} sshConnections={mockSshConnections} />
      )

      expect(screen.getByText('Remote Client')).toBeInTheDocument()
    })

    it('shows directory count for local source', () => {
      renderWithProviders(
        <WizardStepReview mode="create" data={defaultData} sshConnections={mockSshConnections} />
      )

      // Both directories and exclude patterns show "2 configured"
      const configuredTexts = screen.getAllByText('2 configured')
      expect(configuredTexts.length).toBeGreaterThanOrEqual(1)
    })

    it('shows exclude pattern count for local source', () => {
      renderWithProviders(
        <WizardStepReview mode="create" data={defaultData} sshConnections={mockSshConnections} />
      )

      // Both directories and exclude patterns show "2 configured"
      const configuredTexts = screen.getAllByText('2 configured')
      expect(configuredTexts).toHaveLength(2)
    })
  })

  describe('Security Section', () => {
    it('shows security section', () => {
      renderWithProviders(
        <WizardStepReview mode="create" data={defaultData} sshConnections={mockSshConnections} />
      )

      expect(screen.getByText('SECURITY')).toBeInTheDocument()
    })

    it('shows encryption chip for create mode', () => {
      renderWithProviders(
        <WizardStepReview mode="create" data={defaultData} sshConnections={mockSshConnections} />
      )

      expect(screen.getByText('Repokey')).toBeInTheDocument()
    })

    it('shows Keyfile encryption chip', () => {
      const keyfileData = { ...defaultData, encryption: 'keyfile' }

      renderWithProviders(
        <WizardStepReview mode="create" data={keyfileData} sshConnections={mockSshConnections} />
      )

      expect(screen.getByText('Keyfile')).toBeInTheDocument()
    })

    it('shows Repokey encryption chip for Borg v2 repokey modes', () => {
      const borg2RepokeyData = { ...defaultData, encryption: 'repokey-aes-ocb' }

      renderWithProviders(
        <WizardStepReview
          mode="create"
          data={borg2RepokeyData}
          sshConnections={mockSshConnections}
        />
      )

      expect(screen.getByText('Repokey')).toBeInTheDocument()
    })

    it('shows Keyfile encryption chip for Borg v2 keyfile modes', () => {
      const borg2KeyfileData = { ...defaultData, encryption: 'keyfile-chacha20-poly1305' }

      renderWithProviders(
        <WizardStepReview
          mode="create"
          data={borg2KeyfileData}
          sshConnections={mockSshConnections}
        />
      )

      expect(screen.getByText('Keyfile')).toBeInTheDocument()
    })

    it('shows None encryption chip', () => {
      const noEncryptionData = { ...defaultData, encryption: 'none' }

      renderWithProviders(
        <WizardStepReview
          mode="create"
          data={noEncryptionData}
          sshConnections={mockSshConnections}
        />
      )

      expect(screen.getByText('None')).toBeInTheDocument()
    })

    it('hides encryption row for import mode', () => {
      renderWithProviders(
        <WizardStepReview mode="import" data={defaultData} sshConnections={mockSshConnections} />
      )

      // Should not show encryption chip in import mode
      expect(screen.queryByText('Repokey')).not.toBeInTheDocument()
    })

    it('shows masked passphrase when set', () => {
      renderWithProviders(
        <WizardStepReview mode="create" data={defaultData} sshConnections={mockSshConnections} />
      )

      expect(screen.getByText('••••••••')).toBeInTheDocument()
    })

    it('shows (not set) when passphrase is empty', () => {
      const noPassphraseData = { ...defaultData, passphrase: '' }

      renderWithProviders(
        <WizardStepReview
          mode="create"
          data={noPassphraseData}
          sshConnections={mockSshConnections}
        />
      )

      expect(screen.getByText('(not set)')).toBeInTheDocument()
    })
  })

  describe('Backup Configuration Section', () => {
    it('shows backup configuration section for full mode', () => {
      renderWithProviders(
        <WizardStepReview mode="create" data={defaultData} sshConnections={mockSshConnections} />
      )

      expect(screen.getByText('BACKUP CONFIGURATION')).toBeInTheDocument()
    })

    it('hides backup configuration section for observe mode', () => {
      const observeData = { ...defaultData, repositoryMode: 'observe' as const }

      renderWithProviders(
        <WizardStepReview mode="create" data={observeData} sshConnections={mockSshConnections} />
      )

      expect(screen.queryByText('BACKUP CONFIGURATION')).not.toBeInTheDocument()
    })

    it('shows compression value', () => {
      renderWithProviders(
        <WizardStepReview mode="create" data={defaultData} sshConnections={mockSshConnections} />
      )

      expect(screen.getByText('lz4')).toBeInTheDocument()
    })

    it('shows custom flags when set', () => {
      const customFlagsData = { ...defaultData, customFlags: '--stats --progress' }

      renderWithProviders(
        <WizardStepReview
          mode="create"
          data={customFlagsData}
          sshConnections={mockSshConnections}
        />
      )

      expect(screen.getByText('--stats --progress')).toBeInTheDocument()
    })
  })

  describe('Command Preview', () => {
    it('shows command preview for full mode', () => {
      renderWithProviders(
        <WizardStepReview mode="create" data={defaultData} sshConnections={mockSshConnections} />
      )

      expect(screen.getByTestId('command-preview')).toBeInTheDocument()
    })

    it('shows create mode in command preview for create mode', () => {
      renderWithProviders(
        <WizardStepReview mode="create" data={defaultData} sshConnections={mockSshConnections} />
      )

      expect(screen.getByText('Command Preview - create')).toBeInTheDocument()
    })

    it('shows import mode in command preview for import mode', () => {
      renderWithProviders(
        <WizardStepReview mode="import" data={defaultData} sshConnections={mockSshConnections} />
      )

      expect(screen.getByText('Command Preview - import')).toBeInTheDocument()
    })
  })

  describe('Backup Flow Preview', () => {
    it('shows backup flow preview for full mode', () => {
      renderWithProviders(
        <WizardStepReview mode="create" data={defaultData} sshConnections={mockSshConnections} />
      )

      expect(screen.getByTestId('backup-flow-preview')).toBeInTheDocument()
    })

    it('hides backup flow preview for observe mode', () => {
      const observeData = { ...defaultData, repositoryMode: 'observe' as const }

      renderWithProviders(
        <WizardStepReview mode="create" data={observeData} sshConnections={mockSshConnections} />
      )

      expect(screen.queryByTestId('backup-flow-preview')).not.toBeInTheDocument()
    })
  })

  describe('Action Alerts', () => {
    it('shows initialization alert for create mode with full repository', () => {
      renderWithProviders(
        <WizardStepReview mode="create" data={defaultData} sshConnections={mockSshConnections} />
      )

      expect(screen.getByText('Repository will be initialized')).toBeInTheDocument()
    })

    it('hides initialization alert for create mode with observe repository', () => {
      const observeData = { ...defaultData, repositoryMode: 'observe' as const }

      renderWithProviders(
        <WizardStepReview mode="create" data={observeData} sshConnections={mockSshConnections} />
      )

      expect(screen.queryByText('Repository will be initialized')).not.toBeInTheDocument()
    })

    it('shows import alert for import mode', () => {
      renderWithProviders(
        <WizardStepReview mode="import" data={defaultData} sshConnections={mockSshConnections} />
      )

      expect(screen.getByText(/Repository will be verified before import/i)).toBeInTheDocument()
    })

    it('shows edit alert for edit mode', () => {
      renderWithProviders(
        <WizardStepReview mode="edit" data={defaultData} sshConnections={mockSshConnections} />
      )

      expect(
        screen.getByText(/Changes will be saved to the repository configuration/i)
      ).toBeInTheDocument()
    })
  })

  describe('Empty Path Handling', () => {
    it('shows (not set) for empty path', () => {
      const emptyPathData = { ...defaultData, path: '' }

      renderWithProviders(
        <WizardStepReview mode="create" data={emptyPathData} sshConnections={mockSshConnections} />
      )

      // Should show "(not set)" twice - once for path and once for passphrase
      const notSetTexts = screen.getAllByText('(not set)')
      expect(notSetTexts.length).toBeGreaterThanOrEqual(1)
    })
  })
})
